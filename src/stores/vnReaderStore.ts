// ============================================================
// vnReaderStore.ts — Visual Novel Reader State Store
// ============================================================
// Replaces VNReader from js/vn-reader.js
// Manages VN story state: current line, typing, auto/skip,
// history, and BGM transitions.
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';
import { useI18nStore } from './i18nStore';

// --- Character map (mirrors legacy CHARACTER_MAP) ---
export interface CharacterInfo {
    avatar: string;
    color: string;
    background: string;
}

const CHARACTER_MAP: Record<string, CharacterInfo> = {
    '林墨白': { avatar: 'assets/avatar/morven_no_bg.png', color: '#7B68EE', background: 'assets/avatar/morven_bg.webp' },
    'Morven':  { avatar: 'assets/avatar/morven_no_bg.png', color: '#7B68EE', background: 'assets/avatar/morven_bg.webp' },
    'Daniel':  { avatar: 'assets/avatar/daniel_no_bg.png', color: '#4169E1', background: 'assets/avatar/daniel_bg.webp' },
    '司徒渊': { avatar: 'assets/avatar/vincent_no_bg.png', color: '#483D8B', background: 'assets/avatar/vincent_bg.webp' },
    'Vincent': { avatar: 'assets/avatar/vincent_no_bg.png', color: '#483D8B', background: 'assets/avatar/vincent_bg.webp' },
    '陆之昂': { avatar: 'assets/avatar/leo_no_bg.png', color: '#FF6347', background: 'assets/avatar/leo_bg.webp' },
    'Leo':     { avatar: 'assets/avatar/leo_no_bg.png', color: '#FF6347', background: 'assets/avatar/leo_bg.webp' },
};

// --- Story data types ---
export interface VNLine {
    speaker: string | null;
    text: string;
    expression?: string;
}

export interface VNStory {
    title: string;
    lines: VNLine[];
    text?: string; // Fallback for stories without lines array
}

export interface VNCGEntry {
    cgId: string;
    title: string;
    maleLead: string;
    stories: VNStory[];
}

export interface VNHistoryEntry {
    speaker: string;
    text: string;
}

export const useVNReaderStore = defineStore('vnReader', () => {
    // --- State ---
    const isOpen = ref(false);
    const ssrId = ref('');
    const storyIndex = ref(0);
    const lines = ref<VNLine[]>([]);
    const currentIndex = ref(0);
    const isTyping = ref(false);
    const autoMode = ref(false);
    const skipMode = ref(false);
    const autoDelay = 3000;
    const skipDelay = 80;
    const typingSpeed = 45;
    const history = ref<VNHistoryEntry[]>([]);
    const showingHistory = ref(false);
    const currentSpeaker = ref<string | null>(null);
    const ended = ref(false);
    const showingTitle = ref(false);

    // --- Computed ---
    const currentLine = computed<VNLine | null>(() => {
        if (currentIndex.value >= lines.value.length) return null;
        return lines.value[currentIndex.value];
    });

    const currentCG = computed<VNCGEntry | null>(() => {
        const configStore = useConfigStore();
        const cg = configStore.cgStories[ssrId.value];
        return cg || null;
    });

    const currentStory = computed<VNStory | null>(() => {
        if (!currentCG.value) return null;
        return currentCG.value.stories[storyIndex.value] || null;
    });

    const currentCharacterInfo = computed<CharacterInfo | null>(() => {
        if (!currentCG.value) return null;
        return CHARACTER_MAP[currentCG.value.maleLead] || null;
    });

    const speakerInfo = computed<{ name: string; color: string; isNarrator: boolean; background: string | null }>(() => {
        const i18nStore = useI18nStore();
        const line = currentLine.value;
        if (!line) {
            return { name: '', color: '#888', isNarrator: false, background: null };
        }
        if (line.speaker) {
            const ci = CHARACTER_MAP[line.speaker];
            return {
                name: line.speaker,
                color: ci?.color || '#888',
                isNarrator: false,
                background: ci?.background || null,
            };
        }
        return {
            name: i18nStore.t('vn_reader.narrator'),
            color: '#888',
            isNarrator: true,
            background: null,
        };
    });

    const backgroundImage = computed<string | null>(() => {
        // If speaker changed and has a background, use it
        if (currentSpeaker.value) {
            const ci = CHARACTER_MAP[currentSpeaker.value];
            if (ci?.background) return ci.background;
        }
        // Fallback to male lead background
        return currentCharacterInfo.value?.background || null;
    });

    // --- Actions ---
    function open(ssrIdParam: string, storyIndexParam: number = 0) {
        const configStore = useConfigStore();
        const cg = configStore.cgStories[ssrIdParam] as VNCGEntry | undefined;
        if (!cg) return;
        const story = cg.stories[storyIndexParam];
        if (!story) return;

        ssrId.value = ssrIdParam;
        storyIndex.value = storyIndexParam;
        lines.value = story.lines && story.lines.length
            ? story.lines
            : (story.text ? [{ speaker: null, text: story.text }] : []);
        currentIndex.value = 0;
        autoMode.value = false;
        skipMode.value = false;
        ended.value = false;
        history.value = [];
        showingHistory.value = false;
        currentSpeaker.value = null;
        isOpen.value = true;
        showingTitle.value = true;

        // Emit event for BGM switching (handled by overlay component)
        globalBus.emit('vn:opened', { ssrId: ssrIdParam, storyIndex: storyIndexParam });
    }

    function close() {
        isOpen.value = false;
        autoMode.value = false;
        skipMode.value = false;
        ended.value = false;
        showingHistory.value = false;
        showingTitle.value = false;
        currentSpeaker.value = null;

        // Emit event for BGM restoration
        globalBus.emit('vn:closed');
    }

    function advance() {
        if (showingHistory.value) return;
        if (isTyping.value) {
            // Signal to skip typing — the component handles this
            isTyping.value = false;
            return;
        }
        currentIndex.value++;
        if (currentIndex.value >= lines.value.length) {
            showEnd();
        }
    }

    function showEnd() {
        const i18nStore = useI18nStore();
        ended.value = true;
        autoMode.value = false;
        skipMode.value = false;
        // Add end entry to history
        history.value.push({
            speaker: i18nStore.t('vn_reader.end'),
            text: i18nStore.t('vn_reader.chapterEnded'),
        });
    }

    function toggleAuto() {
        autoMode.value = !autoMode.value;
        if (autoMode.value) {
            skipMode.value = false;
        }
    }

    function toggleSkip() {
        skipMode.value = !skipMode.value;
        if (skipMode.value) {
            autoMode.value = false;
        }
    }

    function toggleHistory() {
        showingHistory.value = !showingHistory.value;
    }

    function onLineShown(line: VNLine) {
        const i18nStore = useI18nStore();
        // Update current speaker for background tracking
        if (line.speaker && line.speaker !== currentSpeaker.value) {
            currentSpeaker.value = line.speaker;
        }
        // Add to history
        history.value.push({
            speaker: line.speaker || i18nStore.t('vn_reader.narrator'),
            text: line.text,
        });
    }

    function getCharacterColor(speakerName: string): string {
        const ci = CHARACTER_MAP[speakerName];
        return ci?.color || '#888';
    }

    // --- Subscribe to events ---
    // HMR LIMITATION: globalBus.on() listeners registered here will stack on HMR updates.
    // EventBus.on() returns the handler ref (not an unsubscribe fn), so per-listener HMR cleanup
    // would require storing each handler ref and calling globalBus.off() with it on dispose.
    // For now, this is a known dev-only issue — full page reload clears it.
    globalBus.on('cg:readRequested', (data: any) => {
        if (data?.cgId) {
            // Find the ssrId that matches this cgId
            const configStore = useConfigStore();
            const entries = configStore.cgStories;
            for (const [key, value] of Object.entries(entries)) {
                if ((value as any).cgId === data.cgId) {
                    open(key, 0);
                    return;
                }
            }
        }
    });

    // --- Serialization ---
    function serialize() {
        return {
            isOpen: isOpen.value,
            ssrId: ssrId.value,
            storyIndex: storyIndex.value,
            currentIndex: currentIndex.value,
            autoMode: autoMode.value,
            skipMode: skipMode.value,
            ended: ended.value,
            showingHistory: showingHistory.value,
            currentSpeaker: currentSpeaker.value,
            history: [...history.value],
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        // Don't restore isOpen — the overlay should be closed on load
        ssrId.value = data.ssrId || '';
        storyIndex.value = data.storyIndex || 0;
        currentIndex.value = data.currentIndex ?? 0;
        autoMode.value = data.autoMode ?? false;
        skipMode.value = data.skipMode ?? false;
        ended.value = data.ended ?? false;
        showingHistory.value = data.showingHistory ?? false;
        currentSpeaker.value = data.currentSpeaker || null;
        history.value = data.history || [];

        // Reconstruct lines from config data if we have a valid ssrId
        if (data.ssrId && data.isOpen) {
            const configStore = useConfigStore();
            const cg = configStore.cgStories[data.ssrId] as VNCGEntry | undefined;
            if (cg) {
                const story = cg.stories[data.storyIndex || 0];
                if (story) {
                    lines.value = story.lines && story.lines.length
                        ? story.lines
                        : (story.text ? [{ speaker: null, text: story.text }] : []);
                    isOpen.value = true;
                }
            }
        }
    }

    return {
        // State
        isOpen,
        ssrId,
        storyIndex,
        lines,
        currentIndex,
        isTyping,
        autoMode,
        skipMode,
        autoDelay,
        skipDelay,
        typingSpeed,
        history,
        showingHistory,
        currentSpeaker,
        ended,
        showingTitle,

        // Computed
        currentLine,
        currentCG,
        currentStory,
        currentCharacterInfo,
        speakerInfo,
        backgroundImage,

        // Actions
        open,
        close,
        advance,
        showEnd,
        toggleAuto,
        toggleSkip,
        toggleHistory,
        onLineShown,
        getCharacterColor,

        // Serialization
        serialize,
        deserialize,
    };
});

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
import type { VNReaderSerializeData } from '../types/serialize';
import type { VNChoice, VNScene } from '@/types/game';
import { resolveChoiceEffect, resolveEndingCheck } from '../services/NarrativeService';
import * as NarrativeLogic from '../logic/NarrativeLogic';
import { useAffectionStore } from './affectionStore';
import { useLoopStore } from './loopStore';
import type { ResolveResult } from '../services/ServiceResultTypes';

// --- Character info derived from configStore.characterProfiles ---
export interface CharacterInfo {
    avatar: string;
    color: string;
    background: string;
    name: string;
    nameEn: string;
}

// --- Story data types ---
export interface VNLine {
    speakerId: string | null;
    text: string;
    expression?: string;
}

export interface VNStory {
    title: string;
    lines: VNLine[];
    text?: string;
}

export interface VNCGEntry {
    cgId: string;
    title: string;
    maleLeadId: string;
    stories: VNStory[];
}

export interface VNHistoryEntry {
    speaker: string;
    speakerId: string | null;
    text: string;
}

// --- Helper: look up character info from configStore ---
function getCharacterInfo(characterId: string | null): CharacterInfo | null {
    if (!characterId) return null;
    const configStore = useConfigStore();
    const profile = configStore.characterProfiles[characterId];
    if (!profile) return null;
    return {
        avatar: profile.avatar || '',
        color: profile.color || '#888',
        background: profile.background || '',
        name: profile.name || characterId,
        nameEn: profile.nameEn || profile.name || characterId,
    };
}

function getSpeakerDisplayName(speakerId: string | null): string {
    if (!speakerId) return '';
    const configStore = useConfigStore();
    const i18nStore = useI18nStore();
    const profile = configStore.characterProfiles[speakerId];
    if (!profile) return speakerId;
    return i18nStore.locale === 'en' ? (profile.nameEn || profile.name || speakerId) : (profile.name || speakerId);
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

    const mode = ref<'cg' | 'scene'>('cg');
    const currentSceneId = ref<string | null>(null);
    const routeKey = ref<string | null>(null);
    const sceneData = ref<Record<string, VNScene> | null>(null);
    const pendingChoice = ref<VNChoice | null>(null);
    const choiceHistory = ref<Array<{ sceneId: string; optionIndex: number }>>([]);

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
        return getCharacterInfo(currentCG.value.maleLeadId);
    });

    const speakerInfo = computed<{ name: string; color: string; isNarrator: boolean; background: string | null }>(() => {
        const i18nStore = useI18nStore();
        const line = currentLine.value;
        if (!line) {
            return { name: '', color: '#888', isNarrator: false, background: null };
        }
        if (line.speakerId) {
            const ci = getCharacterInfo(line.speakerId);
            return {
                name: getSpeakerDisplayName(line.speakerId),
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
        if (currentSpeaker.value) {
            const ci = getCharacterInfo(currentSpeaker.value);
            if (ci?.background) return ci.background;
        }
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
            : (story.text ? [{ speakerId: null, text: story.text }] : []);
        currentIndex.value = 0;
        autoMode.value = false;
        skipMode.value = false;
        ended.value = false;
        history.value = [];
        showingHistory.value = false;
        currentSpeaker.value = null;
        mode.value = 'cg';
        currentSceneId.value = null;
        routeKey.value = null;
        sceneData.value = null;
        pendingChoice.value = null;
        choiceHistory.value = [];
        isOpen.value = true;
        showingTitle.value = true;

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
        pendingChoice.value = null;

        globalBus.emit('vn:closed');
    }

    function advance() {
        if (showingHistory.value) return;
        if (pendingChoice.value) return;
        if (isTyping.value) {
            isTyping.value = false;
            return;
        }
        const nextIndex = currentIndex.value + 1;
        if (nextIndex >= lines.value.length) {
            if (mode.value === 'scene') {
                onSceneLinesEnd();
            } else {
                currentIndex.value = nextIndex;
                showEnd();
            }
        } else {
            currentIndex.value = nextIndex;
        }
    }

    function onSceneLinesEnd() {
        if (!sceneData.value || !currentSceneId.value) {
            showEnd();
            return;
        }
        const scene = sceneData.value[currentSceneId.value];
        if (!scene) {
            showEnd();
            return;
        }

        if (scene.choice) {
            pendingChoice.value = scene.choice;
            return;
        }

        if (scene.nextScene) {
            const nextScene = sceneData.value[scene.nextScene];
            if (nextScene) {
                const conditionDeps = buildConditionDeps();
                if (nextScene.condition && !NarrativeLogic.checkCondition(nextScene.condition, conditionDeps)) {
                    if (nextScene.fallbackScene && sceneData.value[nextScene.fallbackScene]) {
                        loadScene(nextScene.fallbackScene);
                    } else {
                        triggerEndingCheck();
                    }
                } else {
                    loadScene(scene.nextScene);
                }
            } else {
                triggerEndingCheck();
            }
        } else {
            triggerEndingCheck();
        }
    }

    function buildConditionDeps(): NarrativeLogic.CheckConditionDeps {
        const affectionStore = useAffectionStore();
        const loopStore = useLoopStore();
        return {
            affection: { ...affectionStore.affection },
            darkness: { ...affectionStore.darkness },
            controlLevel: loopStore.controlLevel,
            flags: [...loopStore.unlockedNarrativeFlags],
        };
    }

    function openScene(routeKeyParam: string, startSceneId: string) {
        const configStore = useConfigStore();
        const route = configStore.vnScenes[routeKeyParam];
        if (!route) return;

        mode.value = 'scene';
        routeKey.value = routeKeyParam;
        sceneData.value = route.scenes;
        choiceHistory.value = [];
        pendingChoice.value = null;
        autoMode.value = false;
        skipMode.value = false;
        ended.value = false;
        history.value = [];
        showingHistory.value = false;
        currentSpeaker.value = null;
        isOpen.value = true;
        showingTitle.value = true;

        loadScene(startSceneId);

        globalBus.emit('vn:opened', { ssrId: routeKeyParam, storyIndex: 0 });
    }

    function loadScene(sceneId: string) {
        if (!sceneData.value) return;
        const scene = sceneData.value[sceneId];
        if (!scene) {
            triggerEndingCheck();
            return;
        }

        const conditionDeps = buildConditionDeps();
        if (scene.condition && !NarrativeLogic.checkCondition(scene.condition, conditionDeps)) {
            if (scene.fallbackScene && sceneData.value[scene.fallbackScene]) {
                loadScene(scene.fallbackScene);
            } else {
                triggerEndingCheck();
            }
            return;
        }

        currentSceneId.value = sceneId;
        lines.value = scene.lines || [];
        currentIndex.value = 0;
        pendingChoice.value = null;

        globalBus.emit('narrative:sceneEntered', { routeKey: routeKey.value, sceneId });
    }

    function selectChoice(optionIndex: number) {
        if (!pendingChoice.value) return;
        const option = pendingChoice.value.options[optionIndex];
        if (!option) return;

        const configStore = useConfigStore();
        const affectionStore = useAffectionStore();
        const loopStore = useLoopStore();

        const effectResult = resolveChoiceEffect(option, {
            affection: { ...affectionStore.affection },
            darkness: { ...affectionStore.darkness },
            controlLevel: loopStore.controlLevel,
            narrativeConfig: configStore.narrativeConfig!,
        });

        applyLocalResult(effectResult);

        choiceHistory.value.push({ sceneId: currentSceneId.value!, optionIndex });
        pendingChoice.value = null;

        loadScene(option.nextScene);
    }

    function triggerEndingCheck() {
        if (!routeKey.value) return;
        const configStore = useConfigStore();
        const route = configStore.vnScenes[routeKey.value];
        if (!route || !route.endings) {
            showEnd();
            return;
        }

        const result = resolveEndingCheck(route.endings, buildConditionDeps());
        if (result.ok) {
            applyLocalResult(result.resolveResult);
        }
        showEnd();
    }

    function applyLocalResult(result: ResolveResult) {
        const affectionStore = useAffectionStore();
        const loopStore = useLoopStore();

        if (result.applyTo.affection?.addAffections) {
            for (const aff of result.applyTo.affection.addAffections) {
                affectionStore.addPoints(aff.characterId, aff.amount);
            }
        }
        if (result.applyTo.affection?.addDarkness) {
            for (const d of result.applyTo.affection.addDarkness) {
                affectionStore.addDarkness(d.characterId, d.amount);
            }
        }
        if (result.applyTo.loop?.setControlLevel !== undefined) {
            loopStore.setControlLevel(result.applyTo.loop.setControlLevel);
        }
        if (result.applyTo.loop?.addNarrativeFlags) {
            for (const flag of result.applyTo.loop.addNarrativeFlags) {
                loopStore.addNarrativeFlag(flag);
            }
        }
        if (result.applyTo.narrative?.setCurrentSceneId !== undefined) {
            currentSceneId.value = result.applyTo.narrative.setCurrentSceneId;
        }
        if (result.applyTo.narrative?.setMode !== undefined) {
            mode.value = result.applyTo.narrative.setMode;
        }
        if (result.applyTo.narrative?.setPendingChoice !== undefined) {
            pendingChoice.value = result.applyTo.narrative.setPendingChoice;
        }

        if (result.events) {
            for (const e of result.events) {
                globalBus.emit(e.name, e.data);
            }
        }
    }

    function showEnd() {
        const i18nStore = useI18nStore();
        ended.value = true;
        autoMode.value = false;
        skipMode.value = false;
        history.value.push({
            speaker: i18nStore.t('vn_reader.end'),
            speakerId: null,
            text: i18nStore.t('vn_reader.chapterEnded'),
        });

        const configStore = useConfigStore();
        const cgStories = configStore.cgStories || {};
        const currentEntry = Object.values(cgStories).find(
            (entry): entry is VNCGEntry => (entry as VNCGEntry).cgId === ssrId.value
        );
        if (currentEntry && currentEntry.maleLeadId) {
            globalBus.emit('affection:vnCompleted', {
                cgId: ssrId.value,
                maleLeadId: currentEntry.maleLeadId,
                isSSR: true
            });
        }
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
        if (line.speakerId && line.speakerId !== currentSpeaker.value) {
            currentSpeaker.value = line.speakerId;
        }
        history.value.push({
            speaker: line.speakerId ? getSpeakerDisplayName(line.speakerId) : i18nStore.t('vn_reader.narrator'),
            speakerId: line.speakerId,
            text: line.text,
        });
    }

    function getCharacterColor(speakerId: string): string {
        const ci = getCharacterInfo(speakerId);
        return ci?.color || '#888';
    }

    function setCurrentSceneId(id: string): void {
        currentSceneId.value = id;
    }

    function setMode(m: 'cg' | 'scene'): void {
        mode.value = m;
    }

    function setPendingChoice(c: VNChoice | null): void {
        pendingChoice.value = c;
    }

    // --- Subscribe to events ---
    globalBus.on('cg:readRequested', (data: { cgId: string }) => {
        if (data?.cgId) {
            const configStore = useConfigStore();
            const entries = configStore.cgStories;
            for (const [key, value] of Object.entries(entries)) {
                if ((value as VNCGEntry).cgId === data.cgId) {
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
            mode: mode.value,
            currentSceneId: currentSceneId.value,
            routeKey: routeKey.value,
            pendingChoiceIndex: null,
            choiceHistory: [...choiceHistory.value],
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as VNReaderSerializeData;
        ssrId.value = d.ssrId || '';
        storyIndex.value = d.storyIndex || 0;
        currentIndex.value = d.currentIndex ?? 0;
        autoMode.value = d.autoMode ?? false;
        skipMode.value = d.skipMode ?? false;
        ended.value = d.ended ?? false;
        showingHistory.value = d.showingHistory ?? false;
        currentSpeaker.value = d.currentSpeaker || null;
        history.value = d.history || [];
        mode.value = d.mode || 'cg';
        currentSceneId.value = d.currentSceneId ?? null;
        routeKey.value = d.routeKey ?? null;
        choiceHistory.value = d.choiceHistory || [];

        if (d.mode === 'scene' && d.routeKey && d.currentSceneId) {
            const configStore = useConfigStore();
            const route = configStore.vnScenes[d.routeKey];
            if (route) {
                sceneData.value = route.scenes;
                const scene = route.scenes[d.currentSceneId];
                if (scene && d.isOpen) {
                    lines.value = scene.lines;
                    isOpen.value = true;
                }
            }
        } else if (d.ssrId && d.isOpen) {
            const configStore = useConfigStore();
            const cg = configStore.cgStories[d.ssrId] as VNCGEntry | undefined;
            if (cg) {
                const story = cg.stories[d.storyIndex || 0];
                if (story) {
                    lines.value = story.lines && story.lines.length
                        ? story.lines
                        : (story.text ? [{ speakerId: null, text: story.text }] : []);
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
        mode,
        currentSceneId,
        routeKey,
        sceneData,
        pendingChoice,
        choiceHistory,

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
        openScene,
        loadScene,
        selectChoice,
        triggerEndingCheck,
        toggleAuto,
        toggleSkip,
        toggleHistory,
        onLineShown,
        getCharacterColor,
        setCurrentSceneId,
        setMode,
        setPendingChoice,

        // Serialization
        serialize,
        deserialize,
    };
});

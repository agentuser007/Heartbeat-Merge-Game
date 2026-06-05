// ============================================================
// dialogueStore.ts — Dialogue Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';

export const useDialogueStore = defineStore('dialogue', () => {
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    // --- State ---
    const isOpen = ref(false);
    const npcName = ref('');
    const npcText = ref('');
    const playerText = ref('');
    const portraitUrl = ref('');
    const portraitEmoji = ref('');
    const isTyping = ref(false);
    const dialogueQueue = ref<Array<{
        npcName: string;
        npcText: string;
        playerText: string;
        portraitUrl?: string;
        portraitEmoji?: string;
    }>>([]);

    // --- Subscribe to events ---
    // HMR LIMITATION: globalBus.on() listeners registered here will stack on HMR updates.
    // EventBus.on() returns the handler ref (not an unsubscribe fn), so per-listener HMR cleanup
    // would require storing each handler ref and calling globalBus.off() with it on dispose.
    // For now, this is a known dev-only issue — full page reload clears it.
    // NOTE: 'dialogue:opened' listener removed — show() is called directly, no emitter exists.

    globalBus.on('dialogue:closed', () => {
        isOpen.value = false;
        npcName.value = '';
        npcText.value = '';
        playerText.value = '';
        portraitUrl.value = '';
        portraitEmoji.value = '';
    });

    // --- Computed ---
    const hasPlayerText = computed(() => !!playerText.value);
    const hasPortrait = computed(() => !!portraitUrl.value || !!portraitEmoji.value);

    // --- Actions ---
    function show(
        npcNameParam: string,
        portrait: string, // Can be URL or emoji
        npcTextParam: string,
        playerTextParam: string,
        _options?: { skipBGM?: boolean }
    ) {
        if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }

        isOpen.value = true;
        isTyping.value = true;
        npcName.value = npcNameParam;
        npcText.value = npcTextParam;
        playerText.value = playerTextParam || '';
        
        // Determine if portrait is URL or emoji
        if (portrait && portrait.includes('/')) {
            portraitUrl.value = portrait;
            portraitEmoji.value = '';
        } else {
            portraitEmoji.value = portrait || '';
            portraitUrl.value = '';
        }
    }

    function close() {
        isTyping.value = false;
        isOpen.value = false;
        npcName.value = '';
        npcText.value = '';
        playerText.value = '';
        portraitUrl.value = '';
        portraitEmoji.value = '';
        
        // Emit event for UI components
        globalBus.emit('dialogue:closed');
        
        // Process next dialogue in queue if available
        if (dialogueQueue.value.length > 0) {
            const next = dialogueQueue.value.shift();
            if (next) {
                if (pendingTimer) clearTimeout(pendingTimer);
                pendingTimer = setTimeout(() => {
                    pendingTimer = null;
                    show(
                        next.npcName,
                        next.portraitUrl || next.portraitEmoji || '',
                        next.npcText,
                        next.playerText
                    );
                }, 100);
            }
        }
    }

    function skip() {
        isTyping.value = false;
        // In a real implementation, this would skip the typewriter effect
    }

    function queueDialogue(
        npcNameParam: string,
        portrait: string,
        npcTextParam: string,
        playerTextParam: string
    ) {
        dialogueQueue.value.push({
            npcName: npcNameParam,
            npcText: npcTextParam,
            playerText: playerTextParam,
            portraitUrl: portrait.includes('/') ? portrait : undefined,
            portraitEmoji: !portrait.includes('/') ? portrait : undefined
        });
    }

    // --- Serialization ---
    function serialize() {
        return {
            isOpen: isOpen.value,
            npcName: npcName.value,
            npcText: npcText.value,
            playerText: playerText.value,
            portraitUrl: portraitUrl.value,
            portraitEmoji: portraitEmoji.value,
            dialogueQueue: [...dialogueQueue.value]
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        isOpen.value = data.isOpen ?? false;
        npcName.value = data.npcName || '';
        npcText.value = data.npcText || '';
        playerText.value = data.playerText || '';
        portraitUrl.value = data.portraitUrl || '';
        portraitEmoji.value = data.portraitEmoji || '';
        dialogueQueue.value = data.dialogueQueue || [];
    }

    return {
        // State
        isOpen,
        npcName,
        npcText,
        playerText,
        portraitUrl,
        portraitEmoji,
        isTyping,
        dialogueQueue,
        
        // Computed
        hasPlayerText,
        hasPortrait,
        
        // Actions
        show,
        close,
        skip,
        queueDialogue,
        
        // Serialization
        serialize,
        deserialize
    };
});
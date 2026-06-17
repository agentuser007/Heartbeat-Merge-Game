// ============================================================
// useEffects.ts — Animations & Particles Composable
// ============================================================
// Uses a DOM object pool for particles to avoid GC jitter
// from frequent createElement / remove cycles.
// ============================================================

import { onUnmounted } from 'vue';
import { useAudio } from './useAudio';
import { useConfigStore } from '@/stores/configStore';

const POOL_SIZE = 24;
const particlePool: HTMLDivElement[] = [];
let poolInitialized = false;

function ensurePool(layer: HTMLElement): void {
    if (poolInitialized) return;
    poolInitialized = true;
    for (let i = 0; i < POOL_SIZE; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.display = 'none';
        p.addEventListener('animationend', () => {
            p.style.display = 'none';
            p.textContent = '';
            p.style.left = '';
            p.style.top = '';
            p.style.removeProperty('--dx');
            p.style.removeProperty('--dy');
            particlePool.push(p);
        });
        layer.appendChild(p);
        particlePool.push(p);
    }
}

function acquireParticle(layer: HTMLElement): HTMLDivElement | null {
    ensurePool(layer);
    if (particlePool.length > 0) return particlePool.pop()!;
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.display = 'none';
    p.addEventListener('animationend', () => {
        p.style.display = 'none';
        p.textContent = '';
        p.style.left = '';
        p.style.top = '';
        p.style.removeProperty('--dx');
        p.style.removeProperty('--dy');
        particlePool.push(p);
    });
    layer.appendChild(p);
    return p;
}

export function useEffects() {
    const audio = useAudio();
    const configStore = useConfigStore();
    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    const pendingRAFs = new Set<number>();

    onUnmounted(() => {
        for (const t of pendingTimers) clearTimeout(t);
        pendingTimers.clear();
        for (const r of pendingRAFs) cancelAnimationFrame(r);
        pendingRAFs.clear();
    });

    function getParticleLayer(): HTMLElement {
        let layer = document.getElementById('particle-layer');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'particle-layer';
            document.body.appendChild(layer);
        }
        return layer;
    }

    function showToast(message: string, type: 'info' | 'sr' | 'ssr' | 'error' = 'info'): void {
        let toastRoot = document.getElementById('toast-root');
        if (!toastRoot) {
            toastRoot = document.createElement('div');
            toastRoot.id = 'toast-root';
            document.body.appendChild(toastRoot);
        }

        const toast = document.createElement('div');
        toast.className = 'daily-toast';
        toast.textContent = message;
        
        if (type === 'ssr') {
            toast.style.background = configStore.uiColors.toastSSR;
            audio.playSound('pop');
        } else if (type === 'sr') {
            toast.style.background = configStore.uiColors.toastSR;
            audio.playSound('pop');
        } else if (type === 'error') {
            toast.style.background = 'rgba(211, 47, 47, 0.9)';
        } else {
            toast.style.background = configStore.uiColors.toastDefault;
        }
        
        const activeToasts = toastRoot.querySelectorAll('.daily-toast.show');
        const offset = activeToasts.length * 48;
        
        toast.style.transform = `translateX(-50%) translateY(${offset - 20}px)`;
        toastRoot.appendChild(toast);
        
        const rafId = requestAnimationFrame(() => {
            toast.classList.add('show');
            toast.style.transform = `translateX(-50%) translateY(${offset}px)`;
        });
        pendingRAFs.add(rafId);
        
        const t1 = setTimeout(() => {
            pendingTimers.delete(t1);
            toast.classList.remove('show');
            toast.style.transform = `translateX(-50%) translateY(${offset - 20}px)`;
            const t2 = setTimeout(() => { pendingTimers.delete(t2); toast.remove(); }, configStore.uiTimers.achievementToastFadeOut);
            pendingTimers.add(t2);
        }, configStore.uiTimers.achievementToastDisplay);
        pendingTimers.add(t1);
    }

    function mergePopAt(cellEl: HTMLElement): void {
        if (!cellEl) return;
        
        cellEl.classList.add('merge-pop');
        spawnParticles(cellEl, 8, '✨');
        
        const t3 = setTimeout(() => { pendingTimers.delete(t3); cellEl.classList.remove('merge-pop'); }, configStore.uiAnimation.mergePopDuration);
        pendingTimers.add(t3);
    }

    function spawnParticles(anchorEl: HTMLElement, count: number, emoji: string): void {
        const particleLayer = getParticleLayer();
        const rect = anchorEl.getBoundingClientRect();
        
        for (let i = 0; i < count; i++) {
            const p = acquireParticle(particleLayer);
            if (!p) continue;
            
            const angle = (Math.PI * 2 * i) / count;
            // exempt: pure visual — no game state impact
            const dist = 30 + Math.random() * 30;
            p.textContent = emoji;
            p.style.left = (rect.left + rect.width / 2) + 'px';
            p.style.top = (rect.top + rect.height / 2) + 'px';
            p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            p.style.display = '';
            // Re-trigger CSS animation by removing and re-adding class
            p.classList.remove('particle');
            // Force reflow to restart animation
            void p.offsetWidth;
            p.classList.add('particle');
        }
    }

    function heartFlyTo(sourceEl: HTMLElement): void {
        const particleLayer = getParticleLayer();
        const srcRect = sourceEl.getBoundingClientRect();
        const bossEl = document.getElementById('boss-portrait');
        if (!bossEl) return;
        
        const tgtRect = bossEl.getBoundingClientRect();

        const heart = document.createElement('div');
        heart.className = 'heart-projectile';
        heart.textContent = '❤️';
        const startX = srcRect.left + srcRect.width / 2;
        const startY = srcRect.top;
        heart.style.left = startX + 'px';
        heart.style.top = startY + 'px';
        heart.style.willChange = 'transform';
        
        particleLayer.appendChild(heart);

        const endX = tgtRect.left + tgtRect.width / 2;
        const endY = tgtRect.top + tgtRect.height / 2;
        
        const startTime = Date.now();
        const duration = configStore.uiAnimation.heartFlyDuration;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const dx = (endX - startX) * easeProgress;
            const dy = (endY - startY) * easeProgress;
            
            heart.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${progress * 360}deg)`;
            
            if (progress < 1) {
                const rafId = requestAnimationFrame(animate);
                pendingRAFs.add(rafId);
            } else {
                heart.remove();
                spawnParticles(bossEl, 6, '❤️');
            }
        };
        
        const rafId = requestAnimationFrame(animate);
        pendingRAFs.add(rafId);
    }

    return {
        showToast,
        mergePopAt,
        spawnParticles,
        heartFlyTo
    };
}

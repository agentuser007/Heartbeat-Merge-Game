import { Howl, Howler } from 'howler';
import type { AudioConfig } from '../types/game';
import type { AudioSerializeData } from '../types/serialize';

export class AudioManager {
    private config: AudioConfig | null = null;

    private masterVolume = 1.0;
    private bgmVolume = 0.3;
    private sfxVolume = 0.8;
    private muted = false;

    private sfxHowls: Record<string, Howl> = {};
    private bgmHowls: Record<string, Howl> = {};

    private currentBGMName: string | null = null;
    private currentBGMHowl: Howl | null = null;
    private bgmPaused = false;
    private pendingBGMName: string | null = null;
    private unlocked = false;

    private fadingOutHowls: Array<{ howl: Howl; name: string }> = [];

    constructor() {}

    private getAudioPath(filename: string): string {
        const base = import.meta.env.BASE_URL || '/';
        return `${base}assets/audio/${filename}`;
    }

    public init(config: AudioConfig, globalBus: any): void {
        this.config = config;

        if (config.defaults) {
            this.masterVolume = config.defaults.masterVolume;
            this.bgmVolume = config.defaults.bgmVolume;
            this.sfxVolume = config.defaults.sfxVolume;
        }

        Howler.volume(this.masterVolume);
        Howler.mute(this.muted);

        this.setupUnlock();

        if (globalBus && config.sfxRegistry) {
            for (const [name, entry] of Object.entries(config.sfxRegistry)) {
                if (entry.triggerEvent) {
                    globalBus.on(entry.triggerEvent, () => {
                        this.playSFX(name);
                    });
                }
            }
        }
    }

    private setupUnlock(): void {
        if (this.unlocked) return;

        const unlock = () => {
            const ctx = Howler.ctx;
            if (ctx && ctx.state === 'suspended') {
                ctx.resume()
                    .then(() => {
                        this.unlocked = true;
                        cleanup();
                        if (this.pendingBGMName) {
                            this.playBGM(this.pendingBGMName);
                            this.pendingBGMName = null;
                        }
                    })
                    .catch(err => {
                        console.warn('[AudioManager] Failed to resume AudioContext:', err);
                    });
            } else if (ctx) {
                this.unlocked = true;
                cleanup();
            }
        };

        const cleanup = () => {
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('touchend', unlock);
            document.removeEventListener('click', unlock);
        };

        document.addEventListener('touchstart', unlock);
        document.addEventListener('touchend', unlock);
        document.addEventListener('click', unlock);
    }

    public preloadAll(): Promise<void> {
        if (!this.config) return Promise.resolve();

        const sfxPromises = Object.entries(this.config.sfxRegistry).map(([name, entry]) => {
            if (this.sfxHowls[name]) return Promise.resolve();
            return new Promise<void>((resolve) => {
                const howl = new Howl({
                    src: [this.getAudioPath(entry.file)],
                    volume: entry.volume * this.sfxVolume,
                    preload: true,
                });
                howl.once('load', () => resolve());
                howl.once('loaderror', () => resolve());
                this.sfxHowls[name] = howl;
            });
        });

        return Promise.all(sfxPromises).then(() => {});
    }

    public playSFX(name: string): void {
        if (this.muted || !this.config) return;

        const entry = this.config.sfxRegistry[name];
        if (!entry || entry.enabled === false) return;

        let howl = this.sfxHowls[name];
        if (!howl) {
            howl = new Howl({
                src: [this.getAudioPath(entry.file)],
                volume: entry.volume * this.sfxVolume,
                preload: true,
            });
            howl.once('loaderror', (_id, err) => {
                console.warn(`[AudioManager] SFX load error: ${name}`, err);
            });
            howl.once('playerror', (_id, err) => {
                console.warn(`[AudioManager] SFX play blocked: ${name}`, err);
            });
            this.sfxHowls[name] = howl;
        }

        howl.volume(entry.volume * this.sfxVolume);
        howl.play();
    }

    public playBGM(name: string): void {
        if (!this.config) return;

        const entry = this.config.bgmRegistry[name];
        if (!entry) {
            console.warn(`[AudioManager] Unknown BGM: ${name}`);
            return;
        }

        if (this.currentBGMName === name && this.currentBGMHowl && !this.bgmPaused) {
            return;
        }

        const crossfadeTime = this.config.fade.bgmCrossfade;
        const targetVol = entry.volume * this.bgmVolume;

        this.pendingBGMName = null;

        if (this.currentBGMHowl) {
            const oldHowl = this.currentBGMHowl;
            const oldName = this.currentBGMName!;

            oldHowl.off('fade');

            this.fadingOutHowls.push({ howl: oldHowl, name: oldName });

            const currentVol = oldHowl.volume();
            oldHowl.fade(currentVol, 0, crossfadeTime);
            oldHowl.once('fade', () => {
                oldHowl.stop();
                this.fadingOutHowls = this.fadingOutHowls.filter(item => item.howl !== oldHowl);
            });
        }

        let newHowl = this.bgmHowls[name];
        if (!newHowl) {
            newHowl = new Howl({
                src: [this.getAudioPath(entry.file)],
                loop: true,
                volume: 0,
                preload: true,
            });

            newHowl.on('loaderror', (_id, err) => {
                console.warn(`[AudioManager] BGM load error: ${name}`, err);
                this.pendingBGMName = name;
                this.bgmPaused = true;
            });

            newHowl.on('playerror', (_id, err) => {
                console.warn(`[AudioManager] BGM play blocked: ${name}`, err);
                this.pendingBGMName = name;
                this.bgmPaused = true;
            });

            this.bgmHowls[name] = newHowl;
        }

        newHowl.off('fade');

        this.currentBGMHowl = newHowl;
        this.currentBGMName = name;
        this.bgmPaused = false;

        const playAndFadeIn = () => {
            newHowl.volume(0);
            newHowl.play();
            newHowl.fade(0, targetVol, crossfadeTime);
        };

        if (newHowl.state() === 'loaded') {
            playAndFadeIn();
        } else {
            newHowl.once('load', () => {
                if (this.currentBGMName === name) {
                    playAndFadeIn();
                }
            });
        }
    }

    public pauseBGM(fadeMs?: number): Promise<void> {
        if (!this.currentBGMHowl || this.bgmPaused) return Promise.resolve();

        const duration = fadeMs !== undefined ? fadeMs : (this.config ? this.config.fade.bgmFadeOut : 500);

        this.currentBGMHowl.off('fade');

        return new Promise<void>((resolve) => {
            if (duration > 0) {
                const currentVol = this.currentBGMHowl!.volume();
                this.currentBGMHowl!.fade(currentVol, 0, duration);
                this.currentBGMHowl!.once('fade', () => {
                    if (this.currentBGMHowl && this.bgmPaused) {
                        this.currentBGMHowl.pause();
                    }
                    resolve();
                });
                this.bgmPaused = true;
            } else {
                this.currentBGMHowl!.pause();
                this.bgmPaused = true;
                resolve();
            }
        });
    }

    public resumeBGM(fadeMs?: number): void {
        this.setupUnlock();

        if (this.pendingBGMName) {
            this.playBGM(this.pendingBGMName);
            this.pendingBGMName = null;
            return;
        }

        if (this.currentBGMHowl && this.bgmPaused) {
            const entry = this.config ? this.config.bgmRegistry[this.currentBGMName!] : null;
            const targetVol = entry ? entry.volume * this.bgmVolume : this.bgmVolume;
            const duration = fadeMs !== undefined ? fadeMs : (this.config ? this.config.fade.bgmResumeFade : 500);

            this.currentBGMHowl.off('fade');
            this.currentBGMHowl.volume(0);
            this.currentBGMHowl.play();
            this.currentBGMHowl.fade(0, targetVol, duration);
            this.bgmPaused = false;
        }
    }

    public stopBGM(): void {
        if (this.currentBGMHowl) {
            this.currentBGMHowl.off('fade');
            this.currentBGMHowl.stop();
        }
        this.currentBGMHowl = null;
        this.currentBGMName = null;
        this.bgmPaused = false;
        this.pendingBGMName = null;
    }

    public setMasterVolume(v: number): void {
        this.masterVolume = Math.max(0, Math.min(1, v));
        Howler.volume(this.masterVolume);
    }

    public setBGMVolume(v: number): void {
        this.bgmVolume = Math.max(0, Math.min(1, v));
        if (this.currentBGMHowl && this.currentBGMName && this.config) {
            const entry = this.config.bgmRegistry[this.currentBGMName];
            if (entry) {
                this.currentBGMHowl.volume(entry.volume * this.bgmVolume);
            }
        }
    }

    public setSFXVolume(v: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, v));
    }

    public mute(): void {
        this.muted = true;
        Howler.mute(true);
    }

    public unmute(): void {
        this.muted = false;
        Howler.mute(false);
    }

    public getCurrentBGM(): string | null {
        return this.currentBGMName;
    }

    public isMuted(): boolean {
        return this.muted;
    }

    public isPaused(): boolean {
        return this.bgmPaused;
    }

    public getState(): AudioSerializeData {
        return {
            masterVolume: this.masterVolume,
            bgmVolume: this.bgmVolume,
            sfxVolume: this.sfxVolume,
            muted: this.muted,
        };
    }

    public restoreState(state: AudioSerializeData): void {
        if (!state) return;
        if (state.masterVolume !== undefined) this.setMasterVolume(state.masterVolume);
        if (state.bgmVolume !== undefined) this.setBGMVolume(state.bgmVolume);
        if (state.sfxVolume !== undefined) this.setSFXVolume(state.sfxVolume);
        if (state.muted !== undefined) {
            this.muted = state.muted;
            Howler.mute(this.muted);
        }
    }
}

export const audioManager = new AudioManager();

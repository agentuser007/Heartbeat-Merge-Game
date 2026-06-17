// ============================================================
// uiBridgeHandlers.ts
// Toast, VN closed, Locale changed — UI bridge + noop handlers
// ============================================================

import { registerEventHandler } from '../handlerRegistry';

registerEventHandler<{ message: string; type: 'info' | 'error' | 'sr' | 'ssr' }>(
    'toast-show-bridge',
    (data, ctx) => {
        if (!data || !data.message) return;
        ctx.deps.effects.showToast(data.message, data.type || 'info');
    },
);

registerEventHandler<void>(
    'vn-closed',
    () => {
        // VN affection is handled via 'affection:vnCompleted' event
    },
);

registerEventHandler<{ locale: string }>(
    'locale-changed',
    () => {
        // Handled reactively via i18nStore.t() in templates
    },
);

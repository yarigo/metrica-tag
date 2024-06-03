import { CounterOptions } from 'src/utils/counterOptions';
import { cEvent, hasPageTransitionEvents } from 'src/utils/events';
import { call, memo, pipe, secondArg } from 'src/utils/function';
import { cForEach } from 'src/utils/array';
import { MiddlewareGetter } from '../types';

let frozen = false;
const frozenRequests: (() => void)[] = [];
const subscribeToVisibilityEvents = memo((ctx: Window) => {
    const eventSetter = cEvent(ctx);
    eventSetter.on(
        ctx,
        ['pagehide'],
        (event) => {
            // Page is frozen and possibly will resume after being loaded from bfcache
            if (event.persisted) {
                frozen = true;
            }
        },
        { capture: true },
    );
    // Page is possibly loaded from bfcache and we should unfreeze our requests
    eventSetter.on(ctx, ['pageshow'], () => {
        frozen = false;
        cForEach(call, frozenRequests);
        frozenRequests.splice(0, frozenRequests.length);
    });
});

export const bfCacheFreezeMiddleware: MiddlewareGetter = (
    ctx: Window,
    options: CounterOptions,
) => {
    if (!hasPageTransitionEvents(ctx)) {
        return {
            beforeRequest: pipe(secondArg, call),
        };
    }

    subscribeToVisibilityEvents(ctx);
    return {
        beforeRequest: (senderParams, next) => {
            if (!frozen) {
                next();
            } else {
                frozenRequests.push(next);
            }
        },
    };
};

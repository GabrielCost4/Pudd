import {
  distinctUntilChanged,
  EMPTY,
  fromEvent,
  map,
  merge,
  startWith,
  switchMap,
  throttleTime,
  timer,
} from 'rxjs';

const intervalMs = 60_000;

export function foregroundRefreshes(document: Document, refreshInitially = true) {
  const window = document.defaultView;
  if (!window) return EMPTY;

  return fromEvent(document, 'visibilitychange').pipe(
    startWith(null),
    map(() => document.visibilityState === 'visible'),
    distinctUntilChanged(),
    switchMap((visible, index) => {
      if (!visible) return EMPTY;
      const startDelay = refreshInitially || index > 0 ? 0 : intervalMs;
      return merge(timer(startDelay, intervalMs), fromEvent(window, 'focus'));
    }),
    throttleTime(250),
  );
}

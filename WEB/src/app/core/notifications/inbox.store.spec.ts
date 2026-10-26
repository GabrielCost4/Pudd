import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SessionStore } from '../auth/session.store';
import { InboxRealtime } from './inbox-realtime';
import { InboxStore } from './inbox.store';
import type { InboxNotification } from './inbox-notification';

describe('InboxStore', () => {
  let received: (items: InboxNotification[]) => void;
  const stop = vi.fn();
  const oldItem: InboxNotification = {
    id: 'old',
    actorID: 'actor',
    actorName: 'Ana',
    postID: 'post',
    kind: 'like',
    createdAt: '2026-10-21T10:00:00Z',
  };
  const arrival: InboxNotification = {
    ...oldItem,
    id: 'new',
    kind: 'comment',
    createdAt: '2026-10-21T11:00:00Z',
  };
  beforeEach(() => {
    vi.useFakeTimers();
    stop.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: InboxRealtime,
          useValue: {
            connect: (_token: string, callback: typeof received) => {
              received = callback;
              return stop;
            },
          },
        },
      ],
    });
    TestBed.inject(SessionStore).start(
      'header.' + btoa(JSON.stringify({ sub: 'me', exp: Date.now() / 1000 + 3600 })) + '.signature',
      'User',
    );
  });
  afterEach(() => {
    TestBed.inject(SessionStore).clear();
    TestBed.tick();
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
  });
  function setup() {
    const store = TestBed.inject(InboxStore);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('/api/notifications').flush([oldItem]);
    return store;
  }
  it('shows seen feedback, removes acknowledged IDs and preserves arrivals during the request', () => {
    const store = setup();
    store.markRead();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/notifications/read');
    expect(request.request.body).toEqual({ ids: ['old'] });
    received([arrival]);
    expect(store.items().map((item) => item.id)).toEqual(['new', 'old']);
    request.flush(null);
    expect(store.seen().has('old')).toBe(true);
    expect(store.count()).toBe(1);
    vi.advanceTimersByTime(900);
    expect(store.items()).toEqual([arrival]);
    received([arrival, oldItem]);
    expect(store.items()).toEqual([arrival]);
  });
  it('keeps notifications available when marking as read fails', () => {
    const store = setup();
    store.markRead();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/notifications/read')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(store.items()).toEqual([oldItem]);
    expect(store.seen().size).toBe(0);
    expect(store.busy()).toBe(false);
    expect(store.error()).toContain('Tente novamente');
  });
  it('clears the inbox and disconnects on logout, ignoring callbacks from the previous account', () => {
    const store = setup();
    TestBed.inject(SessionStore).clear();
    TestBed.tick();
    expect(stop).toHaveBeenCalledOnce();
    received([oldItem]);
    expect(store.items()).toEqual([]);
  });
});

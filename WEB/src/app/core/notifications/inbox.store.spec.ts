import { API_BASE_URL } from '../../../environments/environment';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SessionStore } from '../auth/session.store';
import { InboxStore } from './inbox.store';
import type { InboxNotification } from './inbox-notification';

describe('InboxStore', () => {
  let visibility: DocumentVisibilityState;
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
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
    vi.restoreAllMocks();
  });
  function setup() {
    const store = TestBed.inject(InboxStore);
    TestBed.tick();
    vi.advanceTimersByTime(0);
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/notifications')
      .flush([oldItem]);
    return store;
  }
  it('shows seen feedback, removes acknowledged IDs and preserves arrivals during the request', () => {
    const store = setup();
    store.markRead();
    const request = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/notifications/read',
    );
    expect(request.request.body).toEqual({ ids: ['old'] });
    store.refresh();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/notifications')
      .flush([arrival]);
    expect(store.items().map((item) => item.id)).toEqual(['new', 'old']);
    request.flush(null);
    expect(store.seen().has('old')).toBe(true);
    expect(store.count()).toBe(1);
    vi.advanceTimersByTime(900);
    expect(store.items()).toEqual([arrival]);
    store.refresh();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/notifications')
      .flush([arrival, oldItem]);
    expect(store.items()).toEqual([arrival]);
  });
  it('keeps notifications available when marking as read fails', () => {
    const store = setup();
    store.markRead();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/notifications/read')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(store.items()).toEqual([oldItem]);
    expect(store.seen().size).toBe(0);
    expect(store.busy()).toBe(false);
    expect(store.error()).toContain('Tente novamente');
  });
  it('clears the inbox and cancels outstanding and scheduled polls on logout', () => {
    const store = setup();
    const http = TestBed.inject(HttpTestingController);
    vi.advanceTimersByTime(60_000);
    const pending = http.expectOne(API_BASE_URL + '/notifications');
    TestBed.inject(SessionStore).clear();
    TestBed.tick();
    expect(pending.cancelled).toBe(true);
    vi.advanceTimersByTime(60_000);
    http.expectNone(API_BASE_URL + '/notifications');
    expect(store.items()).toEqual([]);
  });
  it('polls on focus and every minute only while visible, without overlapping requests', () => {
    setup();
    const http = TestBed.inject(HttpTestingController);
    const url = API_BASE_URL + '/notifications';
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(120_000);
    http.expectNone(url);

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(0);
    const pending = http.expectOne(url);
    vi.advanceTimersByTime(60_000);
    window.dispatchEvent(new Event('focus'));
    http.expectNone(url);
    pending.flush([]);

    vi.advanceTimersByTime(1_000);
    window.dispatchEvent(new Event('focus'));
    http.expectOne(url).flush([]);
    vi.advanceTimersByTime(59_000);
    http.expectOne(url).flush([]);
  });
});

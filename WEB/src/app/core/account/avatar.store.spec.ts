import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api';
import { AvatarStore } from './avatar.store';

describe('AvatarStore', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
  });

  it('shares signed URLs, renews them and stops renewal after the last consumer leaves', () => {
    vi.useFakeTimers();
    const store = TestBed.inject(AvatarStore);
    TestBed.tick();
    const first = vi.fn(),
      second = vi.fn();
    const a = store.image('member').subscribe(first);
    const b = store.image('member').subscribe(second);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne(API_BASE_URL + '/users/member/avatar')
      .flush({ url: 'first', expiresInSeconds: 20 });
    expect(first).toHaveBeenCalledWith('first');
    expect(second).toHaveBeenCalledWith('first');
    vi.advanceTimersByTime(5000);
    http
      .expectOne(API_BASE_URL + '/users/member/avatar')
      .flush({ url: 'renewed', expiresInSeconds: 20 });
    expect(second).toHaveBeenLastCalledWith('renewed');
    a.unsubscribe();
    b.unsubscribe();
    vi.advanceTimersByTime(5000);
    http.expectNone(API_BASE_URL + '/users/member/avatar');
  });

  it('returns a fallback for missing avatars and fetches again after invalidation', () => {
    const store = TestBed.inject(AvatarStore);
    TestBed.tick();
    const next = vi.fn();
    store.image('member').subscribe(next);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne(API_BASE_URL + '/users/member/avatar')
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(next).toHaveBeenCalledWith('');
    store.invalidate('member');
    const request = store.image('member').subscribe(next);
    http
      .expectOne(API_BASE_URL + '/users/member/avatar')
      .flush({ url: 'new-photo', expiresInSeconds: 3600 });
    expect(next).toHaveBeenLastCalledWith('new-photo');
    request.unsubscribe();
  });

  it('does not request an avatar known to be absent', () => {
    const store = TestBed.inject(AvatarStore);
    TestBed.tick();
    const next = vi.fn();
    store.image('member', false).subscribe(next);
    expect(next).toHaveBeenCalledWith('');
    TestBed.inject(HttpTestingController).expectNone(API_BASE_URL + '/users/member/avatar');
  });

  it('caches missing avatars for 30 seconds and retries after expiration', () => {
    vi.useFakeTimers();
    const store = TestBed.inject(AvatarStore);
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    const next = vi.fn();
    store.image('member').subscribe(next);
    http
      .expectOne(API_BASE_URL + '/users/member/avatar')
      .flush(null, { status: 404, statusText: 'Not Found' });
    store.image('member').subscribe(next);
    expect(next).toHaveBeenLastCalledWith('');
    http.expectNone(API_BASE_URL + '/users/member/avatar');
    vi.advanceTimersByTime(30_000);
    const request = store.image('member').subscribe(next);
    http
      .expectOne(API_BASE_URL + '/users/member/avatar')
      .flush({ url: 'new-photo', expiresInSeconds: 3600 });
    expect(next).toHaveBeenLastCalledWith('new-photo');
    request.unsubscribe();
  });

  it('retries transient failures without caching them as a missing avatar', () => {
    const store = TestBed.inject(AvatarStore);
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    store.image('member').subscribe();
    http
      .expectOne(API_BASE_URL + '/users/member/avatar')
      .flush(null, { status: 503, statusText: 'Unavailable' });
    const request = store.image('member').subscribe();
    http
      .expectOne(API_BASE_URL + '/users/member/avatar')
      .flush({ url: 'recovered', expiresInSeconds: 3600 });
    request.unsubscribe();
  });

  it('uses local upload and removal over stale post metadata', () => {
    const store = TestBed.inject(AvatarStore);
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    store.invalidate('member', true);
    const next = vi.fn();
    const request = store.image('member', false).subscribe(next);
    http
      .expectOne(API_BASE_URL + '/users/member/avatar')
      .flush({ url: 'uploaded-photo', expiresInSeconds: 3600 });
    expect(next).toHaveBeenLastCalledWith('uploaded-photo');
    request.unsubscribe();
    store.invalidate('member', false);
    store.image('member', true).subscribe(next);
    expect(next).toHaveBeenLastCalledWith('');
    http.expectNone(API_BASE_URL + '/users/member/avatar');
  });
});

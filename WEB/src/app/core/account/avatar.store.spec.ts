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
});

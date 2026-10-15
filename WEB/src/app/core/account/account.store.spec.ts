import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionStore } from '../auth/session.store';
import { API_BASE_URL } from '../config/api';
import { AccountStore } from './account.store';

describe('AccountStore', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    TestBed.inject(SessionStore).clear();
    TestBed.tick();
    TestBed.inject(HttpTestingController).verify();
  });
  function start() {
    TestBed.inject(SessionStore).start(
      'header.' +
        btoa(JSON.stringify({ sub: 'member', exp: Date.now() / 1000 + 3600 })) +
        '.signature',
      'User',
    );
    const store = TestBed.inject(AccountStore);
    TestBed.tick();
    return { store, http: TestBed.inject(HttpTestingController) };
  }
  it('loads the account photo, refreshes it and clears it when removed or logged out', () => {
    const { store, http } = start();
    http
      .expectOne(API_BASE_URL + '/users/me')
      .flush({ id: 'member', name: 'Member', hasAvatar: true });
    http
      .expectOne(API_BASE_URL + '/users/member/avatar')
      .flush({ url: 'first', expiresInSeconds: 3600 });
    expect(store.avatarUrl()).toBe('first');
    store.refresh();
    TestBed.tick();
    http
      .expectOne(API_BASE_URL + '/users/me')
      .flush({ id: 'member', name: 'Renamed', hasAvatar: true });
    http
      .expectOne(API_BASE_URL + '/users/member/avatar')
      .flush({ url: 'replacement', expiresInSeconds: 3600 });
    expect(store.avatarUrl()).toBe('replacement');
    store.refresh();
    TestBed.tick();
    http
      .expectOne(API_BASE_URL + '/users/me')
      .flush({ id: 'member', name: 'Renamed', hasAvatar: false });
    expect(store.avatarUrl()).toBe('');
    expect(store.name()).toBe('Renamed');
    TestBed.inject(SessionStore).clear();
    TestBed.tick();
    expect(store.name()).toBe('');
    expect(store.avatarUrl()).toBe('');
  });
  it('cancels an old account response on logout and falls back on server failure', () => {
    const { store, http } = start();
    const request = http.expectOne(API_BASE_URL + '/users/me');
    TestBed.inject(SessionStore).clear();
    TestBed.tick();
    expect(request.cancelled).toBe(true);
    start();
    http
      .expectOne(API_BASE_URL + '/users/me')
      .flush(null, { status: 503, statusText: 'Unavailable' });
    expect(store.avatarUrl()).toBe('');
  });
});

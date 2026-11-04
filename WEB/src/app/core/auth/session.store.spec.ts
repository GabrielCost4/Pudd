import { TestBed } from '@angular/core/testing';
import { SessionStore } from './session.store';

function token(exp: number) {
  return (
    'header.' +
    btoa(
      JSON.stringify({
        sub: 'member-id',
        email: 'dev@example.test',
        permission: ['community.use', 'users.read'],
        exp,
      }),
    ) +
    '.signature'
  );
}
describe('SessionStore', () => {
  beforeEach(() => sessionStorage.clear());
  it('does not grant administration from the role response without a permission claim', () => {
    const session = TestBed.inject(SessionStore);
    const payload = btoa(JSON.stringify({ sub: 'member', exp: Date.now() / 1000 + 3600 }));
    session.start('header.' + payload + '.signature', 'Admin');
    expect(session.isAdmin()).toBe(false);
    expect(session.hasPermission('users.block')).toBe(false);
  });
  afterEach(() => {
    TestBed.inject(SessionStore).clear();
    vi.useRealTimers();
  });
  it('expires the session and its saved token using the JWT exp claim', () => {
    vi.useFakeTimers();
    const session = TestBed.inject(SessionStore);
    expect(session.start(token(Math.floor(Date.now() / 1000) + 2), 'Admin')).toBe(true);
    expect(session.user().id).toBe('member-id');
    expect(session.isAdmin()).toBe(true);
    vi.advanceTimersByTime(2100);
    expect(session.hasValidSession()).toBe(false);
    expect(session.accessToken()).toBeNull();
    expect(sessionStorage.getItem('pudd-session')).toBeNull();
  });
  it('rejects expired and malformed tokens', () => {
    const session = TestBed.inject(SessionStore);
    expect(session.start(token(Math.floor(Date.now() / 1000) - 1), 'User')).toBe(false);
    expect(session.start('invalid', 'Admin')).toBe(false);
    expect(session.isAuthenticated()).toBe(false);
  });
  it('restores a valid session and permissions when the app is recreated', () => {
    const accessToken = token(Math.floor(Date.now() / 1000) + 3600);
    TestBed.inject(SessionStore).start(accessToken, 'Admin');
    TestBed.resetTestingModule();
    const restored = TestBed.inject(SessionStore);
    expect(restored.hasValidSession()).toBe(true);
    expect(restored.accessToken()).toBe(accessToken);
    expect(restored.user()).toEqual({ id: 'member-id', email: 'dev@example.test', role: 'Admin' });
    expect(restored.hasPermission('users.read')).toBe(true);
  });

  it('does not restore a session after logout', () => {
    const session = TestBed.inject(SessionStore);
    session.start(token(Math.floor(Date.now() / 1000) + 3600), 'User');
    session.clear();
    TestBed.resetTestingModule();
    expect(TestBed.inject(SessionStore).hasValidSession()).toBe(false);
  });

  it.each([
    'not-json',
    JSON.stringify({ accessToken: 'invalid', role: 'User' }),
    JSON.stringify({ accessToken: token(Math.floor(Date.now() / 1000) - 1), role: 'User' }),
    JSON.stringify({ accessToken: 123, role: 'Admin' }),
  ])('discards expired or malformed saved sessions: %s', (saved) => {
    sessionStorage.setItem('pudd-session', saved);
    expect(TestBed.inject(SessionStore).hasValidSession()).toBe(false);
    expect(sessionStorage.getItem('pudd-session')).toBeNull();
  });

  it('can log in and log out when storage is unavailable', () => {
    const session = TestBed.inject(SessionStore);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    try {
      expect(session.start(token(Math.floor(Date.now() / 1000) + 3600), 'User')).toBe(true);
      expect(session.hasValidSession()).toBe(true);
      session.clear();
      expect(session.isAuthenticated()).toBe(false);
    } finally {
      write.mockRestore();
    }
  });
});

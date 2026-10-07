import { TestBed } from '@angular/core/testing';
import { SessionStore } from './session.store';

function token(exp: number) {
  return 'header.' + btoa(JSON.stringify({sub:'member-id',email:'dev@example.test',exp})) + '.signature';
}
describe('SessionStore', () => {
  afterEach(() => { TestBed.inject(SessionStore).clear(); vi.useRealTimers(); });
  it('keeps the session only in memory and expires it using the JWT exp claim', () => {
    vi.useFakeTimers();
    const session=TestBed.inject(SessionStore);
    expect(session.start(token(Math.floor(Date.now()/1000)+2),'Admin')).toBe(true);
    expect(session.user().id).toBe('member-id');
    expect(session.isAdmin()).toBe(true);
    vi.advanceTimersByTime(2100);
    expect(session.hasValidSession()).toBe(false);
    expect(session.accessToken()).toBeNull();
  });
  it('rejects expired and malformed tokens', () => {
    const session=TestBed.inject(SessionStore);
    expect(session.start(token(Math.floor(Date.now()/1000)-1),'User')).toBe(false);
    expect(session.start('invalid','Admin')).toBe(false);
    expect(session.isAuthenticated()).toBe(false);
  });
});

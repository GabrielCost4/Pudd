import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionStore } from '../auth/session.store';
import { AppShell } from './app-shell';
import { signal } from '@angular/core';
import { AccountStore } from '../account/account.store';

describe('AppShell', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([]),
        {
          provide: AccountStore,
          useValue: { name: signal('Member'), avatarUrl: signal(''), imageFailed: vi.fn() },
        },
      ],
    }),
  );
  afterEach(() => TestBed.inject(SessionStore).clear());
  function start(role: string) {
    TestBed.inject(SessionStore).start(
      'header.' +
        btoa(
          JSON.stringify({
            sub: 'member',
            email: 'member@example.test',
            exp: Date.now() / 1000 + 3600,
          }),
        ) +
        '.signature',
      role,
    );
  }
  it.each(['User', 'Admin'])('shows administration only to an administrator (%s)', (role) => {
    start(role);
    const f = TestBed.createComponent(AppShell);
    f.detectChanges();
    expect(f.nativeElement.querySelector('a[href="/admin"]') !== null).toBe(role === 'Admin');
  });
  it('logs out through the visible button and clears the session', async () => {
    start('User');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const f = TestBed.createComponent(AppShell);
    f.detectChanges();
    f.nativeElement.querySelector('.logout').click();
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(TestBed.inject(SessionStore).accessToken()).toBeNull();
  });
  it('shows the account photo and falls back to an initial when there is no avatar', () => {
    start('User');
    const account = TestBed.inject(AccountStore);
    (account.avatarUrl as ReturnType<typeof signal<string>>).set('https://example.test/avatar.png');
    const f = TestBed.createComponent(AppShell);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.account img').src).toBe(
      'https://example.test/avatar.png',
    );
    (account.avatarUrl as ReturnType<typeof signal<string>>).set('');
    f.detectChanges();
    expect(f.nativeElement.querySelector('.account img')).toBeNull();
    expect(f.nativeElement.querySelector('.account p-avatar').textContent).toBe('M');
  });
});

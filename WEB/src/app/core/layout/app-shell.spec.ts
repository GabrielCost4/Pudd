import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionStore } from '../auth/session.store';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [AppShell], providers: [provideRouter([])] }),
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
});

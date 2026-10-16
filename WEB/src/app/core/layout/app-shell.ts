import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SessionStore } from '../auth/session.store';
import { AccountStore } from '../account/account.store';
import { ThemeStore } from '../config/theme.store';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { BrandLogo } from '../../shared/components/brand-logo/brand-logo';

@Component({
  selector: 'app-shell',
  imports: [
    AvatarModule,
    ButtonModule,
    SidebarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ThemeToggle,
    BrandLogo,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  protected readonly session = inject(SessionStore);
  protected readonly account = inject(AccountStore);
  protected readonly theme = inject(ThemeStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly mobile = signal(false);
  protected readonly navigationOpen = signal(true);

  constructor() {
    const query = inject(DOCUMENT).defaultView?.matchMedia?.('(max-width: 760px)');
    if (query) {
      const sync = () => {
        this.mobile.set(query.matches);
        this.navigationOpen.set(!query.matches);
      };
      sync();
      query.addEventListener('change', sync);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', sync));
    }
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.mobile()) this.navigationOpen.set(false);
      });
    effect(() => {
      if (!this.session.isAuthenticated() && !this.router.url.startsWith('/login')) {
        void this.router.navigate(['/unauthorized'], { queryParams: { reason: 'session' } });
      }
    });
  }

  protected focusContent(event: Event, content: HTMLElement): void {
    event.preventDefault();
    content.focus();
  }

  protected closeNavigation(): void {
    if (this.mobile()) this.navigationOpen.set(false);
  }

  protected logout(): void {
    void this.router.navigate(['/login']).then(() => this.session.clear());
  }
}

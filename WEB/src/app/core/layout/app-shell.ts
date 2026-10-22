import { UserSearch } from '../search/user-search';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TooltipModule } from 'primeng/tooltip';
import { ScrollTopModule } from 'primeng/scrolltop';
import {
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
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
    UserSearch,
    AvatarModule,
    ButtonModule,
    DrawerModule,
    TooltipModule,
    ScrollTopModule,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ThemeToggle,
    BrandLogo,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  host: {
    '[class.sidebar-collapsed]': 'sidebarCollapsed() && !mobile()',
    '(document:keydown)': 'handleSidebarShortcut($event)',
  },
})
export class AppShell {
  protected readonly session = inject(SessionStore);
  protected readonly account = inject(AccountStore);
  protected readonly theme = inject(ThemeStore);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly searchPage = signal(this.router.url.split('?')[0]);
  protected readonly mobile = signal(false);
  protected readonly navigationOpen = signal(true);
  protected readonly sidebarCollapsed = signal(false);
  private readonly sidebarToggle = viewChild<ElementRef<HTMLButtonElement>>('sidebarToggle');

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
        this.searchPage.set(this.router.url.split('?')[0]);
        if (this.mobile()) this.navigationOpen.set(false);
      });
    effect(() => {
      if (!this.session.isAuthenticated() && !this.router.url.startsWith('/login')) {
        void this.router.navigate(['/unauthorized'], { queryParams: { reason: 'session' } });
      }
    });
  }

  protected selectUser(id: string): void {
    if (this.searchPage() === '/admin') {
      void this.router.navigate(['/admin'], { queryParams: { user: id } });
    } else {
      void this.router.navigate(['/profile', id]);
    }
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
    this.sidebarToggle()?.nativeElement.focus({ preventScroll: true });
  }

  protected get scrollBehavior(): 'auto' | 'smooth' {
    return this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
  }

  protected handleSidebarShortcut(event: KeyboardEvent): void {
    if (
      this.mobile() ||
      event.repeat ||
      !event.ctrlKey ||
      !event.shiftKey ||
      event.altKey ||
      event.metaKey ||
      event.code !== 'KeyS'
    )
      return;
    event.preventDefault();
    this.sidebarToggle()?.nativeElement.click();
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

import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionStore } from '../auth/session.store';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  constructor() {
    effect(() => {
      if (!this.session.isAuthenticated() && !this.router.url.startsWith('/login')) {
        void this.router.navigate(['/unauthorized'], { queryParams: { reason: 'session' } });
      }
    });
  }
  protected logout(): void {
    void this.router.navigate(['/login']).then(() => this.session.clear());
  }
}

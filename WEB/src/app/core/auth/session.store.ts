import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'pudd-session';
  private readonly token = signal<string | null>(null);
  private readonly identity = signal({ id: '', email: '', role: '' });
  private expiresAt = 0;
  private expirationTimer?: ReturnType<typeof setTimeout>;
  readonly accessToken = this.token.asReadonly();
  readonly user = this.identity.asReadonly();
  private readonly permissions = signal<string[]>([]);
  readonly isAdmin = computed(() => this.hasPermission('users.read'));
  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }
  readonly isAuthenticated = computed(() => this.token() !== null);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expirationTimer));
    try {
      const saved = this.document.defaultView?.sessionStorage.getItem(this.storageKey);
      if (!saved) return;
      const session: unknown = JSON.parse(saved);
      if (
        typeof session === 'object' &&
        session !== null &&
        'accessToken' in session &&
        typeof session.accessToken === 'string' &&
        'role' in session &&
        typeof session.role === 'string' &&
        this.start(session.accessToken, session.role)
      )
        return;
      this.clear();
    } catch {
      this.clear();
    }
  }

  start(accessToken: string, role: string): boolean {
    try {
      // Claims servem somente à interface. A API valida assinatura e permissões.
      const encoded = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
      if (typeof claims['sub'] !== 'string' || typeof claims['exp'] !== 'number') return false;
      const expiresAt = claims['exp'] * 1000;
      if (expiresAt <= Date.now()) return false;
      this.clear();
      this.expiresAt = expiresAt;
      this.identity.set({
        id: claims['sub'],
        email: typeof claims['email'] === 'string' ? claims['email'] : '',
        role,
      });
      const permissions = claims['permission'];
      this.permissions.set(
        typeof permissions === 'string'
          ? [permissions]
          : Array.isArray(permissions)
            ? permissions.filter((value): value is string => typeof value === 'string')
            : [],
      );
      this.token.set(accessToken);
      try {
        this.document.defaultView?.sessionStorage.setItem(
          this.storageKey,
          JSON.stringify({ accessToken, role }),
        );
      } catch {
        // Login remains available when browser storage is blocked.
      }
      this.expirationTimer = setTimeout(
        () => this.clear(),
        Math.min(expiresAt - Date.now(), 2147483647),
      );
      return true;
    } catch {
      return false;
    }
  }

  hasValidSession(): boolean {
    if (this.token() && this.expiresAt > Date.now()) return true;
    this.clear();
    return false;
  }

  clear(): void {
    try {
      this.document.defaultView?.sessionStorage.removeItem(this.storageKey);
    } catch {
      // Clear in-memory state even when browser storage is blocked.
    }
    clearTimeout(this.expirationTimer);
    this.token.set(null);
    this.permissions.set([]);
    this.identity.set({ id: '', email: '', role: '' });
    this.expiresAt = 0;
  }
}

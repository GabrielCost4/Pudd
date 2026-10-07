import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly token = signal<string | null>(null);
  private readonly identity = signal({ id: '', email: '', role: '' });
  private expiresAt = 0;
  private expirationTimer?: ReturnType<typeof setTimeout>;
  readonly accessToken = this.token.asReadonly();
  readonly user = this.identity.asReadonly();
  readonly isAdmin = computed(() => this.identity().role === 'Admin');
  readonly isAuthenticated = computed(() => this.token() !== null);

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
      this.token.set(accessToken);
      this.expirationTimer = setTimeout(() => this.clear(), Math.min(expiresAt - Date.now(), 2147483647));
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
    clearTimeout(this.expirationTimer);
    this.token.set(null);
    this.identity.set({ id: '', email: '', role: '' });
    this.expiresAt = 0;
  }
}

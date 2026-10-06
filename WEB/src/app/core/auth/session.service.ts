import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly token = signal<string | null>(null);
  readonly accessToken = this.token.asReadonly();

  start(accessToken: string): void {
    this.token.set(accessToken);
  }

  clear(): void {
    this.token.set(null);
  }
}

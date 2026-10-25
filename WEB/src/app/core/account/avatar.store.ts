import { effect, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, expand, map, type Observable, of, shareReplay, switchMap, timer } from 'rxjs';
import { SessionStore } from '../auth/session.store';
import { AccountService } from './account.service';

@Injectable({ providedIn: 'root' })
export class AvatarStore {
  private readonly api = inject(AccountService);
  private readonly session = inject(SessionStore);
  private readonly images = new Map<string, Observable<string>>();
  private readonly missingUntil = new Map<string, number>();
  private readonly availability = new Map<string, boolean>();
  private readonly version = signal(0);
  readonly revision = this.version.asReadonly();

  constructor() {
    effect(() => {
      this.session.accessToken();
      this.images.clear();
      this.missingUntil.clear();
      this.availability.clear();
    });
  }

  image(id: string, hasAvatar = true): Observable<string> {
    if (!(this.availability.get(id) ?? hasAvatar)) return of('');
    if ((this.missingUntil.get(id) ?? 0) > Date.now()) return of('');
    this.missingUntil.delete(id);
    const cached = this.images.get(id);
    if (cached) return cached;
    const image = this.api.avatar(id).pipe(
      expand((response) =>
        timer(Math.max(1000, (response.expiresInSeconds - 15) * 1000)).pipe(
          switchMap(() => this.api.avatar(id)),
        ),
      ),
      map((response) => response.url),
      catchError((error: unknown) => {
        this.images.delete(id);
        // Um 404 esperado não deve ser repetido a cada troca de tela.
        if (error instanceof HttpErrorResponse && error.status === 404)
          this.missingUntil.set(id, Date.now() + 30_000);
        return of('');
      }),
      // A última saída do feed/sidebar cancela a requisição e a renovação da URL.
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.images.set(id, image);
    return image;
  }

  invalidate(id: string, hasAvatar?: boolean): void {
    this.images.delete(id);
    this.missingUntil.delete(id);
    // Upload/remoção local prevalece sobre DTOs já carregados no feed.
    if (hasAvatar !== undefined) this.availability.set(id, hasAvatar);
    this.version.update((value) => value + 1);
  }
}

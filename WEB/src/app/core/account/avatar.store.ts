import { effect, inject, Injectable, signal } from '@angular/core';
import { catchError, expand, map, type Observable, of, shareReplay, switchMap, timer } from 'rxjs';
import { SessionStore } from '../auth/session.store';
import { AccountService } from './account.service';

@Injectable({ providedIn: 'root' })
export class AvatarStore {
  private readonly api = inject(AccountService);
  private readonly session = inject(SessionStore);
  private readonly images = new Map<string, Observable<string>>();
  private readonly version = signal(0);
  readonly revision = this.version.asReadonly();

  constructor() {
    effect(() => {
      this.session.accessToken();
      this.images.clear();
    });
  }

  image(id: string): Observable<string> {
    const cached = this.images.get(id);
    if (cached) return cached;
    const image = this.api.avatar(id).pipe(
      expand((response) =>
        timer(Math.max(1000, (response.expiresInSeconds - 15) * 1000)).pipe(
          switchMap(() => this.api.avatar(id)),
        ),
      ),
      map((response) => response.url),
      catchError(() => {
        this.images.delete(id);
        return of('');
      }),
      // A última saída do feed/sidebar cancela a requisição e a renovação da URL.
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.images.set(id, image);
    return image;
  }

  invalidate(id: string): void {
    this.images.delete(id);
    this.version.update((value) => value + 1);
  }
}

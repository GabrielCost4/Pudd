import { effect, inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, switchMap, tap } from 'rxjs';
import { SessionStore } from '../auth/session.store';
import { AccountService } from './account.service';
import { AvatarStore } from './avatar.store';

@Injectable({ providedIn: 'root' })
export class AccountStore {
  private readonly api = inject(AccountService);
  private readonly avatars = inject(AvatarStore);
  private readonly session = inject(SessionStore);
  private readonly revision = signal(0);
  private readonly displayName = signal('');
  private readonly imageUrl = signal('');
  readonly name = this.displayName.asReadonly();
  readonly avatarUrl = this.imageUrl.asReadonly();

  constructor() {
    effect((onCleanup) => {
      const token = this.session.accessToken();
      const id = this.session.user().id;
      this.revision();
      this.displayName.set('');
      this.imageUrl.set('');
      if (!token) return;
      const request = this.api
        .me()
        .pipe(
          tap((account) => {
            if (account.id === id) this.displayName.set(account.name);
          }),
          switchMap((account) =>
            account.id === id && account.hasAvatar ? this.avatars.image(id) : EMPTY,
          ),
          catchError(() => {
            this.imageUrl.set('');
            return EMPTY;
          }),
        )
        .subscribe((url) => this.imageUrl.set(url));
      onCleanup(() => request.unsubscribe());
    });
  }

  refresh(): void {
    this.avatars.invalidate(this.session.user().id);
    this.revision.update((value) => value + 1);
  }

  imageFailed(): void {
    this.imageUrl.set('');
  }
}

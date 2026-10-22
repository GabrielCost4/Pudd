import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AvatarModule } from 'primeng/avatar';
import { MessageModule } from 'primeng/message';
import type { Subscription } from 'rxjs';
import { AvatarStore } from '../account/avatar.store';
import { UserSearchService, type UserSuggestion } from './user-search.service';

@Component({
  selector: 'app-user-search',
  imports: [AsyncPipe, ReactiveFormsModule, AutoCompleteModule, AvatarModule, MessageModule],
  templateUrl: './user-search.html',
  styleUrl: './user-search.css',
})
export class UserSearch {
  readonly administrative = input(false);
  readonly selected = output<string>();
  private readonly api = inject(UserSearchService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly avatars = inject(AvatarStore);
  protected readonly control = new FormControl<string | UserSuggestion>('', { nonNullable: true });
  protected readonly suggestions = signal<UserSuggestion[]>([]);
  protected readonly failedImages = signal(new Set<string>());
  protected readonly failed = signal(false);
  private request?: Subscription;

  constructor() {
    // Cancel immediately on input, including during the autocomplete's debounce interval.
    this.control.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.request?.unsubscribe();
      this.suggestions.set([]);
      this.failedImages.set(new Set());
      this.failed.set(false);
    });
    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
  }

  protected search(query: string): void {
    this.request?.unsubscribe();
    const normalized = query.trim().replace(/\s+/g, ' ');
    if (normalized.length < 2) {
      this.suggestions.set([]);
      return;
    }
    this.failed.set(false);
    this.request = this.api.search(normalized, this.administrative()).subscribe({
      next: (results) => this.suggestions.set(results),
      error: () => {
        this.suggestions.set([]);
        this.failed.set(true);
      },
    });
  }

  protected choose(value: UserSuggestion): void {
    this.selected.emit(value.id);
  }

  protected imageFailed(id: string): void {
    this.failedImages.update((ids) => new Set([...ids, id]));
  }
}

import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { InboxStore } from './inbox.store';

@Component({
  selector: 'app-notification-bell',
  imports: [
    ButtonModule,
    DrawerModule,
    MessageModule,
    CheckboxModule,
    FormsModule,
    RouterLink,
    DatePipe,
  ],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell {
  protected readonly inbox = inject(InboxStore);
  protected readonly opened = signal(false);
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly unreadItems = computed(() =>
    this.inbox.items().filter((item) => !this.inbox.seen().has(item.id)),
  );
  protected readonly allSelected = computed(
    () =>
      this.unreadItems().length > 0 &&
      this.unreadItems().every((item) => this.selectedIds().has(item.id)),
  );
  protected readonly someSelected = computed(() =>
    this.unreadItems().some((item) => this.selectedIds().has(item.id)),
  );

  protected open(): void {
    this.opened.set(true);
    this.selectedIds.set(new Set());
    this.inbox.refresh();
  }

  protected markSelectedAsRead(): void {
    const ids = [...this.selectedIds()].filter((id) =>
      this.unreadItems().some((item) => item.id === id),
    );
    if (!ids.length) return;
    this.inbox.markRead(ids);
    this.selectedIds.set(new Set());
  }

  protected toggleAll(checked: boolean): void {
    this.selectedIds.set(checked ? new Set(this.unreadItems().map((item) => item.id)) : new Set());
  }

  protected toggleItem(id: string, checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }
}

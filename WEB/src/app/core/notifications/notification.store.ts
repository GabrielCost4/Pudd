import { Injectable, signal } from '@angular/core';

interface Notification {
  severity: 'error' | 'success';
  summary: string;
  detail: string;
  life: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly current = signal<Notification | null>(null);
  readonly notification = this.current.asReadonly();

  errors(messages: readonly string[]): void {
    if (!messages.length) return;
    this.current.set({
      severity: 'error',
      summary: 'Não foi possível concluir',
      detail: [...new Set(messages)].join('\n'),
      life: 10000,
    });
  }

  success(detail: string): void {
    this.current.set({ severity: 'success', summary: 'Sucesso', detail, life: 5000 });
  }

  clear(): void {
    this.current.set(null);
  }
}

import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);
  readonly mode = signal<ThemeMode>(this.initialMode());

  constructor() {
    effect(() => {
      const mode = this.mode();
      this.document.documentElement.classList.toggle('pudd-dark', mode === 'dark');
      try {
        this.document.defaultView?.localStorage.setItem('pudd-theme', mode);
      } catch {
        // A troca de tema continua funcionando quando o navegador bloqueia o armazenamento.
      }
    });
  }

  toggle(): void {
    this.mode.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }

  private initialMode(): ThemeMode {
    const window = this.document.defaultView;
    try {
      const saved = window?.localStorage.getItem('pudd-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // Sem preferência salva, acompanha o tema do sistema.
    }
    return window?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}

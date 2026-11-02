import { afterNextRender, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
  host: { '[class.ready]': 'ready()' },
})
export class ThemeToggle {
  protected readonly ready = signal(false);
  readonly dark = input.required<boolean>();
  readonly toggled = output<void>();

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }
}

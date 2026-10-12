import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
})
export class ThemeToggle {
  readonly dark = input.required<boolean>();
  readonly toggled = output<void>();
}

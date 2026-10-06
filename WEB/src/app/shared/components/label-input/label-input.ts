import { Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-label-input',
  imports: [ReactiveFormsModule],
  templateUrl: './label-input.html',
  styleUrl: './label-input.css',
})
export class LabelInput {
  readonly control = input.required<FormControl<string>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly autocomplete = input('off');
  readonly required = input(false);
  readonly describedBy = input<string | null>(null);

  protected readonly showPassword = signal(false);
}

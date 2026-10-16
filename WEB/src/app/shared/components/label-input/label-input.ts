import { FloatLabelModule } from 'primeng/floatlabel';
import { InputPasswordModule } from 'primeng/inputpassword';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { NgTemplateOutlet } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-label-input',
  imports: [
    FloatLabelModule,
    InputPasswordModule,
    InputTextModule,
    ButtonModule,
    ReactiveFormsModule,
    IconFieldModule,
    InputIconModule,
    NgTemplateOutlet,
  ],
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
  readonly readOnly = input(false);
  readonly describedBy = input<string | null>(null);
  readonly stacked = input(false);
  readonly icon = input<string | null>(null);
  readonly placeholder = input('');
  readonly error = input<string | null>(null);

  protected readonly showPassword = signal(false);
}

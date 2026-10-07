import { Component, input } from '@angular/core';

@Component({ selector: 'app-feedback', templateUrl: './feedback.html', styleUrl: './feedback.css' })
export class Feedback {
  readonly errors = input<readonly string[]>([]);
  readonly success = input('');
}

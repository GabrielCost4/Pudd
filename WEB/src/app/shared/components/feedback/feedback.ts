import { MessageModule } from 'primeng/message';
import { Component, input } from '@angular/core';

@Component({
  imports: [MessageModule],
  selector: 'app-feedback',
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
})
export class Feedback {
  readonly errors = input<readonly string[]>([]);
  readonly success = input('');
}

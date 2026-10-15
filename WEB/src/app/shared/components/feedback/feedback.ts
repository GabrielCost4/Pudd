import { Component, effect, inject, input } from '@angular/core';
import { NotificationStore } from '../../../core/notifications/notification.store';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
})
export class Feedback {
  readonly errors = input<readonly string[]>([]);
  readonly success = input('');

  constructor() {
    const notifications = inject(NotificationStore);
    let hadMessages = false;
    effect(() => {
      const errors = this.errors();
      const success = this.success();
      if (errors.length) notifications.errors(errors);
      else if (success) notifications.success(success);
      else if (hadMessages) notifications.clear();
      hadMessages = !!errors.length || !!success;
    });
  }
}

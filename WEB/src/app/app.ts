import { ThemeStore } from './core/config/theme.store';
import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { NotificationStore } from './core/notifications/notification.store';
import { SessionStore } from './core/auth/session.store';

@Component({
  imports: [RouterOutlet, ToastModule],
  providers: [MessageService],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  constructor() {
    inject(ThemeStore);
    const notifications = inject(NotificationStore);
    const messages = inject(MessageService);
    const session = inject(SessionStore);
    effect(() => {
      const notification = notifications.notification();
      messages.clear('feedback');
      if (notification) messages.add({ ...notification, key: 'feedback' });
    });
    effect(() => {
      if (!session.isAuthenticated()) notifications.clear();
    });
  }
}

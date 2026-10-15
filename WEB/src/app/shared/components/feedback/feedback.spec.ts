import { TestBed } from '@angular/core/testing';
import { Feedback } from './feedback';
import { NotificationStore } from '../../../core/notifications/notification.store';

describe('Feedback', () => {
  it('prioritizes validation errors and confirms a successful correction through Toast', () => {
    const fixture = TestBed.createComponent(Feedback);
    const notifications = TestBed.inject(NotificationStore);
    fixture.componentRef.setInput('errors', ['Nome inválido.', 'Bio inválida.']);
    fixture.componentRef.setInput('success', 'Perfil atualizado.');
    fixture.detectChanges();
    expect(notifications.notification()).toMatchObject({
      severity: 'error',
      detail: 'Nome inválido.\nBio inválida.',
    });
    expect(fixture.nativeElement.querySelector('p-message')).toBeNull();
    fixture.componentRef.setInput('errors', []);
    fixture.detectChanges();
    expect(notifications.notification()).toMatchObject({
      severity: 'success',
      detail: 'Perfil atualizado.',
    });
    fixture.componentRef.setInput('success', '');
    fixture.detectChanges();
    expect(notifications.notification()).toBeNull();
  });

  it('preserves an operation toast when a new page has no feedback to publish', () => {
    const notifications = TestBed.inject(NotificationStore);
    notifications.success('Publicação criada com sucesso.');
    const fixture = TestBed.createComponent(Feedback);
    fixture.detectChanges();
    expect(notifications.notification()?.detail).toBe('Publicação criada com sucesso.');
  });
});

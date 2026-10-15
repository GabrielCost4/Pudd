import { NotificationStore } from '../../../../core/notifications/notification.store';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api';
import { ProfilePage } from './profile';
import { AccountStore } from '../../../../core/account/account.store';
import { SessionStore } from '../../../../core/auth/session.store';
describe('ProfilePage', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    TestBed.inject(SessionStore).clear();
    TestBed.inject(HttpTestingController).verify();
  });
  it('shows a request failure to the user and leaves loading state', () => {
    const f = TestBed.createComponent(ProfilePage);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/users/me')
      .flush({ title: 'Request failed' }, { status: 503, statusText: 'Unavailable' });
    f.detectChanges();
    expect(TestBed.inject(NotificationStore).notification()?.detail).toContain('Request failed');
  });
  it('renders a successful response without an error alert', () => {
    const f = TestBed.createComponent(ProfilePage);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/users/me')
      .flush({ id: 'member', name: 'Member', bio: 'Developer', hasAvatar: false });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
  it('shows backend validation, preserves the form and confirms a successful retry', () => {
    const refresh = vi.fn();
    TestBed.overrideProvider(AccountStore, { useValue: { refresh } });
    TestBed.inject(SessionStore).start(
      'header.' +
        btoa(JSON.stringify({ sub: 'member', exp: Date.now() / 1000 + 3600 })) +
        '.signature',
      'User',
    );
    const f = TestBed.createComponent(ProfilePage);
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne(API_BASE_URL + '/users/me')
      .flush({ id: 'member', name: 'Member', bio: '', hasAvatar: false });
    f.detectChanges();
    const edit = Array.from(
      f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Editar perfil'))!;
    edit.click();
    f.detectChanges();
    const name = f.nativeElement.querySelector('#profile-name') as HTMLInputElement;
    name.value = 'Name rejected by the server';
    name.dispatchEvent(new Event('input'));
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    http.expectOne(API_BASE_URL + '/users/me').flush(
      {
        errors: {
          Name: ['Nome deve ter até 50 caracteres.'],
          Bio: ['A bio deve ter até 500 caracteres.'],
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    f.detectChanges();
    expect(TestBed.inject(NotificationStore).notification()?.detail).toContain(
      'Nome deve ter até 50 caracteres.',
    );
    expect(TestBed.inject(NotificationStore).notification()?.detail).toContain(
      'A bio deve ter até 500 caracteres.',
    );
    expect(name.value).toBe('Name rejected by the server');
    expect(f.nativeElement.querySelector('[role="status"]')).toBeNull();
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    http
      .expectOne(API_BASE_URL + '/users/me')
      .flush({ id: 'member', name: name.value, bio: '', hasAvatar: false });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(TestBed.inject(NotificationStore).notification()?.detail).toContain(
      'Seu perfil foi atualizado.',
    );
    expect(refresh).toHaveBeenCalledOnce();
  });
});

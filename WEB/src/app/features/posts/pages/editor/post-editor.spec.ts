import { NotificationStore } from '../../../../core/notifications/notification.store';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api';
import { PostEditor } from './post-editor';
import { SessionStore } from '../../../../core/auth/session.store';
import { AccountStore } from '../../../../core/account/account.store';
import { signal } from '@angular/core';
describe('PostEditor', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [PostEditor],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AccountStore,
          useValue: { name: signal('Member'), avatarUrl: signal(''), imageFailed: vi.fn() },
        },
      ],
    }),
  );
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.inject(SessionStore).clear();
  });
  it('posts form content and navigates to the created post', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const f = TestBed.createComponent(PostEditor);
    f.detectChanges();
    const input = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    input.value = 'New post';
    input.dispatchEvent(new Event('input'));
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    const request = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/posts');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.get('Content')).toBe('New post');
    request.flush({ id: 'created' });
    expect(navigate).toHaveBeenCalledWith(['/posts', 'created']);
  });
  it('saves an edit in the modal without navigating away', () => {
    const session = TestBed.inject(SessionStore);
    const token =
      'header.' +
      btoa(JSON.stringify({ sub: 'owner', exp: Date.now() / 1000 + 3600 })) +
      '.signature';
    session.start(token, 'User');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PostEditor);
    fixture.componentRef.setInput('postId', 'existing');
    fixture.componentRef.setInput('embedded', true);
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne(API_BASE_URL + '/posts/existing')
      .flush({ id: 'existing', userID: 'owner', content: 'Original', hasImage: false });
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    input.value = 'Updated';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    const request = http.expectOne(API_BASE_URL + '/posts/existing');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.get('Content')).toBe('Updated');
    expect(request.request.body.get('RemoveImage')).toBe('false');
    request.flush({ id: 'existing', content: 'Updated' });
    expect(saved).toHaveBeenCalledWith({ id: 'existing', content: 'Updated' });
    expect(navigate).not.toHaveBeenCalled();
  });
  it('shows missing content through Message without sending an empty post', () => {
    const f = TestBed.createComponent(PostEditor);
    f.detectChanges();
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    f.detectChanges();
    expect(TestBed.inject(NotificationStore).notification()?.detail).toContain(
      'Escreva o conteúdo',
    );
    TestBed.inject(HttpTestingController).expectNone(API_BASE_URL + '/posts');
  });
  it('shows backend field validation and preserves the draft for correction', () => {
    const f = TestBed.createComponent(PostEditor);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    f.detectChanges();
    const input = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    input.value = 'Draft rejected by the server';
    input.dispatchEvent(new Event('input'));
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/posts')
      .flush(
        {
          title: 'Verifique os dados informados.',
          errors: { Content: ['Conteúdo deve ter até 5.000 caracteres.'] },
        },
        { status: 400, statusText: 'Bad Request' },
      );
    f.detectChanges();
    expect(TestBed.inject(NotificationStore).notification()?.detail).toContain(
      'Conteúdo deve ter até 5.000 caracteres.',
    );
    expect(input.value).toBe('Draft rejected by the server');
    expect(input.disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    'blocks content over 5000 characters and allows correction (editing: %s)',
    (editing) => {
      const fixture = TestBed.createComponent(PostEditor);
      const http = TestBed.inject(HttpTestingController);
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      if (editing) {
        TestBed.inject(SessionStore).start(
          'header.' +
            btoa(JSON.stringify({ sub: 'owner', exp: Date.now() / 1000 + 3600 })) +
            '.signature',
          'User',
        );
        fixture.componentRef.setInput('postId', 'existing');
        fixture.componentRef.setInput('embedded', true);
      }
      fixture.detectChanges();
      if (editing) {
        http.expectOne(API_BASE_URL + '/posts/existing').flush({
          id: 'existing',
          userID: 'owner',
          content: 'Original',
          hasImage: false,
        });
        fixture.detectChanges();
      }
      const input = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
      const submit = fixture.nativeElement.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      const counter = fixture.nativeElement.querySelector('#post-character-count') as HTMLElement;
      input.value = 'a'.repeat(5001);
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(counter.textContent).toContain('5001 / 5000');
      expect(submit.disabled).toBe(true);
      fixture.nativeElement
        .querySelector('form')
        .dispatchEvent(new Event('submit', { cancelable: true }));
      http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
      input.value = 'a'.repeat(5000);
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(counter.textContent).toContain('5000 / 5000');
      expect(submit.disabled).toBe(false);
      fixture.nativeElement
        .querySelector('form')
        .dispatchEvent(new Event('submit', { cancelable: true }));
      const request = http.expectOne(API_BASE_URL + (editing ? '/posts/existing' : '/posts'));
      expect(request.request.body.get('Content')).toHaveLength(5000);
      request.flush({ id: 'existing', content: input.value });
    },
  );
});

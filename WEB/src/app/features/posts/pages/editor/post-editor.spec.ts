import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api';
import { PostEditor } from './post-editor';
import { SessionStore } from '../../../../core/auth/session.store';
describe('PostEditor', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [PostEditor],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api';
import { PostCard } from './post-card';
describe('PostCard', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [PostCard],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function setup(hasImage = false, content = 'Hello', authorHasAvatar = false) {
    const f = TestBed.createComponent(PostCard);
    f.componentRef.setInput('post', {
      id: 'post',
      userID: 'member',
      authorName: 'Member',
      authorHasAvatar,
      content,
      hasImage,
      createdAt: '2026-10-11T00:00:00Z',
      updatedAt: null,
    });
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(API_BASE_URL + '/posts/post/like').flush({ liked: false, count: 0 });
    if (authorHasAvatar)
      http
        .expectOne(API_BASE_URL + '/users/member/avatar')
        .flush({ url: 'https://example.test/avatar.png', expiresInSeconds: 3600 });
    else http.expectNone(API_BASE_URL + '/users/member/avatar');
    f.detectChanges();
    return { f, http };
  }
  it('shows the initial without requesting an avatar when the author has no photo', () => {
    const { f } = setup();
    expect(f.nativeElement.querySelector('.author p-avatar').textContent).toContain('M');
    f.destroy();
  });
  it('loads the avatar when the author has a photo', () => {
    const { f } = setup(false, 'Hello', true);
    expect(f.nativeElement.querySelector('.author img').src).toBe(
      'https://example.test/avatar.png',
    );
    f.destroy();
  });
  it('expands and collapses a long post without losing its content', () => {
    const content = 'Um projeto com aprendizados. '.repeat(25) + 'Final da publicação.';
    const { f } = setup(false, content);
    const text = f.nativeElement.querySelector('.content-text') as HTMLElement;
    const button = f.nativeElement.querySelector('.read-more') as HTMLButtonElement;
    expect(text.textContent).not.toContain('Final da publicação.');
    expect(button.textContent).toContain('Ler mais');
    button.click();
    f.detectChanges();
    expect(text.textContent).toBe(content);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.textContent).toContain('Ler menos');
    button.click();
    f.detectChanges();
    expect(text.textContent).not.toContain('Final da publicação.');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
  it('keeps short posts fully visible without a read more button', () => {
    const { f } = setup();
    expect(f.nativeElement.querySelector('.read-more')).toBeNull();
    expect(f.nativeElement.querySelector('.content-text').textContent).toBe('Hello');
  });
  it('likes and unlikes through the visible button', () => {
    const { f, http } = setup();
    const button = f.nativeElement.querySelector('.like-button') as HTMLButtonElement;
    button.click();
    f.detectChanges();
    expect(button.disabled).toBe(true);
    const like = http.expectOne(API_BASE_URL + '/posts/post/like');
    expect(like.request.method).toBe('PUT');
    like.flush({ liked: true, count: 1 });
    f.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click();
    const unlike = http.expectOne(API_BASE_URL + '/posts/post/like');
    expect(unlike.request.method).toBe('DELETE');
    unlike.flush({ liked: false, count: 0 });
    f.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });
  it('displays image failure and retries when requested', () => {
    const { f, http } = setup(true);
    http
      .expectOne(API_BASE_URL + '/posts/post/image')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('.image-fallback')).not.toBeNull();
    f.nativeElement.querySelector('.image-fallback button').click();
    f.detectChanges();
    http
      .expectOne(API_BASE_URL + '/posts/post/image')
      .flush({ url: 'https://example.test/photo.png', expiresInSeconds: 300 });
    f.detectChanges();
    expect(f.nativeElement.querySelector('img').src).toBe('https://example.test/photo.png');
    f.destroy();
  });
});

import { NotificationStore } from '../../../../../core/notifications/notification.store';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../../../../core/config/api';
import { Comments } from './comments';
import type { PostComment } from '../../models/comment';
describe('Comments', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Comments],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function setup(items: PostComment[] = []) {
    const f = TestBed.createComponent(Comments);
    f.componentRef.setInput('postId', 'post');
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne(API_BASE_URL + '/posts/post/comments?page=1&pageSize=10')
      .flush({ items, page: 1, hasNextPage: false });
    f.detectChanges();
    return { f, http };
  }
  it('does not submit an empty comment', () => {
    const { f } = setup();
    expect(f.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });
  it('requests photos only for comment authors with an avatar', () => {
    const comment = {
      id: 'comment',
      postID: 'post',
      userID: 'without-photo',
      authorName: 'Sem Foto',
      authorHasAvatar: false,
      content: 'Comentário',
      createdAt: '2026-10-25T12:00:00Z',
    };
    const { f, http } = setup([
      comment,
      { ...comment, id: 'with-photo', userID: 'with-photo', authorHasAvatar: true },
    ]);
    http.expectNone(API_BASE_URL + '/users/without-photo/avatar');
    http
      .expectOne(API_BASE_URL + '/users/with-photo/avatar')
      .flush({ url: 'https://example.test/avatar.png', expiresInSeconds: 3600 });
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.avatar img')).toHaveLength(1);
    expect(f.nativeElement.querySelector('.comment p-avatar').textContent).toContain('S');
    f.destroy();
  });
  it('counts characters and prevents submission above 350 characters', () => {
    const { f, http } = setup();
    const input = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    const counter = f.nativeElement.querySelector('#comment-character-count');
    const submit = f.nativeElement.querySelector('button[type="submit"]');
    expect(counter.textContent).toContain('0 / 350');
    expect(input.maxLength).toBe(350);
    input.value = 'a'.repeat(350);
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(counter.textContent).toContain('350 / 350');
    expect(submit.disabled).toBe(false);
    input.value += 'a';
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(submit.disabled).toBe(true);
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    http.expectNone(API_BASE_URL + '/posts/post/comments');
  });
  it('submits the entered comment, prevents duplicate requests and reloads the list', () => {
    const { f, http } = setup();
    const input = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    input.value = 'Hello';
    input.dispatchEvent(new Event('input'));
    f.detectChanges();
    const form = f.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    f.detectChanges();
    expect(f.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    const request = http.expectOne(API_BASE_URL + '/posts/post/comments');
    expect(request.request.body).toEqual({ content: 'Hello' });
    request.flush({});
    http
      .expectOne(API_BASE_URL + '/posts/post/comments?page=1&pageSize=10')
      .flush({ items: [], hasNextPage: false });
    f.detectChanges();
    expect(input.value).toBe('');
  });
  it('shows errors returned when posting', () => {
    const { f, http } = setup();
    const input = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    input.value = 'Hello';
    input.dispatchEvent(new Event('input'));
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    http
      .expectOne(API_BASE_URL + '/posts/post/comments')
      .flush({ title: 'Comment rejected' }, { status: 400, statusText: 'Bad Request' });
    f.detectChanges();
    expect(TestBed.inject(NotificationStore).notification()?.detail).toContain('Comment rejected');
  });
});

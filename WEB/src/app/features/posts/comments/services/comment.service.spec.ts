import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../../core/config/api';
import { CommentService } from './comment.service';

describe('CommentService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('list: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(CommentService);
    const next = vi.fn();
    s.list('post', 2).subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/posts/post/comments?page=2&pageSize=10',
    );
    expect(req.request.method).toBe('GET');

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('create: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(CommentService);
    const next = vi.fn();
    s.create('post', 'Hello').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/posts/post/comments',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ content: 'Hello' });

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('delete: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(CommentService);
    const next = vi.fn();
    s.delete('comment').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/comments/comment');
    expect(req.request.method).toBe('DELETE');

    const response = null;
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('moderate: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(CommentService);
    const next = vi.fn();
    s.moderate('comment').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/admin/comments/comment',
    );
    expect(req.request.method).toBe('DELETE');

    const response = null;
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('forwards HTTP errors to the caller', () => {
    const s = TestBed.inject(CommentService);
    const error = vi.fn();
    s.list('post', 2).subscribe({ error });
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/posts/post/comments?page=2&pageSize=10')
      .flush({ title: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0].status).toBe(503);
  });
});

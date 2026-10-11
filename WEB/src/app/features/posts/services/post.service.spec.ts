import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api';
import { PostService } from './post.service';

describe('PostService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  const form = new FormData();
  form.append('Content', 'Hello');
  form.append('RemoveImage', 'true');
  form.append('Image', new File(['image'], 'post.png', { type: 'image/png' }));
  it('list: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(PostService);
    const next = vi.fn();
    s.list(2, 'author').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/posts?page=2&pageSize=6&authorId=author',
    );
    expect(req.request.method).toBe('GET');

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('get: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(PostService);
    const next = vi.fn();
    s.get('post').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/posts/post');
    expect(req.request.method).toBe('GET');

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('create: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(PostService);
    const next = vi.fn();
    s.create(form).subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/posts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(form);
    expect(req.request.body).toBe(form);
    expect(req.request.headers.has('Content-Type')).toBe(false);
    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('update: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(PostService);
    const next = vi.fn();
    s.update('post', form).subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/posts/post');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(form);
    expect(req.request.body).toBe(form);
    expect(req.request.headers.has('Content-Type')).toBe(false);
    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('delete: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(PostService);
    const next = vi.fn();
    s.delete('post').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/posts/post');
    expect(req.request.method).toBe('DELETE');

    const response = null;
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('moderate: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(PostService);
    const next = vi.fn();
    s.moderate('post').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/admin/posts/post');
    expect(req.request.method).toBe('DELETE');

    const response = null;
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('image: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(PostService);
    const next = vi.fn();
    s.image('post').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/posts/post/image');
    expect(req.request.method).toBe('GET');

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('forwards HTTP errors to the caller', () => {
    const s = TestBed.inject(PostService);
    const error = vi.fn();
    s.list(2, 'author').subscribe({ error });
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/posts?page=2&pageSize=6&authorId=author')
      .flush({ title: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0].status).toBe(503);
  });
});

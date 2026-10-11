import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../../core/config/api';
import { LikeService } from './like.service';

describe('LikeService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('get: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(LikeService);
    const next = vi.fn();
    s.get('post').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/posts/post/like');
    expect(req.request.method).toBe('GET');

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('like: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(LikeService);
    const next = vi.fn();
    s.like('post').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/posts/post/like');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('unlike: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(LikeService);
    const next = vi.fn();
    s.unlike('post').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/posts/post/like');
    expect(req.request.method).toBe('DELETE');

    const response = null;
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('forwards HTTP errors to the caller', () => {
    const s = TestBed.inject(LikeService);
    const error = vi.fn();
    s.get('post').subscribe({ error });
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/posts/post/like')
      .flush({ title: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0].status).toBe(503);
  });
});

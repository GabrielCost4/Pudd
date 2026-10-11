import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  const profile = { name: 'Member', bio: 'Developer' };
  const avatar = new FormData();
  avatar.append('Image', new File(['image'], 'avatar.png', { type: 'image/png' }));
  it('me: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(ProfileService);
    const next = vi.fn();
    s.me().subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/users/me');
    expect(req.request.method).toBe('GET');

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('get: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(ProfileService);
    const next = vi.fn();
    s.get('member').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/users/member');
    expect(req.request.method).toBe('GET');

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('update: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(ProfileService);
    const next = vi.fn();
    s.update(profile).subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/users/me');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(profile);

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('avatar: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(ProfileService);
    const next = vi.fn();
    s.avatar('member').subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/users/member/avatar',
    );
    expect(req.request.method).toBe('GET');

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('uploadAvatar: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(ProfileService);
    const next = vi.fn();
    s.uploadAvatar(avatar).subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/users/me/avatar');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(avatar);
    expect(req.request.body).toBe(avatar);
    expect(req.request.headers.has('Content-Type')).toBe(false);
    const response = null;
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('removeAvatar: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(ProfileService);
    const next = vi.fn();
    s.removeAvatar().subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/users/me/avatar');
    expect(req.request.method).toBe('DELETE');

    const response = null;
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('forwards HTTP errors to the caller', () => {
    const s = TestBed.inject(ProfileService);
    const error = vi.fn();
    s.me().subscribe({ error });
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/users/me')
      .flush({ title: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0].status).toBe(503);
  });
});

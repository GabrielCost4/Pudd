import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('loads the selected member through the protected endpoint', () => {
    TestBed.inject(AdminService).user('member/id').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/admin/users/member%2Fid',
    );
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('users: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(AdminService);
    const next = vi.fn();
    s.users(2).subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/admin/users?page=2&pageSize=15',
    );
    expect(req.request.method).toBe('GET');

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('block: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(AdminService);
    const next = vi.fn();
    s.setBlocked('member', true).subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/admin/users/member/blocked',
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ isBlocked: true });

    const response = null;
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('unblock: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(AdminService);
    const next = vi.fn();
    s.setBlocked('member', false).subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/admin/users/member/blocked',
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ isBlocked: false });

    const response = null;
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('forwards HTTP errors to the caller', () => {
    const s = TestBed.inject(AdminService);
    const error = vi.fn();
    s.users(2).subscribe({ error });
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/admin/users?page=2&pageSize=15')
      .flush({ title: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0].status).toBe(503);
  });
});

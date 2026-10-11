import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  const login = { email: 'member@example.test', senha: 'example-password' };
  const register = { nome: 'Member', ...login };
  it('login: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(AuthService);
    const next = vi.fn();
    s.login(login).subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/Auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(login);

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('register: sends the expected request and forwards the response', () => {
    const s = TestBed.inject(AuthService);
    const next = vi.fn();
    s.register(register).subscribe(next);
    const req = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/Auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(register);

    const response = {};
    req.flush(response);
    expect(next).toHaveBeenCalledExactlyOnceWith(response);
  });
  it('forwards HTTP errors to the caller', () => {
    const s = TestBed.inject(AuthService);
    const error = vi.fn();
    s.login(login).subscribe({ error });
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/Auth/login')
      .flush({ title: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0].status).toBe(503);
  });
});

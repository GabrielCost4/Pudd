import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api';
import { SessionStore } from '../../../../core/auth/session.store';
import { Login } from './login';

describe('Login and registration', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.inject(SessionStore).clear();
    vi.unstubAllGlobals();
  });
  function submit(register = false) {
    if (register) TestBed.inject(ActivatedRoute).snapshot.data = { register: true };
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    for (const [id, value] of [
      ['nome', 'Dev'],
      ['email', 'dev@example.test'],
      ['senha', 'test-password'],
    ]) {
      const input = page.querySelector<HTMLInputElement>('#' + id);
      if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input'));
      }
    }
    page
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    return { fixture, page, http: TestBed.inject(HttpTestingController) };
  }
  it('sends only email and senha to login and navigates to the feed after success', () => {
    const { fixture, page, http } = submit();
    const request = http.expectOne(API_BASE_URL + '/Auth/login');
    expect(request.request.body).toEqual({ email: 'dev@example.test', senha: 'test-password' });
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    const jwt =
      'header.' +
      btoa(JSON.stringify({ sub: 'dev', exp: Date.now() / 1000 + 3600 })) +
      '.signature';
    request.flush({ accessToken: jwt, role: 'User', expiresIn: 60 });
    fixture.detectChanges();
    expect(TestBed.inject(SessionStore).accessToken()).toBe(jwt);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/feed');
    expect(page.querySelector<HTMLInputElement>('#senha')!.value).toBe('');
  });
  it('sends nome to register and displays field validation returned by the API', () => {
    const { fixture, page, http } = submit(true);
    const request = http.expectOne(API_BASE_URL + '/Auth/register');
    expect(request.request.body).toEqual({
      nome: 'Dev',
      email: 'dev@example.test',
      senha: 'test-password',
    });
    request.flush(
      { errors: { Senha: ['Senha não atende aos requisitos.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    expect(page.querySelector('[role="alert"]')!.textContent).toContain(
      'Senha não atende aos requisitos.',
    );
  });
  it('allows another attempt after invalid credentials', () => {
    const { fixture, page, http } = submit();
    http
      .expectOne(API_BASE_URL + '/Auth/login')
      .flush({ title: 'E-mail ou senha inválidos.' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(page.querySelector('[role="alert"]')!.textContent).toContain(
      'E-mail ou senha inválidos.',
    );
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
    expect(TestBed.inject(SessionStore).accessToken()).toBeNull();
  });
});

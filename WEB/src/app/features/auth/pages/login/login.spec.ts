import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '../../../../core/auth/session.service';
import { Login } from './login';

describe('Login', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function submitLogin() {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    for (const [id, value] of [['email', 'pessoa@example.test'], ['senha', 'senha-de-teste']]) {
      const input = page.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    page.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    return { fixture, page, http: TestBed.inject(HttpTestingController) };
  }

  it('sends the API contract and stores the returned token only after success', () => {
    const { fixture, page, http } = submitLogin();
    const request = http.expectOne('/api/Auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'pessoa@example.test', senha: 'senha-de-teste' });
    expect(TestBed.inject(SessionService).accessToken()).toBeNull();
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);

    request.flush({ accessToken: 'token-ficticio', role: 'User', expiresIn: 3600 });
    fixture.detectChanges();
    expect(TestBed.inject(SessionService).accessToken()).toBe('token-ficticio');
    expect(page.textContent).toContain('Você entrou no Pudd.');
    expect(page.textContent).not.toContain('token-ficticio');

    page.querySelector<HTMLButtonElement>('.success button')!.click();
    fixture.detectChanges();
    expect(TestBed.inject(SessionService).accessToken()).toBeNull();
    expect(page.querySelector<HTMLInputElement>('#senha')!.value).toBe('');
  });

  it('displays the API rejection and allows another attempt without starting a session', () => {
    const { fixture, page, http } = submitLogin();
    http.expectOne('/api/Auth/login').flush(
      { title: 'E-mail ou senha inválidos.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();
    expect(page.querySelector('[role="alert"]')!.textContent).toContain('E-mail ou senha inválidos.');
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
    expect(TestBed.inject(SessionService).accessToken()).toBeNull();
  });

  it('displays validation messages returned by the backend', () => {
    const { fixture, page, http } = submitLogin();
    http.expectOne('/api/Auth/login').flush(
      { title: 'Dados inválidos.', errors: { Email: ['E-mail inválido.'], Senha: ['Informe sua senha.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    const message = page.querySelector('[role="alert"]')!.textContent;
    expect(message).toContain('E-mail inválido.');
    expect(message).toContain('Informe sua senha.');
  });
});

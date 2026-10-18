import { TestBed } from '@angular/core/testing';
import { LoginIntro } from './login-intro';

describe('LoginIntro', () => {
  beforeEach(() => vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null));
  afterEach(() => vi.restoreAllMocks());
  it('lets the user read each step through the PrimeNG stepper', () => {
    const fixture = TestBed.createComponent(LoginIntro);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector('details')!.open = true;
    expect(element.querySelectorAll('p-step-item')).toHaveLength(3);
    expect(element.textContent).toContain('Crie sua conta');
    const steps = element.querySelectorAll<HTMLButtonElement>('p-step button');
    steps[1].click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Em Meu perfil, adicione sua foto');
    steps[2].click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Crie publicações com texto e imagem');
  });

  it('keeps the decorative effect separate from the brand and instructions', () => {
    const fixture = TestBed.createComponent(LoginIntro);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('img.landscape')).toBeNull();
    expect(element.querySelector('app-brand-logo')).not.toBeNull();
    expect(element.querySelector('details')).not.toBeNull();
  });
});

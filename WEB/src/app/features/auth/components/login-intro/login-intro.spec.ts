import { TestBed } from '@angular/core/testing';
import { LoginIntro } from './login-intro';

describe('LoginIntro', () => {
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

  it('switches the landscape when the theme changes', () => {
    const fixture = TestBed.createComponent(LoginIntro);
    fixture.detectChanges();
    const image = (fixture.nativeElement as HTMLElement).querySelector('img')!;
    expect(image.getAttribute('src')).toBe('/images/auth/day.png');
    fixture.componentRef.setInput('dark', true);
    fixture.detectChanges();
    expect(image.getAttribute('src')).toBe('/images/auth/night.png');
  });
});

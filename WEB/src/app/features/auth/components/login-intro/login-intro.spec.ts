import { TestBed } from '@angular/core/testing';
import { LoginIntro } from './login-intro';

describe('LoginIntro', () => {
  it('presents the developer community with PrimeNG surfaces', () => {
    const fixture = TestBed.createComponent(LoginIntro);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h2')?.textContent).toContain('Código conecta.');
    expect(element.querySelector('p-tag')?.textContent).toContain('COMUNIDADE DEV');
    expect(element.querySelector('p-card')?.textContent).toContain(
      'Uma conversa pode mudar seu projeto.',
    );
  });
});

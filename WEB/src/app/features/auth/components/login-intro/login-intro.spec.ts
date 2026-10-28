import { TestBed } from '@angular/core/testing';
import { LoginIntro } from './login-intro';

describe('LoginIntro', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('presents the community benefits without requiring interaction', () => {
    const fixture = TestBed.createComponent(LoginIntro);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Conecte-se');
    expect(element.textContent).toContain('Compartilhe');
    expect(element.textContent).toContain('Evolua');
    expect(element.textContent).toContain('Conheça pessoas da sua área.');
  });

  it('keeps the animated background decorative and the introduction accessible', () => {
    const fixture = TestBed.createComponent(LoginIntro);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('aside')?.getAttribute('aria-label')).toBe('Apresentação do Pudd');
    expect(element.querySelector('h2')?.textContent).toContain('Crie.');
    expect(element.querySelector('app-brand-logo')).not.toBeNull();
  });
});

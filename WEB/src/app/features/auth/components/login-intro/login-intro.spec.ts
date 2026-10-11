import { TestBed } from '@angular/core/testing';
import { LoginIntro } from './login-intro';
describe('LoginIntro', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  it('lets the user pause and resume the decorative wall', () => {
    const f = TestBed.createComponent(LoginIntro);
    f.detectChanges();
    const button = f.nativeElement.querySelector('button') as HTMLButtonElement;
    const initial = button.getAttribute('aria-pressed');
    button.click();
    f.detectChanges();
    expect(button.getAttribute('aria-pressed')).not.toBe(initial);
    button.click();
    f.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe(initial);
  });
});

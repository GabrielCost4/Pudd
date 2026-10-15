import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { NotificationStore } from './core/notifications/notification.store';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
  it('renders operation feedback through the global PrimeNG toast', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    TestBed.inject(NotificationStore).errors(['Nome inválido.', 'Bio inválida.']);
    await fixture.whenStable();
    const alert = fixture.nativeElement.querySelector('p-toast [role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Nome inválido.');
    expect(alert.textContent).toContain('Bio inválida.');
  });
});

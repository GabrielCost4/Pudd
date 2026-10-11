import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ErrorPage } from './error-page';
describe('ErrorPage', () => {
  it.each([
    { notFound: true, reason: '', code: '404' },
    { notFound: false, reason: 'forbidden', code: '403' },
    { notFound: false, reason: 'session', code: '401' },
  ])('shows $code for the route state', ({ notFound, reason, code }) => {
    TestBed.configureTestingModule({
      imports: [ErrorPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { notFound }, queryParamMap: convertToParamMap({ reason }) },
          },
        },
      ],
    });
    const f = TestBed.createComponent(ErrorPage);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain(code);
  });
});

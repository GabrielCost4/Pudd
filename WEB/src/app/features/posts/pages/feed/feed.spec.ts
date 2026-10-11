import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api';
import { Feed } from './feed';
describe('Feed', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Feed],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('shows a request failure to the user and leaves loading state', () => {
    const f = TestBed.createComponent(Feed);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/posts?page=1&pageSize=6')
      .flush({ title: 'Request failed' }, { status: 503, statusText: 'Unavailable' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('Request failed');
  });
  it('renders a successful response without an error alert', () => {
    const f = TestBed.createComponent(Feed);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/posts?page=1&pageSize=6')
      .flush({ items: [], page: 1, hasNextPage: false });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});

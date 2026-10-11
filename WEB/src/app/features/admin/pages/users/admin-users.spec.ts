import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api';
import { AdminUsers } from './admin-users';
describe('AdminUsers', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('shows a request failure to the user and leaves loading state', () => {
    const f = TestBed.createComponent(AdminUsers);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/admin/users?page=1&pageSize=15')
      .flush({ title: 'Request failed' }, { status: 503, statusText: 'Unavailable' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('Request failed');
  });
  it('renders a successful response without an error alert', () => {
    const f = TestBed.createComponent(AdminUsers);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/admin/users?page=1&pageSize=15')
      .flush({ items: [], page: 1, hasNextPage: false });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});

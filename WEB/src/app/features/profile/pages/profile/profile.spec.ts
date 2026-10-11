import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api';
import { ProfilePage } from './profile';
describe('ProfilePage', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('shows a request failure to the user and leaves loading state', () => {
    const f = TestBed.createComponent(ProfilePage);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/users/me')
      .flush({ title: 'Request failed' }, { status: 503, statusText: 'Unavailable' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('Request failed');
  });
  it('renders a successful response without an error alert', () => {
    const f = TestBed.createComponent(ProfilePage);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/users/me')
      .flush({ id: 'member', name: 'Member', bio: 'Developer', hasAvatar: false });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});

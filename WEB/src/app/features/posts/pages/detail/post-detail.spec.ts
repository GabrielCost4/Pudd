import { NotificationStore } from '../../../../core/notifications/notification.store';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api';
import { PostDetail } from './post-detail';
describe('PostDetail', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [PostDetail],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('shows a request failure to the user and leaves loading state', () => {
    const f = TestBed.createComponent(PostDetail);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/posts/')
      .flush({ title: 'Request failed' }, { status: 503, statusText: 'Unavailable' });
    f.detectChanges();
    expect(TestBed.inject(NotificationStore).notification()?.detail).toContain('Request failed');
  });
  it('navigates to not found when the post was removed', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const f = TestBed.createComponent(PostDetail);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/posts/')
      .flush({}, { status: 404, statusText: 'Not Found' });
    expect(navigate).toHaveBeenCalledWith(['/notfound']);
  });
});

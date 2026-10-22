import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api';
import { UserSearchService } from './user-search.service';

describe('UserSearchService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it.each([false, true])('uses the correct endpoint and an encoded query (admin=%s)', (admin) => {
    TestBed.inject(UserSearchService).search('Ana & João', admin).subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(
      (req) => req.url === API_BASE_URL + (admin ? '/admin/users/search' : '/users/search'),
    );
    expect(request.request.params.get('q')).toBe('Ana & João');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});

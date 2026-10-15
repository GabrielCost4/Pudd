import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api';
import { AccountService } from './account.service';

describe('AccountService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads the current account through GET', () => {
    const next = vi.fn();
    TestBed.inject(AccountService).me().subscribe(next);
    const request = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/users/me');
    expect(request.request.method).toBe('GET');
    const account = { id: 'member', name: 'Member', hasAvatar: true };
    request.flush(account);
    expect(next).toHaveBeenCalledWith(account);
  });

  it('encodes the avatar owner and propagates HTTP failures', () => {
    const error = vi.fn();
    TestBed.inject(AccountService).avatar('member/id').subscribe({ error });
    const request = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/users/member%2Fid/avatar',
    );
    expect(request.request.method).toBe('GET');
    request.flush(null, { status: 404, statusText: 'Not Found' });
    expect(error.mock.calls[0][0].status).toBe(404);
  });
});

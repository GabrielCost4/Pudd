import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../config/api';
import { SessionStore } from './session.store';
import { authInterceptor } from './auth.interceptor';

describe('Authentication boundary', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(withInterceptors([authInterceptor])),provideHttpClientTesting()]});
    vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    TestBed.inject(SessionStore).start('header.'+btoa(JSON.stringify({sub:'member',exp:Date.now()/1000+3600}))+'.signature','User');
  });
  afterEach(()=>{TestBed.inject(HttpTestingController).verify();TestBed.inject(SessionStore).clear();});
  it('sends the token only to the configured API path, never to external URLs or similar prefixes',()=>{
    const client=TestBed.inject(HttpClient), http=TestBed.inject(HttpTestingController);
    for(const url of [API_BASE_URL+'/posts','https://images.example.test/a.jpg',API_BASE_URL+'-other/posts']){
      client.get(url).subscribe();
      const req=http.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBe(url===API_BASE_URL+'/posts');
      req.flush({});
    }
  });
  it('leaves rejected credentials on the login form',()=>{
    const http=TestBed.inject(HttpTestingController);
    TestBed.inject(HttpClient).post(API_BASE_URL+'/Auth/login',{}).subscribe({error:()=>{}});
    const req=http.expectOne(API_BASE_URL+'/Auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({title:'Credenciais inválidas'},{status:401,statusText:'Unauthorized'});
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
  it('clears the session after a protected request is rejected with 401',()=>{
    TestBed.inject(HttpClient).get(API_BASE_URL+'/users/me').subscribe({error:()=>{}});
    TestBed.inject(HttpTestingController).expectOne(API_BASE_URL+'/users/me').flush({}, {status:401,statusText:'Unauthorized'});
    expect(TestBed.inject(SessionStore).accessToken()).toBeNull();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/unauthorized'],{queryParams:{reason:'session'}});
  });
  it('keeps the session and opens forbidden when the server rejects permissions',()=>{
    TestBed.inject(HttpClient).get(API_BASE_URL+'/admin/users').subscribe({error:()=>{}});
    TestBed.inject(HttpTestingController).expectOne(API_BASE_URL+'/admin/users').flush({}, {status:403,statusText:'Forbidden'});
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(true);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/unauthorized'],{queryParams:{reason:'forbidden'}});
  });
});

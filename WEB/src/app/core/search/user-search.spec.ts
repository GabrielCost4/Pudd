import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AutoComplete } from 'primeng/autocomplete';
import { API_BASE_URL } from '../config/api';
import { UserSearch } from './user-search';

describe('UserSearch', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [UserSearch],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('cancels the previous search as soon as input changes, including a short query', () => {
    const fixture = TestBed.createComponent(UserSearch);
    fixture.detectChanges();
    fixture.debugElement
      .query(By.directive(AutoComplete))
      .triggerEventHandler('completeMethod', { query: 'Ana' });
    const pending = TestBed.inject(HttpTestingController).expectOne(
      API_BASE_URL + '/users/search?q=Ana',
    );
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'A';
    input.dispatchEvent(new Event('input'));
    expect(pending.cancelled).toBe(true);
    fixture.destroy();
  });

  it('shows an accessible error when the search fails', () => {
    const fixture = TestBed.createComponent(UserSearch);
    fixture.detectChanges();
    fixture.debugElement
      .query(By.directive(AutoComplete))
      .triggerEventHandler('completeMethod', { query: 'Ana' });
    TestBed.inject(HttpTestingController)
      .expectOne(API_BASE_URL + '/users/search?q=Ana')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível pesquisar');
    fixture.destroy();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api';
import { PostEditor } from './post-editor';
describe('PostEditor', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [PostEditor],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('posts form content and navigates to the created post', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const f = TestBed.createComponent(PostEditor);
    f.detectChanges();
    const input = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    input.value = 'New post';
    input.dispatchEvent(new Event('input'));
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    const request = TestBed.inject(HttpTestingController).expectOne(API_BASE_URL + '/posts');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.get('Content')).toBe('New post');
    request.flush({ id: 'created' });
    expect(navigate).toHaveBeenCalledWith(['/posts', 'created']);
  });
});

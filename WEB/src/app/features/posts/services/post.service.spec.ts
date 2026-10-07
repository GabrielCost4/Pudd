import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api';
import { PostService } from './post.service';
import { CommentService } from './comment.service';
import { LikeService } from './like.service';

describe('Post API contracts',()=>{
  beforeEach(()=>TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]}));
  afterEach(()=>TestBed.inject(HttpTestingController).verify());
  it('filters a paginated feed by author without assuming a total count',()=>{
    TestBed.inject(PostService).list(2,'author').subscribe(result=>expect(result.hasNextPage).toBe(true));
    const req=TestBed.inject(HttpTestingController).expectOne(r=>r.url===API_BASE_URL+'/posts');
    expect(req.request.params.get('authorId')).toBe('author');
    expect(req.request.params.get('page')).toBe('2');
    req.flush({items:[],page:2,pageSize:6,hasNextPage:true});
  });
  it('preserves multipart boundaries and sends RemoveImage when editing',()=>{
    const form=new FormData();form.append('Content','Update');form.append('RemoveImage','true');
    TestBed.inject(PostService).update('post-id',form).subscribe();
    const req=TestBed.inject(HttpTestingController).expectOne(API_BASE_URL+'/posts/post-id');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBe(form);
    expect(req.request.headers.has('Content-Type')).toBe(false);
    expect((req.request.body as FormData).get('RemoveImage')).toBe('true');
    req.flush({});
  });
  it('uses distinct moderation routes for posts and comments',()=>{
    const http=TestBed.inject(HttpTestingController);
    TestBed.inject(PostService).moderate('post').subscribe();
    TestBed.inject(CommentService).moderate('comment').subscribe();
    for(const path of ['/admin/posts/post','/admin/comments/comment']) {
      const req=http.expectOne(API_BASE_URL+path);expect(req.request.method).toBe('DELETE');req.flush(null);
    }
  });
  it('reads, adds and removes likes with the endpoint methods',()=>{
    const service=TestBed.inject(LikeService),http=TestBed.inject(HttpTestingController);
    for(const [method,request] of [['GET',service.get('p')],['PUT',service.like('p')],['DELETE',service.unlike('p')]] as const) {
      request.subscribe();const req=http.expectOne(API_BASE_URL+'/posts/p/like');
      expect(req.request.method).toBe(method);req.flush({liked:method==='PUT',count:method==='PUT'?1:0});
    }
  });
});

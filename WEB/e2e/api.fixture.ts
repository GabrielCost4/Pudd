import type { Page } from '@playwright/test';

export const ME='11111111-1111-4111-8111-111111111111';
export const OTHER='22222222-2222-4222-8222-222222222222';
export const FIRST='33333333-3333-4333-8333-333333333333';
const SECOND='44444444-4444-4444-8444-444444444444';
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jw1sAAAAASUVORK5CYII=';

export async function mockApi(page:Page) {
  const state={
    calls:[] as {method:string;path:string;body:string;authorization:string|undefined}[],
    denied:false,failLogin:false,role:'User',
    profile:{id:ME,name:'Gabriel Dev',bio:'Construindo boas ideias.',hasAvatar:false},
    users:[{id:ME,name:'Gabriel Dev',email:'dev@example.test',role:'Admin',isBlocked:false},{id:OTHER,name:'Ana Dev',email:'ana@example.test',role:'User',isBlocked:false}],
    posts:[
      {id:FIRST,userID:ME,authorName:'Gabriel Dev',content:'Meu primeiro projeto no Pudd.',hasImage:false,createdAt:'2026-10-06T12:00:00Z',updatedAt:null as string|null},
      {id:SECOND,userID:OTHER,authorName:'Ana Dev',content:'Uma ideia da comunidade.',hasImage:false,createdAt:'2026-10-06T11:00:00Z',updatedAt:null as string|null},
    ],
    comments:[{id:'55555555-5555-4555-8555-555555555555',postID:FIRST,userID:OTHER,authorName:'Ana Dev',content:'Ótimo começo!',createdAt:'2026-10-06T12:05:00Z'}],
    likes:new Map<string,boolean>(),
  };
  await page.route('https://images.unsplash.com/**',route=>route.abort());
  await page.route('http://localhost:5193/api/**',async route=>{
    const req=route.request(), url=new URL(req.url()), path=url.pathname.replace('/api',''), method=req.method();
    state.calls.push({method,path,body:req.postData()||'',authorization:req.headers()['authorization']});
    const send=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'},body:status===204?'':JSON.stringify(body)});
    if(method==='OPTIONS')return send(null,204);
    if(path.startsWith('/Auth/')){
      if(state.failLogin)return send({title:'E-mail ou senha inválidos.'},401);
      const body=req.postDataJSON();
      state.role=body.email==='admin@example.test'?'Admin':'User';
      if(path.endsWith('register'))state.profile.name=body.nome;
      const payload=Buffer.from(JSON.stringify({sub:ME,email:body.email,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
      return send({accessToken:'header.'+payload+'.signature',role:state.role,expiresIn:60});
    }
    if(state.denied||!req.headers()['authorization'])return send({title:'Sessão indisponível.'},401);
    if(path.startsWith('/admin/')&&state.role!=='Admin')return send({title:'Sem permissão.'},403);
    const paginated=<T>(items:T[])=>{
      const current=Number(url.searchParams.get('page')||1),size=Number(url.searchParams.get('pageSize')||20),start=(current-1)*size;
      return {items:items.slice(start,start+size),page:current,pageSize:size,hasNextPage:start+size<items.length};
    };
    if(path==='/admin/users')return send(paginated(state.users));
    if(path.endsWith('/blocked')&&method==='PUT'){
      const user=state.users.find(item=>path.includes(item.id));if(user)user.isBlocked=req.postDataJSON().isBlocked;return send(null,204);
    }
    if(path==='/users/me'&&method==='PUT'){Object.assign(state.profile,req.postDataJSON());return send(state.profile);}
    if(path==='/users/me/avatar'&&(method==='PUT'||method==='DELETE')){state.profile.hasAvatar=method==='PUT';return send(null,204);}
    if(path.endsWith('/avatar'))return send({url:pixel,expiresInSeconds:3600});
    if(path==='/users/me'||path==='/users/'+ME)return send(state.profile);
    if(path==='/users/'+OTHER)return send({id:OTHER,name:'Ana Dev',bio:'Aprendendo em comunidade.',hasAvatar:false});
    if(path==='/posts'&&method==='GET'){
      const author=url.searchParams.get('authorId');return send(paginated(state.posts.filter(p=>!author||p.userID===author)));
    }
    if(path.endsWith('/like')){
      const id=path.split('/')[2];
      if(method!=='GET')state.likes.set(id,method==='PUT');
      return send({liked:state.likes.get(id)||false,count:state.likes.get(id)?1:0});
    }
    if(path.endsWith('/image'))return send({url:pixel,expiresInSeconds:3600});
    if(path.match(/^\/posts\/[^/]+\/comments$/)){
      const postID=path.split('/')[2];
      if(method==='POST'){
        const comment={id:crypto.randomUUID(),postID,userID:ME,authorName:state.profile.name,content:req.postDataJSON().content,createdAt:new Date().toISOString()};
        state.comments.unshift(comment);return send(comment,201);
      }
      return send(paginated(state.comments.filter(c=>c.postID===postID)));
    }
    if(method==='DELETE'&&path.includes('/comments/')){state.comments=state.comments.filter(c=>!path.endsWith(c.id));return send(null,204);}
    if(method==='DELETE'&&path.includes('/posts/')){state.posts=state.posts.filter(p=>!path.endsWith(p.id));return send(null,204);}
    if(path.startsWith('/posts')&&(method==='POST'||method==='PUT')){
      const body=req.postData()||'';
      const content=body.match(/name="Content"\r\n\r\n([\s\S]*?)\r\n--/)?.[1]||'';
      const hasNew=body.includes('name="Image"'),remove=body.includes('name="RemoveImage"\r\n\r\ntrue');
      if(method==='POST'){
        const post={id:crypto.randomUUID(),userID:ME,authorName:state.profile.name,content,hasImage:hasNew,createdAt:new Date().toISOString(),updatedAt:null};
        state.posts.unshift(post);return send(post,201);
      }
      const post=state.posts.find(p=>path.endsWith(p.id));
      if(post){post.content=content;post.hasImage=hasNew||(!remove&&post.hasImage);post.updatedAt=new Date().toISOString();return send(post);}
    }
    const post=state.posts.find(p=>path==='/posts/'+p.id);
    if(post)return send(post);
    return send({title:'Recurso não encontrado.'},404);
  });
  return state;
}

export async function login(page:Page,email='dev@example.test'){
  await page.goto('/login');
  await page.getByLabel('E-mail',{exact:true}).fill(email);
  await page.getByLabel('Senha',{exact:true}).fill('test-password');
  await page.getByRole('button',{name:'Entrar no Pudd'}).click();
  await page.waitForURL('**/feed');
}

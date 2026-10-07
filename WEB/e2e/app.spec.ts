import { test, expect } from '@playwright/test';
import { FIRST, ME, OTHER, mockApi, login } from './api.fixture';

test('protects private routes, renders 404, and keeps invalid credentials on login',async({page})=>{
  const api=await mockApi(page);
  await page.goto('/profile/me');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading',{name:'Essa conversa tomou outro caminho.'})).toBeVisible();
  api.failLogin=true;
  await page.goto('/login');
  await page.getByLabel('E-mail',{exact:true}).fill('dev@example.test');
  await page.getByLabel('Senha',{exact:true}).fill('wrong-password');
  await page.getByRole('button',{name:'Entrar no Pudd'}).click();
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos.');
  await expect(page).toHaveURL(/\/login$/);
});

test('registers a user and opens a paginated feed with author filtering',async({page})=>{
  const api=await mockApi(page);
  for(let i=0;i<7;i++)api.posts.push({...api.posts[0],id:crypto.randomUUID(),content:'Projeto extra '+i});
  await page.goto('/register');
  await page.getByLabel('Seu nome',{exact:true}).fill('Nova Pessoa');
  await page.getByLabel('E-mail',{exact:true}).fill('nova@example.test');
  await page.getByLabel('Senha',{exact:true}).fill('test-password');
  await page.getByRole('button',{name:'Criar minha conta'}).click();
  await expect(page.getByRole('heading',{name:'O que está acontecendo?'})).toBeVisible();
  await page.getByRole('button',{name:'Próxima →'}).click();
  await expect(page.getByLabel('Paginação')).toContainText('Página 2');
  await page.getByRole('link',{name:'Minhas publicações',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Um olhar, muitas histórias.'})).toBeVisible();
  expect(api.calls.some(c=>c.path==='/Auth/register'&&JSON.parse(c.body).nome==='Nova Pessoa')).toBeTruthy();
  await expect(page.locator('app-post-card')).toHaveCount(6);
});

test('creates, likes, comments, edits and deletes a post with an image',async({page})=>{
  const api=await mockApi(page);await login(page);
  await page.getByRole('link',{name:'Criar publicação',exact:true}).click();
  await page.getByLabel('Sua publicação',{exact:true}).fill('Construindo meu frontend completo.');
  await page.locator('input[type=file]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jw1sAAAAASUVORK5CYII=','base64')});
  await page.getByRole('button',{name:'Publicar ↗'}).click();
  await expect(page.locator('app-post-card')).toContainText('Construindo meu frontend completo.');
  await expect(page.getByAltText('Imagem anexada à publicação')).toBeVisible();
  await page.getByRole('button',{name:/0 curtidas/}).click();
  await expect(page.getByRole('button',{name:/1 curtida/})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:/1 curtida/}).click();
  await expect(page.getByRole('button',{name:/0 curtidas/})).toHaveAttribute('aria-pressed','false');
  await page.getByLabel('Seu comentário',{exact:true}).fill('Uma nova conversa.');
  await page.getByRole('button',{name:'Comentar',exact:true}).click();
  await expect(page.locator('app-comments')).toContainText('Uma nova conversa.');
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('app-comments').getByRole('button',{name:'Excluir',exact:true}).click();
  await expect(page.locator('app-comments')).not.toContainText('Uma nova conversa.');
  await page.getByRole('link',{name:'Editar',exact:true}).click();
  await page.getByLabel('Sua publicação',{exact:true}).fill('Projeto atualizado.');
  await page.getByLabel('Remover a imagem atual').check();
  await page.getByRole('button',{name:'Salvar alterações'}).click();
  await expect(page.locator('app-post-card')).toContainText('Projeto atualizado.');
  await expect(page.getByAltText('Imagem anexada à publicação')).toHaveCount(0);
  await page.locator('app-post-card').getByRole('button',{name:'Excluir',exact:true}).click();
  await expect(page).toHaveURL(/\/feed$/);
  expect(api.calls.some(c=>c.method==='PUT'&&c.body.includes('RemoveImage'))).toBeTruthy();
  expect(api.posts.some(p=>p.content==='Projeto atualizado.')).toBeFalsy();
});

test('updates profile and uploads/removes avatar, then opens another profile',async({page})=>{
  const api=await mockApi(page);await login(page);
  await page.getByRole('link',{name:'Meu perfil',exact:true}).click();
  await page.getByRole('button',{name:'Editar perfil'}).click();
  await page.getByLabel('Nome',{exact:true}).fill('Gabriel Atualizado');
  await page.getByLabel('Bio',{exact:true}).fill('Aprendendo Angular e .NET.');
  await page.getByRole('button',{name:'Salvar perfil'}).click();
  await expect(page.getByRole('heading',{name:'Gabriel Atualizado'})).toBeVisible();
  await page.getByRole('button',{name:'Editar perfil'}).click();
  await page.locator('input[type=file]').setInputFiles({name:'avatar.webp',mimeType:'image/webp',buffer:Buffer.from('RIFF0000WEBP')});
  await page.getByRole('button',{name:'Enviar foto'}).click();
  await expect(page.getByRole('status')).toContainText('Foto de perfil atualizada.');
  expect(api.profile.hasAvatar).toBeTruthy();
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Remover foto atual'}).click();
  await expect(page.getByRole('status')).toContainText('Foto de perfil removida.');
  expect(api.profile.hasAvatar).toBeFalsy();
  await page.getByRole('link',{name:'Ver publicações ↗'}).click();
  await page.locator('app-post-card').first().getByRole('link',{name:/Gabriel/}).click();
  await expect(page).toHaveURL(new RegExp('/profile/'+ME));
  await page.getByRole('link',{name:'Voltar para a comunidade'}).click();
  await page.locator('app-post-card').filter({hasText:'Uma ideia da comunidade.'}).getByRole('link',{name:/Ana Dev/}).click();
  await expect(page).toHaveURL(new RegExp('/profile/'+OTHER));
  await expect(page.getByRole('button',{name:'Editar perfil'})).toHaveCount(0);
});

test('admin blocks/unblocks accounts and moderates posts and comments',async({page})=>{
  const api=await mockApi(page);await login(page,'admin@example.test');
  await page.getByRole('link',{name:'Administração',exact:true}).click();
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Bloquear',exact:true}).click();
  await expect(page.getByRole('button',{name:'Desbloquear',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Desbloquear',exact:true}).click();
  await expect(page.getByRole('button',{name:'Bloquear',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Moderar publicações ↗'}).click();
  await page.locator('app-post-card').filter({hasText:'Uma ideia da comunidade.'}).getByRole('button',{name:'Moderar',exact:true}).click();
  await expect(page.locator('app-post-card')).toHaveCount(1);
  await page.getByRole('link',{name:'Conversar',exact:true}).click();
  await page.getByRole('button',{name:'Remover pela moderação'}).click();
  await expect(page.locator('app-comments')).not.toContainText('Ótimo começo!');
  expect(api.calls.some(c=>c.method==='DELETE'&&c.path.startsWith('/admin/posts/'))).toBeTruthy();
  expect(api.calls.some(c=>c.method==='DELETE'&&c.path.startsWith('/admin/comments/'))).toBeTruthy();
});

test('handles server session rejection and missing posts',async({page})=>{
  const api=await mockApi(page);await login(page);
  await page.getByRole('link',{name:'Criar publicação',exact:true}).click();
  api.denied=true;
  await page.getByLabel('Sua publicação').fill('Sessão encerrada');
  await page.getByRole('button',{name:'Publicar ↗'}).click();
  await expect(page).toHaveURL(/\/unauthorized\?reason=session/);
  await expect(page.getByRole('heading',{name:'Vamos nos conectar de novo?'})).toBeVisible();
  api.denied=false;await login(page);
  api.posts=[];
  await page.getByRole('link',{name:'Conversar',exact:true}).first().click();
  await expect(page).toHaveURL(/\/notfound$/);
});

test('mobile login has only the form, and application stays within viewport',async({page})=>{
  await mockApi(page);await page.setViewportSize({width:390,height:844});
  await page.goto('/login');
  await expect(page.locator('app-login-intro')).toBeHidden();
  await expect(page.locator('app-drift-wall img')).toHaveCount(0);
  await login(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await expect(page.getByRole('link',{name:'Administração',exact:true})).toHaveCount(0);
  await page.screenshot({path:'test-results/feed-mobile.png',fullPage:true});
});

test('renders the desktop feed and keeps API requests authenticated',async({page})=>{
  const api=await mockApi(page);await login(page);
  await expect(page.locator('app-post-card')).toHaveCount(2);
  await page.screenshot({path:'test-results/feed-desktop.png',fullPage:true});
  const protectedCalls=api.calls.filter(c=>!c.path.startsWith('/Auth/')&&c.method!=='OPTIONS');
  expect(protectedCalls.length).toBeGreaterThan(0);
  expect(protectedCalls.every(c=>c.authorization?.startsWith('Bearer '))).toBeTruthy();
  expect(api.calls.find(c=>c.path==='/Auth/login')?.authorization).toBeUndefined();
});

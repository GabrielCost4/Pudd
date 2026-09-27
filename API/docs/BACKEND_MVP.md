# Backend do MVP — guia para revisão

## O que foi implementado

- Posts com texto e imagem opcional, feed paginado, consulta, edição e exclusão pelo autor.
- Comentários de um nível, consulta paginada e exclusão pelo autor ou administrador.
- Curtir e descurtir com operações idempotentes: repetir PUT mantém a curtida; repetir DELETE mantém sua ausência.
- Perfil com nome, bio opcional e avatar opcional.
- Administração: listar usuários, bloquear/desbloquear contas e excluir posts/comentários de terceiros. Admin não edita texto alheio.
- Supabase Storage privado nos buckets `posts` e `avatars`, com upload, remoção e URLs assinadas por 5 minutos.

## Como o código se conecta

1. O controller recebe o JWT validado e extrai `sub`; o cliente não escolhe o autor.
2. Os formulários multipart recebem `IFormFile` na API e convertem para `ImageUpload`.
3. Os services validam conteúdo, autoria, bloqueio e cargo, consultando o estado atual do usuário no banco.
4. `IImageStorage` permite à Application solicitar upload sem conhecer Supabase. `SupabaseImageStorage` usa HTTP na Infrastructure.
5. Os repositories usam `PuddDbContext` para persistência. A Application não recebe um DbContext.
6. Responses expõem os campos necessários, sem serializar entidades, hashes de senha ou credenciais.

Comece a leitura por `PostService`, depois `PostsController`, `ImageService` e `SupabaseImageStorage`. Os comentários explicam decisões como autoria, rastreamento do EF, concorrência e limpeza de imagens.

## Rotas

Todas as rotas sociais exigem `Authorization: Bearer <token>`. Cadastro e login continuam nas rotas existentes.

| Método e rota | Entrada/resultado |
| --- | --- |
| POST `/api/posts` | multipart: `Content` e `Image` opcional; retorna 201 |
| GET `/api/posts?page=1&pageSize=20` | feed do mais recente para o mais antigo |
| GET `/api/posts?authorId=GUID&page=1&pageSize=20` | publicações de um perfil |
| GET `/api/posts/{id}` | detalhe do post |
| PUT `/api/posts/{id}` | multipart: `Content`, `Image` opcional, `RemoveImage` opcional |
| DELETE `/api/posts/{id}` | autor exclui; retorna 204 |
| GET `/api/posts/{id}/image` | URL assinada e `expiresInSeconds` |
| GET `/api/posts/{postId}/comments?page=1&pageSize=20` | comentários do mais antigo para o mais recente |
| POST `/api/posts/{postId}/comments` | JSON com `content`; retorna 201 |
| DELETE `/api/comments/{id}` | autor exclui; retorna 204 |
| GET `/api/posts/{postId}/like` | estado da curtida do solicitante e contagem |
| PUT `/api/posts/{postId}/like` | curtir |
| DELETE `/api/posts/{postId}/like` | descurtir |
| GET `/api/users/me` ou `/api/users/{id}` | perfil; sem e-mail ou hash |
| PUT `/api/users/me` | JSON com `name` e `bio` opcional |
| PUT `/api/users/me/avatar` | multipart com `Image` |
| DELETE `/api/users/me/avatar` | remove avatar |
| GET `/api/users/{id}/avatar` | URL assinada do avatar |
| GET `/api/admin/users?page=1&pageSize=20` | listagem administrativa |
| PUT `/api/admin/users/{id}/blocked` | JSON com `isBlocked` |
| DELETE `/api/admin/posts/{id}` | moderação de post |
| DELETE `/api/admin/comments/{id}` | moderação de comentário |

A interface deverá confirmar a exclusão antes de enviar DELETE: “Você realmente deseja excluir? Esta ação é permanente e não poderá ser desfeita.”

## Regras e limites adotados

- Texto do post: 1 a 5.000 caracteres; comentário: 1 a 2.000; nome: 1 a 50; bio: até 500. Os services removem espaços nas extremidades.
- Página inicial 1, tamanho padrão 20 e máximo 50. O resultado tem `items`, `page`, `pageSize` e `hasNextPage`.
- Imagens de até 5 MiB (5 × 1024 × 1024 bytes), MIME JPG/PNG/WebP e assinatura inicial compatível. Essa checagem não é uma decodificação completa nem antivírus.
- Na edição, omitir imagem preserva a atual. `RemoveImage=true` remove; enviar imagem substitui. Remover e substituir juntos retorna 400.
- O cliente nunca envia o caminho de armazenamento. Nomes de arquivos são gerados com GUID e somente a referência fica no PostgreSQL.
- As rotas de curtida permitem 30 requisições por minuto por usuário, nesta instância da API; o excedente retorna 429.
- Bloqueio impede novos logins e recusa o JWT já emitido nas próximas requisições. Cargo de Admin também é conferido no banco. Admin não pode bloquear a própria conta.
- URLs assinadas são acessíveis a quem possuir o link até expirar. Bloquear alguém não invalida instantaneamente links já entregues.
- Falhas de negócio retornam ProblemDetails (400/401/403/404/409); indisponibilidade do Storage retorna 503. Outros erros não expõem detalhes internos.

## Limpeza de arquivos e concorrência

Excluir um post remove imediatamente sua linha, comentários e curtidas em cascata. A limpeza da imagem fica registrada em `pendingImageDeletions`, na mesma transação do banco. A mesma fila atende à troca/remoção de avatar e de imagem do post.

O worker consulta a fila a cada 30 segundos e tenta excluir os arquivos no Supabase. Se falhar, agenda outra tentativa com atraso crescente, limitado a 60 minutos. Reiniciar a API não perde a fila. Exclusões são definitivas; não existe restauração pela API.

Se salvar no banco falhar após upload, o service tenta remover o arquivo novo e, se necessário, enfileira a limpeza. Uma queda abrupta entre upload e gravação, ou a indisponibilidade simultânea do banco e do Storage, ainda pode deixar arquivo órfão: não há transação distribuída entre os dois sistemas. Uma rotina de reconciliação pode ser adicionada futuramente.

`UpdatedAt` do post e `AvatarImagePath` do usuário funcionam como tokens de concorrência do EF. Duas edições simultâneas não sobrescrevem silenciosamente a versão já salva; a segunda recebe 409 e seu upload novo é compensado.

## Configuração e migration

A integração lê `Supabase:Url` e `Supabase:SecretKey` da configuração da API (User Secrets no desenvolvimento). Não precisa instalar um SDK Supabase nem migrar o PostgreSQL para a nuvem. Os buckets privados devem existir e permitir os formatos/tamanho combinados.

Foi gerada a migration `AddImageDeletionQueue`. Para usá-la no seu banco, execute na pasta `API`, depois de revisar:

```powershell
dotnet ef database update --project Pudd.Infrastructure --startup-project Pudd.API
```

O comando não foi executado no banco de trabalho durante a implementação. Sem a nova tabela, operações que agendam limpeza de imagem não funcionam.

## Testes

```powershell
dotnet test Pudd.Tests/Pudd.Tests.csproj
```

Os testes de services, HTTP e do adaptador Supabase usam dados fictícios e respostas simuladas. Nenhum arquivo é enviado ao projeto Supabase real. Há também um teste de migrations, índice único, curtidas simultâneas, Restrict, Cascade, concorrência e fila contra PostgreSQL real.

Esse último teste exige `PUDD_TEST_POSTGRES` apontando para um banco descartável cujo nome comece com `pudd_tests_`; sem essa variável, ele é ignorado. Nunca aponte o teste para o banco Pudd. Durante a implementação, foi usado um container temporário separado.

Referências da integração: [API do Storage](https://supabase.com/docs/reference/self-hosting-storage), [chaves de API](https://supabase.com/docs/guides/getting-started/api-keys) e [buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals).

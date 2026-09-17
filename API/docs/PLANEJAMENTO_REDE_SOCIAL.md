# Planejamento — Rede social para desenvolvedores

## Objetivo

Evoluir o Pudd para uma comunidade fechada de desenvolvedores. Todos os recursos exigem autenticação, e os membros poderão publicar conteúdo, comentar, curtir e consultar perfis.

## Usuários

- Um usuário pode ter uma bio, mas ela é opcional.
- Um usuário pode ter nenhuma, uma ou várias postagens.
- Um usuário pode estar bloqueado ou desbloqueado. Esse estado pode ser alterado por um administrador.
- Usuários bloqueados não poderão realizar login nem interagir na plataforma.
- O primeiro administrador será definido manualmente no PostgreSQL, alterando a coluna `Role` do usuário para `Admin`.

## Funcionalidades do MVP

- Feed cronológico acessível apenas para usuários autenticados.
- Perfil público básico, com edição do próprio nome, bio e avatar opcional.
- Criação, edição e exclusão das próprias postagens.
- Cada postagem terá texto e poderá ter uma imagem opcional.
- Comentários em postagens, sem respostas a comentários nesta primeira versão.
- Uma curtida por usuário em cada postagem; curtir novamente remove a curtida.
- Administração de usuários: listar, bloquear e desbloquear contas.
- Moderação: o administrador poderá excluir qualquer postagem ou comentário.

## Entidades previstas

- `User`: entidade já existente; receberá os campos opcionais/necessários para bio, avatar e bloqueio.
- `Post`: conteúdo, referência opcional da imagem, autor e datas de criação/atualização.
- `Comment`: conteúdo, postagem, autor e data de criação.
- `PostLike`: relação entre um usuário e uma postagem.

## Relacionamentos e exclusão

- Um `Post` pertence a um `User`; um `User` pode possuir várias postagens.
- Um `Comment` pertence a um `Post` e a um `User`.
- Um `PostLike` conecta um `User` a um `Post`, com restrição para impedir curtidas duplicadas.
- A exclusão será definitiva. Ao excluir uma postagem, seus comentários e curtidas também serão removidos do banco.
- Antes de chamar a API, a futura interface deverá solicitar confirmação com a mensagem:

> Você realmente deseja excluir? Esta ação é permanente e não poderá ser desfeita.

## Imagens

- Um avatar opcional por usuário e uma imagem opcional por postagem.
- Formatos aceitos: JPG, PNG e WebP.
- Tamanho máximo: 5 MB.
- Os arquivos serão enviados para o Supabase Storage, e o PostgreSQL do Pudd guardará apenas o caminho do arquivo.
- Serão utilizados buckets privados separados: `avatars` para fotos de perfil e `posts` para imagens de postagens.
- A API validará o JWT e as regras de autorização antes de enviar, substituir, obter ou excluir arquivos.
- A URL de leitura deverá ser assinada e temporária, pois os buckets não serão públicos.
- As credenciais do Supabase ficarão em User Secrets ou variáveis de ambiente, nunca no GitHub.

## Arquitetura do armazenamento

- A Application definirá a interface `IImageStorage`, sem conhecer Supabase diretamente.
- A Infrastructure implementará `SupabaseImageStorage`, responsável por conversar com o Supabase Storage.
- Os services utilizarão apenas `IImageStorage` por injeção de dependência.
- Isso permite trocar Supabase por outro provedor futuramente sem alterar as regras de posts e perfis.

## Ordem de implementação

1. Modelar `Post`, `Comment` e `PostLike`, atualizar `User` e criar a migration.
2. Implementar repositórios e regras de negócio de postagens.
3. Configurar Supabase Storage e implementar `IImageStorage` / `SupabaseImageStorage`.
4. Implementar upload, troca, exclusão e leitura protegida de avatar e imagens de postagens.
5. Implementar comentários e curtidas.
6. Implementar perfil editável.
7. Implementar moderação e bloqueio de usuários.
8. Criar testes das regras de autorização, ownership e exclusões em cascata.

## Regras importantes

- Usuário comum nunca poderá editar ou excluir conteúdo de outro usuário.
- Apenas administradores poderão moderar conteúdos de terceiros e alterar o estado de bloqueio de contas.
- Rotas protegidas devem exigir um JWT válido.
- Não haverá sistema de seguir usuários ou respostas a comentários no MVP.

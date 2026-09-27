# Pudd — fluxo de postagens

## Criar postagem

```mermaid
flowchart TD
    start([POST api/posts]) --> form[/CreatePostForm: Content e Image opcional/]
    form --> actor[Controller obtém ActorId]
    actor --> active{Conta está ativa?}
    active -->|Não| unauthorized[401: não autenticado]
    active -->|Sim| content{Conteúdo é válido?}
    content -->|Não| invalid[400: conteúdo inválido]
    content -->|Sim| hasImage{Enviou imagem?}
    hasImage -->|Não| createPost[Cria Post com ImagePath nulo]
    hasImage -->|Sim| validateImage[ImageService valida tipo, tamanho e bytes]
    validateImage --> imageValid{Imagem válida?}
    imageValid -->|Não| invalidImage[400: imagem inválida]
    imageValid -->|Sim| storage[Envia arquivo ao Supabase]
    storage --> imagePath[Recebe o caminho da imagem]
    imagePath --> createPost[Cria Post com ImagePath]
    createPost --> repository[PostRepository adiciona]
    repository --> database[(PostgreSQL: posts)]
    database --> created[201: postagem criada]
```

## Editar ou excluir postagem

```mermaid
flowchart TD
    start([PUT ou DELETE api/posts/id]) --> actor[Controller obtém ActorId]
    actor --> active{Conta está ativa?}
    active -->|Não| unauthorized[401: não autenticado]
    active -->|Sim| findPost[Repository busca a postagem]
    findPost --> database[(PostgreSQL: posts)]
    database --> exists{Postagem existe?}
    exists -->|Não| notFound[404: postagem não encontrada]
    exists -->|Sim| owner{ActorId é o dono?}
    owner -->|Não| forbidden[403: sem permissão]
    owner -->|Sim| operation{Editar ou excluir?}
    operation -->|Editar| update[Valida texto e atualiza post]
    update --> database
    operation -->|Excluir| delete[Remove post e agenda imagem]
    delete --> database
    database --> cascade[PostgreSQL remove comentários e curtidas em cascata]
    cascade --> deleted[204: postagem excluída]
    delete -.-> pending[Salva imagem na fila de limpeza]
    pending -.-> worker[Worker tenta apagar imagem no Supabase]
    update --> success[200: postagem atualizada]
```

Na edição, o usuário pode manter, substituir ou remover a imagem. Não pode pedir para remover e substituir a imagem na mesma requisição.

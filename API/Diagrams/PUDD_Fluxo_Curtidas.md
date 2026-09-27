# Pudd — fluxo de curtidas

```mermaid
flowchart TD
    start([PUT ou DELETE api/posts/postId/like]) --> limit[Rate limiter verifica frequência]
    limit --> allowed{Limite disponível?}
    allowed -->|Não| tooMany[429: muitas requisições]
    allowed -->|Sim| actor[Controller obtém ActorId]
    actor --> active{Conta está ativa?}
    active -->|Não| unauthorized[401: não autenticado]
    active -->|Sim| findPost[Verifica se a postagem existe]
    findPost --> posts[(PostgreSQL: posts)]
    posts --> exists{Postagem existe?}
    exists -->|Não| notFound[404: postagem não encontrada]
    exists -->|Sim| action{Qual requisição?}
    action -->|PUT| like[Insere curtida se ainda não existir]
    action -->|DELETE| unlike[Remove curtida se existir]
    like --> likes[(PostgreSQL: postLikes)]
    unlike --> likes
    likes --> count[Conta curtidas atuais]
    count --> response[200: liked e count]
```

`PUT` significa “deixar curtido” e `DELETE` significa “deixar descurtido”. Repetir a mesma requisição não inverte o estado. O índice único `UserID + PostID` impede duas curtidas do mesmo usuário no mesmo post.

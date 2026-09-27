# Pudd — fluxo do ActorId

`ActorId` é o ID de quem fez a requisição. Ele não vem do corpo enviado pelo cliente: a API o extrai do JWT já validado.

```mermaid
flowchart TD
    start([Cliente chama rota protegida]) --> bearer[/Header: Bearer JWT/]
    bearer --> authentication[UseAuthentication valida JWT]
    authentication --> validToken{Token válido?}
    validToken -->|Não| unauthenticated[401: não autenticado]
    validToken -->|Sim| claim[JWT fornece claim sub]
    claim --> checkAccount[OnTokenValidated consulta usuário]
    checkAccount --> database[(PostgreSQL)]
    database --> activeAccount{Usuário existe e está ativo?}
    activeAccount -->|Não| unauthenticated
    activeAccount -->|Sim| controller[SocialControllerBase lê sub]
    controller --> actorId[ActorId é convertido para Guid]
    actorId --> service[Controller envia ActorId ao service]
    service --> rule{Regra permite a ação?}
    rule -->|Não| forbidden[403: sem permissão]
    rule -->|Sim| action[Executa a operação]
```

O service usa o `ActorId` para validar conta ativa, dono do conteúdo ou cargo de Admin.

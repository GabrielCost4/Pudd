# Pudd — autenticação e autorização

O diagrama abaixo mostra o caminho real dos dados no backend: do cadastro ou login até uma ação protegida, como criar, editar ou excluir uma postagem.

```mermaid
flowchart TD
    start([Cliente envia uma requisição]) --> route{Qual rota?}

    route -->|POST /api/auth/register| registerInput[JSON: nome, e-mail e senha]
    registerInput --> registerController[AuthController recebe RegisterRequest]
    registerController --> registerService[Serviço valida os dados]
    registerService --> registerValid{Nome, e-mail e senha são válidos?}
    registerValid -->|Não| badRegister[400: dados inválidos]
    registerValid -->|Sim| findEmail[UserRepository busca o e-mail]
    findEmail --> database[(PostgreSQL: users)]
    database --> emailExists{E-mail já cadastrado?}
    emailExists -->|Sim| duplicateEmail[409: e-mail já existe]
    emailExists -->|Não| hashPassword[PasswordHasher transforma a senha em hash]
    hashPassword --> saveUser[UserRepository salva usuário com PasswordHash]
    saveUser --> database
    database --> registerToken[JwtService cria JWT com sub, e-mail, role e jti]
    registerToken --> registerResponse[200: token e dados seguros do usuário]

    route -->|POST /api/auth/login| loginInput[JSON: e-mail e senha]
    loginInput --> loginController[AuthController recebe LoginRequest]
    loginController --> authService[AuthService busca o usuário pelo e-mail]
    authService --> database
    database --> userFound{Usuário encontrado?}
    userFound -->|Não| invalidLogin[401: credenciais inválidas]
    userFound -->|Sim| verifyPassword[PasswordHasher compara senha com PasswordHash]
    verifyPassword --> passwordMatches{Senha confere?}
    passwordMatches -->|Não| invalidLogin
    passwordMatches -->|Sim| blockedOnLogin{Usuário está bloqueado?}
    blockedOnLogin -->|Sim| blockedLogin[401: acesso não permitido]
    blockedOnLogin -->|Não| loginToken[JwtService cria um novo JWT]
    loginToken --> loginResponse[200: token e dados seguros do usuário]

    route -->|Rota protegida| protectedInput[Header: Authorization Bearer JWT]
    protectedInput --> jwtValidation[UseAuthentication valida assinatura, emissor, público e expiração]
    jwtValidation --> tokenValid{JWT válido?}
    tokenValid -->|Não| unauthorized[401: não autenticado]
    tokenValid -->|Sim| tokenUser[OnTokenValidated busca o usuário do claim sub]
    tokenUser --> database
    database --> accountActive{Usuário existe e não está bloqueado?}
    accountActive -->|Não| unauthorized
    accountActive -->|Sim| authorize[UseAuthorization permite a rota Authorize]
    authorize --> controller[Controller extrai ActorId do claim sub]
    controller --> service[Service recebe ActorId e os dados da requisição]
    service --> activeRule[Regra confirma que a conta está ativa]
    activeRule --> database
    database --> actionType{Qual é a ação?}

    actionType -->|Criar conteúdo| validateInput[Valida conteúdo e regras de negócio]
    actionType -->|Editar ou excluir conteúdo| loadResource[Repository busca o post ou comentário]
    actionType -->|Ação administrativa| adminRule[Confere Role Admin atual no banco]

    loadResource --> database
    database --> ownerCheck{ActorId é o dono?}
    ownerCheck -->|Não| forbidden[403: sem permissão]
    ownerCheck -->|Sim| validateInput
    adminRule --> database
    database --> isAdmin{É Admin?}
    isAdmin -->|Não| forbidden
    isAdmin -->|Sim| executeAction[Repository executa a operação]
    validateInput --> inputValid{Dados válidos?}
    inputValid -->|Não| invalidRequest[400: dados inválidos]
    inputValid -->|Sim| executeAction
    executeAction --> database
    database --> success[Resposta de sucesso]
```

Pontos importantes:

- A senha original nunca é salva no banco: apenas o `PasswordHash`.
- O JWT não guarda a senha. Ele leva dados de identificação, principalmente o `sub`, que é o ID do usuário.
- `ActorId` é o ID obtido do `sub`; ele identifica quem está tentando executar a ação.
- A autorização não confia somente no token: em cada requisição protegida, a API também verifica no banco se o usuário ainda existe e não está bloqueado.
- Em ações sobre conteúdo próprio, o service compara `ActorId` com o `UserID` do post ou comentário. Em ações de administração, ele confirma o cargo atual no banco.

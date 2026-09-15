# PUDD — progresso do projeto

## O que já foi feito

- Criada uma API em **ASP.NET Core** com `POST /api/auth/login` e `POST /api/auth/register`.
- Organizado o projeto em camadas: `Domain`, `Application`, `Infrastructure` e `API`.
- Configurado **Entity Framework Core** com **Npgsql** para acessar o PostgreSQL.
- Criado o banco `Pudd` e aplicadas migrations para criar `users` e garantir e-mail único.
- Implementado `UserRepository`, responsável por buscar e salvar usuários.
- Implementado hash de senha com **BCrypt**; senhas nunca são armazenadas em texto puro.
- Implementado JWT com ID, e-mail, role e expiração; a chave fica em **User Secrets**.
- Configurado Bearer Authentication, Authorization e injeção de dependência no `Program.cs`.
- Criado `LoginResult` e `AuthErrors` para distinguir sucesso de falhas de autenticação.

## Para que serve cada camada

- **Domain:** entidades e regras centrais, como `User` e `UserRole`.
- **Application:** services, contratos e interfaces como `IUserRepository` e `IJwtService`.
- **Infrastructure:** EF Core, PostgreSQL, repositórios, BCrypt e geração do JWT.
- **API:** controllers, rotas HTTP e configuração da aplicação.

## Fluxo atual

```text
AuthController → AuthService/RegisterService → IUserRepository → UserRepository → PostgreSQL
```

- Login válido ou cadastro válido retornam JWT com HTTP 200.
- E-mail já cadastrado retorna HTTP 409.
- Senha fraca retorna HTTP 400.
- Credenciais inválidas no login retornam HTTP 401 sem informar qual dado falhou.

## Próximos passos

- Proteger endpoints futuros com `[Authorize]`.
- Criar testes para cadastro, login e erros de autenticação.

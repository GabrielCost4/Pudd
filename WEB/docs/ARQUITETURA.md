# Pudd — arquitetura do front-end

## Objetivo e estado atual

O front-end Angular do Pudd é a interface da rede social e consome a API REST em .NET. O projeto também serve ao aprendizado de desenvolvimento full-stack; as implementações devem ser compreensíveis e suas decisões explicadas ao usuário.

A arquitetura escolhida é **Feature Based**: organizar o código por funcionalidade, mantendo próximos seus componentes, páginas, serviços e modelos.

Este arquivo é a referência obrigatória para conferir e implementar o front-end. A primeira feature implementada é a tela de login em `features/auth`, com serviço HTTP e modelos de requisição/resposta. `core/auth` mantém o token apenas em memória; recarregar o navegador encerra essa sessão local. Feed, cadastro e perfil ainda não foram implementados. Criar diretórios conforme a necessidade, sem gerar toda a estrutura antecipadamente.

## Regras obrigatórias de organização

- Nenhum arquivo pode ficar em uma pasta sem relação com sua responsabilidade. Código exclusivo de uma funcionalidade pertence à sua feature; `shared` não é depósito de arquivos e `core` não recebe conteúdo específico de uma tela.
- O TS do componente contém somente metadados Angular e lógica de apresentação: inputs, outputs, formulário, estado visual, eventos, ciclo de vida e tratamento das respostas para exibição. HTML fica em `.html`; CSS e animações ficam em `.css`. Não escrever templates ou estilos inline no TS.
- Arquivos `*.service.ts` contêm exclusivamente integração HTTP: injeção de HttpClient, métodos de requisição, URL, parâmetros, headers e contratos de resposta. Não guardar sessão, controlar loading, navegar ou aplicar regras de negócio nesses services. A página consome seus Observables e controla a interface.
- Estado compartilhado sem requisições pertence a um `*.store.ts`. A sessão global usa `core/auth/session.store.ts`, não um service HTTP nem um componente visual.
- Interfaces e contratos específicos ficam em `features/<feature>/models`, em arquivos com nomes kebab-case. Contratos HTTP genéricos, como `ApiProblem`, ficam em `shared/models`. Não manter pastas paralelas `Interfaces` e `models` para a mesma responsabilidade.
- Dados estáticos específicos de um componente podem ficar em arquivo de dados ao lado dele. Não colocar fotos ou textos exclusivos do login em `core` ou dentro de um componente visual genérico.
- `shared/components` pode conter primitivas visuais genéricas e configuráveis por inputs, sem conhecimento de auth/posts/profile, mesmo quando seu primeiro consumidor é uma única feature. Um componente que conhece o conteúdo ou o fluxo de login permanece em `features/auth/components`.
- Arquivos sem consumidores e sem função ativa devem ser descartados, atualizando imports e documentação. Não remover entradas do Angular, testes, configurações ou assets referenciados indiretamente só porque não aparecem em um import TS. Não criar estruturas para funcionalidades futuras.
- Features podem consumir `core` e `shared`; `core` e `shared` não podem importar features. Uma feature não deve importar arquivos internos de outra feature.

Antes de concluir: conferir propriedade das pastas, ausência de HTTP nos componentes, services restritos a requisições, HTML/CSS externos, imports e assets usados; executar build e checagens TypeScript e registrar o resultado em ANNOTATIONS.md.

## Estrutura de referência

```text
src/app/
├── core/
│   ├── auth/                 # Sessão, guard e interceptor de autenticação
│   └── config/               # Configuração global, como base da API
├── shared/
│   ├── components/           # Primitivas visuais genéricas
│   └── models/               # Contratos genéricos de resposta HTTP
├── features/
│   ├── auth/
│   │   ├── pages/            # Login e cadastro
│   │   ├── services/         # Integração HTTP de autenticação
│   │   └── models/           # Contratos de login e cadastro
│   ├── posts/
│   │   ├── pages/            # Feed e detalhe do post
│   │   ├── components/       # Card e formulário de post
│   │   ├── services/         # Integração HTTP de posts
│   │   └── models/           # Contratos de posts
│   └── profile/
│       ├── pages/            # Visualização e edição do perfil
│       ├── components/      # Componentes específicos do perfil
│       ├── services/        # Integração HTTP de usuários e avatar
│       └── models/          # Contratos de perfil
├── app.routes.ts
└── app.config.ts
```

## Responsabilidades

### Features

Cada feature reúne o código de uma funcionalidade do produto. Por exemplo, `PostService`, o formulário de publicação e o card de post pertencem a `features/posts`.

- `pages`: componentes associados às rotas, responsáveis por coordenar a tela.
- `components`: partes da interface específicas da feature.
- `services`: somente chamadas HTTP da funcionalidade.
- `models`: tipos TypeScript dos contratos e dados usados pela feature.

As páginas devem delegar a integração HTTP aos serviços. Os componentes recebem os dados necessários e comunicam ações à página quando isso evita acoplar a apresentação às chamadas da API.

Comentários, curtidas e administração devem ser organizados conforme forem implementados. Uma funcionalidade pode começar dentro de posts e ganhar uma feature própria quando sua responsabilidade justificar essa separação.

### Core

Reúne responsabilidades globais da aplicação: estado da sessão, proteção de rotas e envio do token às requisições da API do Pudd.

`core/auth/session.store.ts` define `SessionStore` e mantém a sessão em memória, sem requisições HTTP. `features/auth` implementa as telas e a integração de login e cadastro. Evitar duplicar o estado da sessão entre os dois lugares. Stores são estado; services são requisições.

`core` não deve importar páginas ou componentes de features.

### Shared

Reúne componentes e utilitários usados por diferentes features, como botão, avatar e mensagem de erro. Um componente específico de posts permanece em posts até existir uma necessidade real de compartilhamento.

Os componentes compartilhados não devem depender de serviços específicos de features. Receber dados e emitir eventos permite reutilizá-los sem assumir um fluxo de negócio particular.

A tela de login utiliza três componentes de apresentação em `shared/components`: `LabelInput` (campo com rótulo flutuante e opção de exibir senha), `Button` (aplicado ao botão HTML nativo por `puddButton`) e `Spinner` (carregamento). O campo recebe um `FormControl` da página para manter o formulário centralizado; os componentes não chamam a API nem decidem se o usuário está autorizado.

O visual usa o [Spell UI](https://spell.sh/docs/components) como referência para Label Input e Rich Button e o [React Bits](https://reactbits.dev/components/drift-wall) para o mural fotográfico do intro. A implementação do Pudd é própria em Angular e CSS, com tema escuro, bordas discretas e animações que respeitam a preferência por movimento reduzido. Não há dependência de React, Tailwind ou dessas bibliotecas no projeto.

`Signature`, em `shared/components/signature`, adapta a referência Signature para exibir Pudd como assinatura animada em SVG. Recebe texto, tamanho e duração; `fontSize` define a altura visual em pixels. Após carregar a fonte local em `public/fonts/LastoriaBoldRegular.otf`, o componente mede os traços para ajustar o viewBox e preservar as proporções. A animação começa após a medição e é desativada quando o usuário prefere movimento reduzido.

### Composição da aplicação

O intro do login combina `BlurReveal`, aplicado à marca e ao texto de apresentação, e `DriftWall`, mural decorativo de fotos em perspectiva. Os dois componentes ficam em `shared/components`. Um degradê escuro separa visualmente as imagens do texto.

`DriftWall` recebe URLs de imagens e o estado de pausa. Três colunas com grupos repetidos deslizam em sentidos alternados usando animações CSS. O mural é decorativo, sem links ou itens no percurso de foco. `LoginIntro` mantém o botão nativo para pausar ou retomar o movimento; isso é estado de apresentação, não regra de negócio.

O mural pausa fora de vista com IntersectionObserver. Com movimento reduzido, o mural fica estático e a entrada animada do texto é desativada. O painel permanece oculto até 767 px, e o componente não renderiza imagens nesse tamanho, evitando downloads exclusivamente decorativos no celular. Observers e listeners são liberados ao destruir o componente.

As fotos ilustrativas atuais de programação, setups, servidores e eletrônica são definidas em `features/auth/components/login-intro/login-intro.images.ts` e solicitadas pelo elemento HTML img de `images.unsplash.com`; não são conteúdo de usuários do Pudd. As URLs pedem imagens de 480 × 640 com qualidade 75 e formato automático. Carregamento nativo de imagem não é uma chamada de API com HttpClient. Essa dependência de rede pode ser substituída por assets locais antes da publicação. Se as imagens falharem, os tiles mantêm seu fundo e a mensagem permanece legível. DitherGradient e FloatingFolder foram substituídos e removidos por não possuírem consumidores.

`app.routes.ts` compõe a navegação. Conforme as features crescerem, suas rotas podem ser definidas localmente e carregadas sob demanda.

`app.config.ts` concentra a configuração global do Angular e dos recursos como HTTP, roteamento e interceptors.

## Integração com o back-end

O fluxo de uma ação é: página ou componente → serviço Angular da feature → API REST → atualização da interface com a resposta.

- Os modelos TypeScript devem representar os contratos HTTP, sem copiar entidades ou camadas internas do back-end.
- A URL da API deve ser configurada em um ponto central conforme o ambiente.
- Atualmente, `core/config/api.ts` define a base `/api`. Durante `npm start`, `proxy.conf.json` encaminha essas chamadas para `http://localhost:5193`. Em produção, o servidor deve encaminhar `/api` ao backend ou a configuração deverá ser adaptada ao endereço de implantação.
- O interceptor deve enviar o token somente às requisições destinadas à API do Pudd.
- Guards e validações de formulário melhoram a navegação e a experiência; autorização e integridade continuam sendo verificadas pela API.
- A interface deve representar carregamento, sucesso, ausência de dados e falha. Erros HTTP devem ser tratados conforme os contratos `ProblemDetails` e `ValidationProblemDetails` da API.
- Posts com imagem e avatares usam `FormData`. O navegador define o `Content-Type` multipart com seu boundary; não definir esse header manualmente.
- Imagens são enviadas à API. A leitura usa as URLs assinadas retornadas por ela, considerando sua expiração.
- Chaves secretas do Supabase, senha do banco e chave de assinatura JWT pertencem exclusivamente ao back-end. Configurações distribuídas ao navegador são públicas.

## Implementação gradual

A tela de login usa duas colunas no desktop: `LoginIntro`, componente de apresentação em `features/auth/components`, compõe mural fotográfico e texto animado à esquerda, e a página mantém o formulário à direita. O intro não chama a API do Pudd. Em larguras até 767 px, o painel lateral e a legenda externa são ocultados; aparece somente o formulário com a assinatura Pudd no topo.

O primeiro fluxo previsto é login → feed → criação de post com texto e imagem. O login chama `POST /api/Auth/login`, envia `{ email, senha }` e apresenta as respostas da API. Após o sucesso, confirma a autenticação na própria tela; o redirecionamento será implementado junto com o feed. Guards e interceptor de token ainda não foram implementados.

O front-end cuida da apresentação, navegação, estado de carregamento e envio/recebimento de dados. Regras de negócio e decisões de autenticação pertencem à API. O formulário usa requisitos básicos do navegador para preenchimento; erros de validação do servidor são apresentados sem reproduzir suas regras no Angular.

Em seguida, evoluir feed, publicação, cadastro, perfil e demais interações conforme a necessidade do produto.

Preferir a estrutura e os recursos já presentes no Angular do projeto. Introduzir bibliotecas e abstrações quando houver uma necessidade concreta; Feature Based não exige reproduzir Clean Architecture no navegador.

## Orientações para futuras consultas e mudanças

- Consultar este arquivo antes de implementar funcionalidades no front-end.
- Colocar novos arquivos na feature responsável e extrair para `shared` apenas o que for realmente reutilizado.
- Registrar mudanças concluídas em `API/docs/ANNOTATIONS.md`, explicar o motivo e revisar sua compatibilidade com esta arquitetura.
- Atualizar esta documentação quando uma decisão arquitetural mudar; distinguir decisões planejadas de funcionalidades implementadas.
- Acessar credenciais locais, incluindo arquivos de User Secrets, somente com autorização explícita do usuário para esse acesso.

O histórico vigente está em [ANNOTATIONS.md](../../API/docs/ANNOTATIONS.md). A arquitetura do servidor está em [ARQUITETURA.md](../../API/docs/ARQUITETURA.md).

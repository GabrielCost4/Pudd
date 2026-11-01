# Análise técnica do Pudd — 12/10/2026

## Parecer

O Pudd tem uma base de MVP consistente. A API demonstra cuidado real com autorização, persistência e falhas de armazenamento. O WEB tem uma organização legível e fluxos principais testados, mas suas ferramentas de qualidade são menos rigorosas do que aparentam, e há fragilidades de estado e navegação. Eu não publicaria a aplicação para uso público sem resolver configuração de produção, proteção contra abuso e as lacunas de integração.

Não encontrei, nos caminhos examinados, uma autorização que confie no ID informado pelo cliente, uma elevação de privilégio via cadastro ou SQL montado por concatenação de entradas. Isso não equivale a uma certificação de segurança.

## Escopo e evidência

- Análise do checkout local, HEAD `bc422bb`, com alterações locais já presentes. A avaliação inclui esses arquivos locais; não foi confirmado que o remoto esteja idêntico. A página do GitHub não pôde ser obtida pelo navegador desta sessão.
- Leitura de controllers, serviços, validators, entidades, repositórios, migrations, autenticação, armazenamento, worker, páginas WEB, configuração, testes e CI.
- Nenhuma alteração no código da aplicação. Este relatório é o único arquivo acrescentado pela análise. Alterações locais existentes foram preservadas.
- Sem acesso aos segredos pessoais, sem teste do Supabase real, sem teste de carga, sem auditoria de segredos em todo o histórico Git e sem consulta de vulnerabilidades das dependências. Não atribuo conclusões a essas áreas.
- Achados de implementação abaixo foram obtidos por leitura do código. Quando o cenário não foi reproduzido dinamicamente, isso está indicado. Os testes existentes foram executados separadamente.

| Verificação | Resultado observado |
| --- | --- |
| Prettier WEB | Passou |
| ESLint WEB | Passou, mas só verifica quatro regras de estilo |
| Build de produção WEB | Passou; pacote inicial 516,86 kB, acima do aviso de 500 kB; transferência estimada 120,67 kB |
| Testes WEB | 80 passaram em 25 arquivos |
| Playwright | 14 passaram; API simulada |
| Testes API usuais | 41 passaram; teste PostgreSQL inicialmente ignorado |
| Teste PostgreSQL isolado | 1 passou: migrations, unicidade de likes concorrentes, conflito de atualização, cascatas e fila de limpeza |

O primeiro build WEB falhou por acesso negado do sandbox; repetido com a permissão adequada, passou. Essa falha inicial não é atribuída à aplicação. O PostgreSQL temporário foi encerrado e removido ao final, sem usar o banco da aplicação.

## Problemas prioritários

### 1. Alta — o artefato WEB de produção continua apontando para localhost

**Evidência:** `WEB/src/app/core/config/api.ts:2`, `WEB/angular.json` e `WEB/proxy.conf.json`.

`API_BASE_URL` é `http://localhost:5193/api`. Não há substituição de arquivo ou configuração de runtime no build de produção. Publicado como está, o navegador de cada usuário tentará acessar a API no computador desse usuário. O proxy do Angular serve não transforma uma URL absoluta em `/api` e não acompanha o site estático publicado.

**Correção:** adotar `/api` com proxy reverso na hospedagem ou configuração explícita por ambiente/runtime. Validar login e upload no artefato publicado sob HTTPS. Documentar CORS, encaminhamento e fallback das rotas SPA.

### 2. Alta — proteção contra abuso concentrada na funcionalidade errada

**Evidência:** `API/Pudd.API/Program.cs:75`, `Controllers/AuthController.cs`, `Controllers/PostLikesController.cs`.

Existe uma política de 30 requisições/minuto para likes. Não existe política equivalente, nem limiter global, para login, cadastro, posts, comentários e uploads. Isso permite repetição de tentativas de senha e consumo não limitado por usuário de BCrypt, escrita no banco e armazenamento. Não houve exploração nem teste de carga; a ausência está demonstrada na configuração da aplicação. Uma eventual proteção externa da hospedagem não foi avaliada.

A mesma política de likes também cobre GET. Como cada PostCard faz um GET, uma página completa com seis posts consome seis permissões antes de qualquer curtida. Cinco carregamentos completos em um minuto podem consumir todas as 30 permissões; a próxima interação recebe 429.

**Correção:** políticas específicas para autenticação, escrita e upload, combinando identidade e IP conforme o endpoint. Separar leituras de likes das mutações. Em múltiplas instâncias, considerar que o contador atual vive em cada processo. Throttling de autenticação é recomendado pela [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### 3. Alta — CI verde não valida o banco real nem a integração completa

**Evidência:** `.github/workflows/ci-pudd.yml`, `.github/workflows/ci-pudd-web.yml`, `API/Pudd.Tests/PostgresTests.cs:15`, `API/Pudd.Tests/ApiTests.cs:159`, `WEB/e2e/api.fixture.ts`.

O workflow API não configura `PUDD_TEST_POSTGRES`, portanto o único teste PostgreSQL é ignorado. Os testes HTTP substituem o banco por EF InMemory e o Storage por fake. O workflow WEB não executa Playwright e não executa `format:check`. Os testes de navegador existentes interceptam a API.

São testes úteis, mas não demonstram que WEB e API funcionam juntos com PostgreSQL e Storage real. Especialmente SQL específico de PostgreSQL, migrations e comportamento relacional precisam de banco real. O teste PostgreSQL passou nesta análise: a lacuna está na garantia contínua do CI.

**Correção:** serviço PostgreSQL descartável no CI, teste relacional obrigatório, Playwright no pipeline e um fluxo de integração WEB → API → PostgreSQL. Supabase pode ter um teste separado de ambiente controlado; não deve ser necessário para toda unidade de teste.

### 4. Alta para manutenção — TypeScript e lint não impõem o rigor esperado

**Evidência:** `WEB/tsconfig.json`, `WEB/tsconfig.app.json`, `WEB/eslint.config.mjs:9`.

Não há `strict: true` nem `strictTemplates: true`. `strictInjectionParameters` e `strictInputAccessModifiers` não substituem essas opções. O ESLint configura somente indentação, tabs, espaços finais e newline final; não habilita regras recomendadas de TypeScript ou Angular, nem análise de templates.

Isso não prova que o código esteja errado, mas reduz muito a capacidade de impedir novos erros, particularmente em código gerado. Lint passar atualmente diz pouco sobre qualidade semântica. A documentação do [TypeScript](https://www.typescriptlang.org/tsconfig/strict.html) descreve as verificações adicionais de strict.

**Correção:** habilitar strict e strictTemplates progressivamente, regras de TypeScript com informação de tipos e regras de Angular/templates. Resolver os erros encontrados sem silenciar tudo com casts ou non-null assertions.

### 5. Média — editor pode continuar ligado à publicação anterior

**Evidência:** `WEB/src/app/features/posts/pages/editor/post-editor.ts:45` e `:59`.

O ID da rota é capturado por snapshot uma única vez e a carga ocorre apenas em `ngOnInit`. Ao navegar de `/posts/A/edit` para `/posts/B/edit` reutilizando a mesma configuração de rota, o componente pode conservar o ID A e seu formulário, apesar de a URL indicar B. O input `postId` também muda o getter usado no save sem disparar nova carga do formulário.

O comportamento padrão de reutilização foi conferido no pacote Angular instalado: `shouldReuseRoute` compara `future.routeConfig === curr.routeConfig`. O cenário específico não foi reproduzido no navegador nesta análise; a incompatibilidade entre código e ciclo de vida está presente. Referência: [Angular Router](https://angular.dev/guide/routing/customizing-route-behavior).

**Correção:** observar paramMap e input de ID, cancelar cargas antigas com switchMap, limpar formulário/imagem e carregar o novo recurso. Testar A → B, histórico do navegador e mudança de input.

### 6. Média — resposta atrasada pode substituir o perfil exibido

**Evidência:** `WEB/src/app/features/profile/pages/profile/profile.ts:132`, `:145`, `:153` e `:197`.

As leituras acompanham paramMap com switchMap, mas save/upload/remove só são cancelados na destruição. Navegar de um perfil para outro reutiliza ProfilePage. Se um save de `/users/me` terminar depois da carga do perfil B, seu callback chama `setProfile` com o próprio perfil e substitui B na tela. Upload e remoção também alteram o perfil que estiver atualmente no signal.

Trata-se de um cenário inferido do fluxo assíncrono, não reproduzido dinamicamente. A API continua operando sobre `/me`; o risco identificado é corrupção do estado exibido, não alteração do perfil de terceiros no banco.

**Correção:** vincular o callback ao ID/geração da operação e impedir que uma resposta antiga altere a nova página. Cancelar a observação não desfaz uma escrita já enviada ao servidor.

### 7. Média — e-mail não tem uma identidade normalizada

**Evidência:** `RegisterService.cs:25` e `:41`, `AuthService.cs:23`, `UserRepository.ObterPorEmail`, índice único em `PuddDbContext.cs:34`.

Cadastro grava o e-mail recebido e login compara igualdade direta. Não há política de normalização. Na coluna text com igualdade padrão do PostgreSQL, diferenças de caixa podem permitir contas distintas para variantes que o produto deveria tratar como a mesma identidade. Espaços e formas alternativas de entrada também não têm tratamento explícito consistente.

**Correção:** definir a política de identidade, manter e-mail original para exibição se necessário, adicionar valor normalizado com unicidade no banco e usar o mesmo valor no login. Auditar colisões antes da migration. Não assumir que só uma consulta prévia resolve concorrência: manter a constraint única.

### 8. Média — concorrência do banco não cobre formulários desatualizados

**Evidência:** `PostService.cs:82` e `:94`, `PuddDbContext.cs:30`, contratos `UpdatePostRequest`/`UpdatePostForm`.

O token UpdatedAt detecta duas requisições que leram a mesma versão antes de salvar. Isso é bom e passou no teste PostgreSQL. Entretanto, o cliente não envia a versão que viu ao abrir o formulário.

Exemplo: abas A e B abrem o mesmo texto; A salva; B salva depois. A requisição de B lê a versão atual no servidor e grava o texto antigo de B sobre ela sem conflito. Esse cenário é inferido do contrato e da ordem das operações; não foi reproduzido por teste específico.

**Correção:** enviar versão esperada ou ETag/If-Match e devolver conflito quando a versão do formulário já estiver desatualizada. Exibir opções de recarregar ou recuperar o texto digitado.

## Outros pontos fracos relevantes

### Performance do feed e das consultas

Cada página usa seis posts (`PostService` WEB). Para seis posts com imagem, o fluxo gera uma leitura de feed, seis GETs de likes e seis GETs de URL: **13 requisições à API**, além das imagens. Há ainda renovação de URLs em aproximadamente 285 segundos por card, mesmo sem checagem de visibilidade.

No servidor, cada chamada autenticada consulta o usuário em OnTokenValidated e novamente em AccountAccess. Likes ainda consultam o post, existência da curtida e contagem. O custo cresce em várias dimensões ao mesmo tempo. Essa contagem é derivada do código; não foi feito benchmark.

Os repositories carregam User inteiro com Include, inclusive campos desnecessários para montar respostas do feed. Os DTOs não expõem PasswordHash, mas transportar essas colunas internamente aumenta custo e amplia sua presença na memória.

O feed ordena por CreatedAt/ID sem índice correspondente; a consulta por autor e os comentários também não têm índices compostos correspondentes à filtragem e ordenação. A paginação usa OFFSET, que fica mais cara em páginas profundas e pode repetir/pular itens quando novas publicações entram entre consultas.

**Ação:** devolver liked/count no DTO do feed, projetar colunas necessárias, analisar planos EXPLAIN antes de adicionar índices e avaliar cursor para o feed. Consolidar a leitura do ator por requisição preservando a checagem de bloqueio. Renovar imagens conforme visibilidade/necessidade. Não há justificativa demonstrada para microserviços ou cache distribuído agora.

### Imagens: validação parcial e limites de recursos

`ImageFileValidation` confere tamanho, ContentType e bytes iniciais. Um arquivo apenas com assinatura PNG/JPEG pode passar sem ser uma imagem decodificável. Não há limite de dimensões, reencodificação, remoção de metadados ou geração de miniaturas. Os 5 MB limitam bytes enviados, não dimensões nem custo de renderização. Não foi demonstrada execução de script via upload.

**Ação:** decodificar com limites de pixels/memória, validar formato efetivo, reencodar e gerar versões adequadas para feed/avatar. Considerar privacidade de metadados e rejeitar arquivos truncados.

### Estado, validação e experiência

- Posts, perfil e comentários não têm validadores reativos equivalentes aos limites da API. required nativo não cobre espaços em branco nem limites de caracteres. Cadastro WEB não antecipa toda a política de senha da API. Isso gera idas desnecessárias ao servidor e feedback tardio.
- Não há proteção contra sair de formulários com alterações não salvas. Expiração de sessão redireciona e pode perder texto em edição. Isso merece prioridade maior que ajustes decorativos.
- O token apenas em memória reduz persistência de credenciais no navegador, mas cada reload perde a sessão. É uma decisão explícita, não um bug automaticamente. Para uma rede social, precisa ser validada como escolha de produto.
- Logout limpa o token local, mas não o revoga no servidor. Um token copiado continua válido até expirar, salvo bloqueio da conta. Avaliar sessão revogável conforme o requisito; não transformar isso sozinho em uma vulnerabilidade crítica.
- `Comments.submit` recarrega a primeira página após inserir, mas a API ordena comentários do mais antigo para o mais novo. Com mais de uma página, o comentário recém-criado pode ficar fora da página exibida. Cenário derivado do código, não coberto pelos testes executados.
- Não há timeout explícito em vários GETs/mutações dos services WEB. Há timeout no feed e no upload, mas a política é inconsistente. Padronizar conforme custo e tratar resultados incertos de escritas sem repetir cegamente.
- Build inicial 516,86 kB não é, sozinho, um problema grave de performance: a estimativa transferida é 120,67 kB. O chunk lazy de administração tem 487,93 kB; medir tempo de parsing e interação em dispositivos modestos antes de concluir que a biblioteca deve ser removida.

### Operação e manutenção

- Não há trilha persistente de auditoria das decisões de moderação examinadas: quem bloqueou/removeu, motivo e quando. Há ação destrutiva sem registro de negócio adequado para investigar disputas.
- A fila de exclusões tem retries persistentes, mas sem limite terminal/dead letter, alerta de envelhecimento ou mecanismo de claim/lease para múltiplos workers. Duas instâncias podem processar o mesmo lote. A exclusão é idempotente, reduzindo dano; permanece custo duplicado e dificuldade operacional.
- Logs têm tipos, stack e traceId, mas não há health/readiness endpoints, métricas ou tracing definidos no código examinado. Backup/restore, alertas e configuração da hospedagem não foram verificados.
- Validação de configuração é parcial: JWT ausente falha cedo, mas string de conexão vazia passa na checagem de null; não há Options tipadas com ValidateOnStart para garantir todo o conjunto necessário por ambiente.
- CancellationToken não atravessa a maioria dos serviços/repositories de banco. Requisições abandonadas podem continuar consumindo recursos. Propagar cancelamento sem cancelar as compensações duráveis que precisam sobreviver à requisição.
- `WEB/README.md` diz que o feed não está implementado, apesar de existir, e descreve proxy `/api` enquanto os services usam URL absoluta. A orientação de e2e também está desatualizada. README da API melhora a reprodução local, mas está entre os arquivos não versionados do checkout analisado.
- Falta um teste que compare os contratos WEB/API automaticamente. DTOs de TypeScript e C# são mantidos separadamente; fixtures podem continuar verdes depois de um contrato real mudar.
- Ausência de recuperação de senha, troca de senha, verificação de e-mail e exclusão de conta limita o ciclo de vida de uma conta pública. São lacunas de produto/ operação, não defeitos de sintaxe.

## Pontos fortes

1. **Autorização centralizada e aplicada na API.** ActorId vem de claim do JWT validado. Services verificam usuário ativo, autoria e role atual no banco. Cadastro define User no servidor. Guard do WEB não é tratado como fronteira de segurança.
2. **Bloqueio afeta tokens já emitidos.** OnTokenValidated consulta a conta; um JWT ainda dentro da validade não basta para uma conta bloqueada. É um compromisso consciente entre segurança e custo de leitura.
3. **Persistência protege invariantes essenciais.** E-mail único, par user/post único para likes, FKs e cascatas. ON CONFLICT parametrizado torna curtidas repetidas/concomitantes seguras. O teste PostgreSQL confirmou essas garantias cobertas.
4. **Limpeza de imagens foi pensada para falhas.** Nome novo por upload; mudança de referência e enqueue de limpeza na mesma transação; compensação de upload que falhou ao persistir; retries duráveis com contexto separado. Esse desenho é um dos melhores pontos da API.
5. **Respostas preservam a fronteira de dados.** Perfis não devolvem e-mail ou hash; respostas usam contratos próprios; erros do fornecedor não são repassados ao cliente; traceId permite correlacionar incidentes.
6. **WEB tem estrutura compreensível.** Features, serviços HTTP separados, estado de sessão/tema centralizado, rotas lazy, HTML/CSS separados e imports locais de PrimeNG. Não há motivo técnico encontrado para reescrever o frontend inteiro.
7. **Há cuidado com ciclo de vida.** takeUntilDestroyed, cleanup de effects, switchMap em diversas leituras, liberação de object URLs e listeners. As falhas identificadas são inconsistências localizadas no tratamento de mudanças de recurso.
8. **Acessibilidade tem trabalho real.** Labels, descrições de erro, aria de controles, foco visível, skip link, redução de movimento, restauração de foco no modal e cenários de viewport no Playwright. Não houve auditoria completa com leitor de tela/contraste; não afirmo conformidade integral.
9. **Testes não cobrem só resultados felizes.** Há autoria indevida, contas bloqueadas, falhas do Storage/banco, compensação, validação e moderação. Os 80 testes WEB, 14 de navegador e testes API executados passaram.
10. **Complexidade arquitetural compatível com MVP.** API em camadas, interfaces para fronteiras e monólito modular são adequados à escala demonstrada. Entidades são essencialmente modelos de dados, e regras vivem em serviços; chamar isso de DDD completo seria exagero, mas não é necessário para o produto atual.

## Ordem recomendada de trabalho

1. Corrigir URL/configuração de produção e provar um fluxo real publicado sob HTTPS.
2. Proteger autenticação e escritas; separar leitura de likes de seu limite de mutação.
3. Tornar PostgreSQL e Playwright obrigatórios no CI e adicionar integração real WEB/API.
4. Ativar strict, strictTemplates e lint semântico, em mudanças pequenas e revisáveis.
5. Corrigir identidade do editor e respostas atrasadas do perfil; testar navegação sob latência.
6. Normalizar e-mail com migration segura e transmitir versão esperada nas edições.
7. Reduzir fan-out do feed, validar imagens por decodificação e melhorar feedback dos formulários.
8. Completar ciclo de conta, auditoria de moderação e observabilidade; provar restore de backup antes de depender de produção.

O maior risco do WEB feito com IA é a confiança em código que parece organizado, mas cujas ferramentas e testes ainda não verificam os casos de mudança de rota, latência e integração. O maior risco da API é confundir boas regras internas com preparo operacional para exposição pública. Ambos podem ser corrigidos evoluindo a base atual.

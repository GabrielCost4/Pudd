# WEB

## Arquitetura do Pudd

O front-end adota Feature Based. Consulte [docs/ARQUITETURA.md](docs/ARQUITETURA.md) para a organização por funcionalidades, responsabilidades e integração com a API.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Login do Pudd

Execute `npm start` na pasta `WEB` e abra `http://localhost:4200/login`. Para autenticar, mantenha a API em execução em `http://localhost:5193`; `proxy.conf.json` encaminha as requisições `/api` para ela.

A tela envia e-mail e senha à API e apresenta seu resultado. O token fica apenas em memória e a sessão local é perdida ao recarregar. O feed ainda não está implementado, portanto o sucesso é confirmado na tela de login. Em produção, o encaminhamento `/api` precisa ser configurado no servidor que hospeda o frontend.

## Formatação

O Prettier usa as regras de `.prettierrc` e `.editorconfig`. As configurações locais do VS Code selecionam a extensão `esbenp.prettier-vscode` e habilitam a formatação ao salvar para TypeScript, HTML, CSS e JSON, tanto ao abrir a raiz Pudd quanto apenas WEB.

Para formatar os arquivos de `src` pelo terminal, execute `npm run format` dentro de WEB. Para apenas conferir a formatação, execute `npm run format:check`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

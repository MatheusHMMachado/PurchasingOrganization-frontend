# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## PWA e modo offline

O app é instalável (manifesto + service worker via `vite-plugin-pwa`) e funciona sem conexão:

- **Leituras** (`GET /api/*`): rede primeiro; sem conexão ou com o backend fora do ar, o service worker devolve a última resposta salva e o app mostra a barra "exibindo os últimos dados salvos".
- **Escritas**: sem conexão, vão para uma fila no IndexedDB (`src/offline/`) e aparecem na tela como "Pendente de envio". A fila é enviada em ordem quando a conexão volta (evento `online`, ao reabrir o app, a cada 30 s ou em "Sincronizar agora"). Registros criados offline usam ids temporários negativos, trocados pelo id real na sincronização.
- **Conflitos**: escritas recusadas pelo servidor (ex.: item excluído em outro dispositivo) vão para "falharam", onde podem ser reenviadas ou descartadas.
- **Compartilhar** (Android): o app aparece em *Compartilhar*; o link chega em `/share`, onde se escolhe o item e registra a promoção.

Testar o PWA (o service worker fica desligado no `npm run dev`):

```bash
npm run build
npm run preview   # http://localhost:4173
```

Regenerar os ícones a partir de `public/logo.svg`: `npm run generate-pwa-assets`.

> Em produção o PWA exige HTTPS. Recomenda-se servir a API na mesma origem (`VITE_API_URL=/api` atrás de um proxy reverso); o `vite.config.ts` já faz esse proxy para `localhost:8080` em `dev` e `preview`.

## Deploy (Railway)

Este repositório vira o serviço **frontend** do projeto no Railway: o `Dockerfile` faz o build do PWA, e o Caddy (`Caddyfile`) serve os arquivos e repassa `/api/*` ao backend pela rede privada. O backend não tem domínio público.

Variáveis do serviço:

| Variável | Valor |
|---|---|
| `PORT` | `8080` |
| `BACKEND_URL` | `http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}` |
| `INTERNAL_TOKEN` | `${{shared.INTERNAL_TOKEN}}` |

O passo a passo completo (projeto, banco, token e verificação) está em `DEPLOY.md`, no repositório **PurchasingOrganization-backend**.

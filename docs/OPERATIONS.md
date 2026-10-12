# Fotoflow — Runbook de Operações e Segurança

Documento vivo com o estado atual dos controles operacionais e o que fazer em
cada situação. Complementa o `README.md` (convenções de código).

Stack: Vite + React 19 + React Router 7 + Tailwind v4 + shadcn/ui + Convex
(banco e funções) + Convex Auth (OTP por e-mail e sessão anônima).

## 1. Variáveis de ambiente

Frontend (bundle, só valores públicos):

- `VITE_CONVEX_URL` — URL do deployment Convex.
- `VITE_VLY_APP_ID`, `VITE_VLY_MONITORING_URL` — habilitam o envio de erros do
  `src/instrumentation.tsx` para o monitoramento. Sem elas, o error tracking
  fica inerte (nenhum erro vai embora).

Backend (só em `process.env` no servidor Convex):

- `OTP_EMAIL_API_KEY` — chave do relay de e-mail do código de acesso.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — integração Google Calendar.
- `VLY_APP_NAME` — nome exibido no e-mail.
- `JWKS`, `JWT_PRIVATE_KEY`, `SITE_URL`, `CONVEX_SITE_URL` — auth.

Nunca colocar segredos em variáveis `VITE_*`: elas são embutidas no bundle
público. Gerencie os valores na aba **Keys/API keys** do projeto.

## 2. Backup e restauração

O Convex guarda os dados; não há backup automático configurado. Faça snapshots
periódicos com a CLI:

```bash
# Exportação completa (dados + storage) para um arquivo ZIP datado
bunx convex export --include-file-storage --path "backups/fotoflow-$(date +%Y%m%d-%H%M).zip"

# Produção
bunx convex export --prod --include-file-storage --path backups/fotoflow-prod.zip
```

Restauração (sobrescreve os documentos com os `_id` do snapshot):

```bash
bunx convex import --replace-all backups/fotoflow-YYYYMMDD-HHMM.zip
```

Recomendação: rodar a exportação diária e manter ao menos 7 dias de retenção em
armazenamento externo ao deployment (S3, Google Drive ou disco local).

O script `scripts/backup.sh` automatiza tudo isso (export + rotação + upload
offsite opcional via rclone). Agende no cron da máquina que tiver as
credenciais do projeto:

```bash
0 3 * * * cd /caminho/do/projeto && ./scripts/backup.sh --prod >> backups/backup.log 2>&1
```

## 3. Plano de recuperação

- **Perda de dados (deleção acidental):** restaurar o último snapshot com
  `convex import`. Sessões/clientes excluídos voltam ao estado do snapshot.
- **Deployment indisponível:** recriar um deployment Convex e reimportar o
  snapshot mais recente; reconfigurar as variáveis de ambiente da seção 1.
- **Vazamento de credencial de integração:** rotacionar a chave na aba Keys e
  revogar o acesso correspondente no provedor (Google/e-mail).
- **Objetivos sugeridos:** RPO de 24h (frequência do backup), RTO de ~1h
  (tempo para recriar deployment e importar).

## 4. Monitoramento, alertas e error tracking

- **Error tracking:** `src/instrumentation.tsx` está montado no topo da árvore
  em `src/main.tsx` (dentro de `InstrumentationProvider`). Ele captura erros de
  render, `window.onerror` e `unhandledrejection` e os envia para
  `VITE_VLY_MONITORING_URL`. Requer essas variáveis configuradas.
- **Logs de servidor:** as funções Convex registram falhas com `console.error`
  (ex.: envio de OTP, callback do Google). Consulte a aba **Logs** do dashboard
  do Convex para o deployment.
- **Alertas:** dependem do backend de monitoramento que consumir
  `VITE_VLY_MONITORING_URL`. Configure limiares (taxa de erro, falhas de envio
  de OTP) diretamente nele. Ainda não há alerta nativo dentro do código.

## 5. Logs e trilha de auditoria

Trilha de auditoria implementada: as mutations de clientes e sessões gravam em
`auditLogs` (ver `src/convex/auditLogs.ts`) o `userId`, a ação (`client.create`,
`session.update_status`, `session.delete`, etc.), a entidade, o `_id` e um
resumo (nome/título) — na mesma transação da alteração. Os registros são
privados por usuário e legíveis via `api.auditLogs.listMine` (últimos 100).

Logs de servidor continuam via `console.error` no dashboard do Convex. Não há
interface de tela para a trilha ainda — se necessário, renderizar `listMine`.

## 6. Headers de segurança

CSP/HSTS/X-Frame-Options são definidos pela camada de hospedagem (proxy/CDN),
não pelo Vite. Configs prontas já estão no repositório:

- `public/_headers` — formato Netlify/Cloudflare Pages, copiado pelo Vite para
  a raiz do build. Basta fazer o deploy.
- `vercel.json` — mesmos headers no formato da Vercel.
- `index.html` — `<meta name="referrer">` cobre a política de referrer mesmo
  sem headers no host.
- `src/convex/http.ts` — o callback OAuth já envia `no-store`, `nosniff` e
  `Referrer-Policy` nas próprias respostas.

A CSP mantém `'unsafe-inline'` em script/style para o tooling do Vite e o
Tailwind seguirem funcionando; o endurecimento efetivo está em `connect-src`,
`object-src`, `base-uri` e `frame-ancestors`. Endureça `script-src` quando o
build não precisar mais do preamble inline de dev.

Referência (caso o host seja outro):

```
Content-Security-Policy:
  default-src 'self';
  connect-src 'self' https://*.convex.cloud https://*.convex.site;
  img-src 'self' data: https:;
  style-src 'self' 'unsafe-inline';
  script-src 'self';
  frame-ancestors 'none';
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

Ajuste `connect-src` ao domínio real do Convex. O callback OAuth em
`src/convex/http.ts` já envia `Cache-Control: no-store` e redireciona para um
caminho fixo (sem open redirect).

## 7. Rate limiting

- **Verificação de OTP:** 10 falhas/hora por identificador (nativo do
  `@convex-dev/auth` via tabela `authRateLimits`).
- **Envio de OTP:** limitado por `src/convex/otpRateLimit.ts` — 3 envios/15 min
  por e-mail e 100 envios/hora no total, gravados em `otpSendRateLimits`.
- **OAuth state:** um único state em aberto por usuário (índice `by_user`),
  consumido uma vez e expirando em 15 min.

## 8. Dependências

```bash
bun audit          # vulnerabilidades conhecidas
bun update         # atualiza dentro das faixas semver
```

Política: tratar vulnerabilidades críticas/altas de runtime como bloqueantes;
as que só afetam tooling de lint/desenvolvimento podem aguardar o upstream.
Hoje restam advisories de `brace-expansion` (DoS em tempo de lint, transitivo de
eslint/typescript-eslint), sem impacto no runtime.

## 9. Testes automatizados

```bash
bun run test        # Vitest, arquivos src/**/*.test.ts
```

Cobrem a lógica pura de `src/lib` (guard de formula-injection do CSV, parsing de
valores, cálculo de saldo). Adicione casos ao mexer nessas funções.

## 10. Teste mobile (QA manual)

Não há device real conectado a este ambiente, então a verificação é manual.
Checklist por fluxo (landing, `/auth`, dashboard, planilhas, modais) em
**iPhone SE (375px)** e **Pixel 7 (412px)**, ou DevTools em modo device:

- [ ] Layout sem scroll horizontal; tabelas rolam dentro do container.
- [ ] Teclado numérico/emails abre o tipo certo (`inputMode`), sem zoom
      automático (font-size >= 16px nos inputs).
- [ ] Botões/linhas com altura de toque >= 44px e `cursor-pointer`.
- [ ] Modais abrem com scroll interno e fecham pelo overlay/gesto.
- [ ] Toasts aparecem acima da safe-area (notch).
- [ ] Login por OTP completo no celular, incluindo o retorno do OAuth do
      Google Calendar no navegador mobile.
- [ ] Dark mode e modo claro sem contraste quebrado.

## 11. Teste de carga básico

```bash
bun scripts/load-test.ts https://seu-app.exemplo.com/ 15 20
#      alvo                         duracao concorrencia
```

Sem dependências: mede rps e percentis (p50/p90/p95/p99) e sai com código 2 se
houver 5xx/falhas de rede. Rode só contra staging ou a sua produção, em horário
de baixo tráfego. Critério de aceite sugerido: p95 < 1s e zero 5xx com
concorrência 20 por 60s.

## 12. LGPD, Privacidade e Termos

Páginas públicas: `/privacidade` e `/termos`, linkadas no rodapé da landing.
**Ação pendente:** revisar com apoio jurídico e preencher os dados do
controlador (razão social, CNPJ e e-mail do encarregado). O texto já cobre
dados tratados, base legal, compartilhamento com operadores e direitos do
titular (LGPD art. 18).

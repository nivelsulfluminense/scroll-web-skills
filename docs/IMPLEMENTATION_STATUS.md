# Estado de implementação

Especificação não é código rodando. Esta tabela separa os dois. `scripts/lint-skill.mjs` falha se
um arquivo marcado como implementado ou testado não existir.

Legenda: **tested** = implementado e coberto por teste automático executado; **implemented** = código
existe e foi executado manualmente, sem teste automático dedicado; **template** = arquivo de partida,
não executado contra um serviço real; **spec** = só descrito nas referências.

| Arquivo | Estado | Evidência |
|---|---|---|
| `engine/core/math.ts` | tested | 21 testes unitários (`npm test`) |
| `engine/core/scroll-stage.ts` | tested | qa-audit no demo estático, Chromium, desktop e mobile, movimento reduzido e sem JS |
| `engine/core/frame-source.ts` | tested | idem; carregamento progressivo e 404 detectados no teste de mutação |
| `engine/core/manifest.ts` | tested | teste unitário |
| `engine/react/ScrollCanvasStage.tsx` | tested | qa-audit no demo React (`examples/react-demo`), 0 falhas |
| `engine/css/stage.css` | tested | checagens de movimento reduzido e sem JS do qa-audit |
| `scripts/qa-audit.ts` | tested | rodado no demo (0 falhas) e numa cópia quebrada de propósito (detectou 404, legenda invisível, contraste, overflow, ausência de h1 sem JS, scroll morto) |
| `scripts/process-media.sh` | implemented | modos `frames`, `video`, `poster`, `seams`, `demo` executados; GOP 8 e ausência de B-frames e áudio conferidos com ffprobe |
| `scripts/to-webp.mjs` | implemented | caminho de fallback executado com sharp |
| `scripts/serve.mjs` | implemented | usado por todas as execuções do qa-audit |
| `scripts/doctor.mjs` | implemented | executado |
| `scripts/lint-skill.mjs` | implemented | executado |
| `bin/cli.mjs` | tested | executado via `npx git+file://` (mesmo caminho do `npx github:`) com HOME temporário: `install --agent all`, `--project`, `--force`, `where`, `uninstall`, `init` em projeto estático e Lovable, `--dry-run`. O teste revelou e corrigiu um bug em que a cópia saía vazia quando rodada pelo npx |
| `dist/tk-stage.js` | tested | bundle versionado do motor; o CI falha se divergir do código-fonte |
| `.github/workflows/qa-audit.yml` | template | não executado no GitHub Actions |
| `targets/lovable/supabase/migrations/20261108000000_leads.sql` | tested | aplicado duas vezes (idempotente) num Postgres local com papéis `anon`/`authenticated` simulados: anon não insere nem lê; consentimento e e-mail inválido rejeitados pelo banco. Não aplicado a um projeto Supabase real |
| `targets/lovable/supabase/functions/submit-lead/index.ts` | tested | tipos conferidos com tsc contra um shim mínimo de Deno; handler exercitado com `fetch` simulado: válido → 200, sem consentimento → 422, e-mail inválido → 422, honeypot → 200 sem gravar, origem estranha → 403, 6º envio do mesmo IP → 429. Não implantado num Supabase real |

## Não validado nesta versão

- **WebKit:** o navegador não estava instalado no ambiente de construção. O qa-audit suporta (`--browsers webkit`); rode antes de confiar no Safari.
- **Aparelho físico:** nenhum. Emulação não reproduz decodificador, Low Power Mode nem inércia de toque do iPhone.
- **`npx skills add`:** compatível segundo a documentação do CLI (aceita `SKILL.md` na raiz), mas não executado: o ambiente bloqueou rodar o pacote externo.
- **Projeto Lovable real:** zonas de sincronização e prompts vêm da skill de origem, sem teste nesta sessão.

## Planejado (spec)

| Capacidade | Onde está descrita | Observação |
|---|---|---|
| Fonte de vídeo para o palco (scrub de MP4) | references/04-engine.md | o pipeline já gera o MP4; falta `VideoSource` com seek controlado |
| Cena em camadas com profundidade (`depth-parallax`) | references/05-motion-kit.md | Depth Anything V2 Small via Transformers.js |
| Tipografia presa a superfícies do filme (`surface-type`) | references/05-motion-kit.md | rastreamento de superfície por quadro |
| Adaptadores de provedor de mídia | references/03-media.md | contrato definido; nenhum adaptador escrito |
| `typesync` (verificar texto sincronizado ao filme) | references/08-qa.md | hoje é revisão humana |

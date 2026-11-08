# 10K Unified Web Skill

Skill e harness para agentes de IA construírem sites cinematográficos guiados por scroll, do briefing à entrega,
unificando o melhor de seis projetos abertos sem contradições entre eles.

- **Para o agente:** [SKILL.md](SKILL.md) (roteiro) e [AGENTS.md](AGENTS.md) (o que pode, o que pergunta, o que nunca faz).
- **Para você:** [docs/DECISIONS.md](docs/DECISIONS.md) (conflitos resolvidos e lacunas fechadas),
  [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) (o que roda e o que é só especificação),
  [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md) (fontes e licenças).

## Estrutura

```
10k-unified-web-skill/
├── SKILL.md                     roteiro em 10 fases; entra no contexto do agente
├── AGENTS.md                    contrato: LIVRE / PERGUNTE / PROIBIDO, zonas de arquivo, portões
├── CLAUDE.md                    configuração por projeto (alvo, backend, yolo off) + atalhos
├── bin/cli.mjs                  instalador npx sem dependências: install, init, where, uninstall, doctor
├── dist/tk-stage.js|css         motor pré-compilado para sites estáticos (versionado)
├── references/                  uma por fase, lida só quando a fase chega
│   ├── 00-intake.md             modos, nível de produção, as 8 perguntas
│   ├── 01-story.md              pesquisa, jornada, curva de sensação, pico, pausas
│   ├── 02-design.md             gramáticas, assinatura, impressão digital, Style Tile
│   ├── 03-media.md              contrato de provedor, continuidade, junções, quadros × vídeo
│   ├── 04-engine.md             API e contrato de markup do motor
│   ├── 05-motion-kit.md         dispositivos, Kinesis, herói em camadas, planejados
│   ├── 06-mobile.md             recorte × retrato, composição, peso
│   ├── 07-targets.md            static, React/TanStack, Lovable + Supabase
│   ├── 08-qa.md                 auditoria, olhar, checklist /80
│   └── 09-launch.md             publicação e entrega ao cliente
├── templates/                   BRIEF, VISUAL_STORY, FINGERPRINTS, plan
├── prompts/                     prompts para agentes sem suporte a skills
├── engine/
│   ├── core/                    motor agnóstico (TypeScript): palco, fonte de quadros, matemática
│   ├── react/ScrollCanvasStage.tsx   adaptador React, seguro para SSR
│   └── css/stage.css            só estrutura: fixação, estados reduzido / sem JS / erro
├── scripts/
│   ├── doctor.mjs               pré-checagem do ambiente
│   ├── process-media.sh         quadros WebP + manifesto, vídeo de scrub, pôster, junções, demo
│   ├── qa-audit.ts              auditoria em Chromium/WebKit, desktop e mobile
│   ├── serve.mjs                servidor local com Range
│   ├── to-webp.mjs              WebP via sharp quando o ffmpeg não tem libwebp
│   └── lint-skill.mjs           valida o próprio pacote (links, afiliados, status)
├── targets/lovable/supabase/    migração de leads com RLS + Edge Function submit-lead
├── examples/static-demo/        demo do motor com filme sintético (sem custo)
├── examples/react-demo/         o mesmo palco via ScrollCanvasStage
├── tests/unit/                  testes da matemática do motor
└── .github/workflows/qa-audit.yml
```

## Começar

```bash
npm ci
node scripts/doctor.mjs
npx playwright install chromium webkit
npm test && npm run typecheck && npm run skill:lint
npm run build:engine && cp dist/tk-stage.* examples/static-demo/
npm run demo:media                      # gera um filme sintético de 120 quadros
npm run demo:serve &                    # http://127.0.0.1:4600
node scripts/qa-audit.ts --url http://127.0.0.1:4600 --browsers chromium,webkit
```

## Instalar

Substitua `OWNER` pelo seu usuário ou organização no GitHub. Requer Node 18+ e git; as ferramentas da skill pedem Node 22.18+.

```bash
# Claude Code, global (padrão)
npx github:OWNER/10k-unified-web-skill install

# todos os agentes: Claude Code, Codex, Cursor, Gemini CLI, OpenCode
npx github:OWNER/10k-unified-web-skill install --agent all

# só neste projeto (.claude/skills e .agents/skills)
npx github:OWNER/10k-unified-web-skill install --agent claude,codex --project

# preparar um projeto de site: AGENTS.md, CLAUDE.md, .10k/, motor, (Lovable: supabase/)
npx github:OWNER/10k-unified-web-skill init                 # detecta static | react | lovable
npx github:OWNER/10k-unified-web-skill init --target lovable

# atualizar, conferir, remover
npx github:OWNER/10k-unified-web-skill install --force
npx github:OWNER/10k-unified-web-skill where --agent all
npx github:OWNER/10k-unified-web-skill uninstall --agent all
```

Toda operação aceita `--dry-run`. O `init` nunca sobrescreve arquivo existente sem `--force`
(um `CLAUDE.md` seu é mantido).

Alternativa pelo instalador aberto de skills (Node 22.20+): `npx skills add OWNER/10k-unified-web-skill`.
Ele copia o repositório inteiro, inclusive testes e evidências; o CLI acima copia só o que o agente usa.

**claude.ai:** compacte a pasta instalada (`~/.claude/skills/10k-unified-web-skill`) e envie em
Configurações → Capabilities → Skills.

Publicar no npm (opcional) permite `npx 10k-unified-web-skill install`: `npm publish` a partir da raiz.
Confira antes com `npm pack --dry-run` o que vai no pacote.

## Requisitos

Node 22.18+ (roda `.ts` nativamente), ffmpeg completo, Playwright com Chromium (WebKit fortemente recomendado).
Gerador de mídia só se for gerar: um build com fotos e vídeos do cliente não gasta nada.

## Licença

MIT. Ver [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md) para o que veio de cada fonte e sob quais termos.

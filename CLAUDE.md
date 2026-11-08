# CLAUDE.md

Leia [AGENTS.md](AGENTS.md) antes de qualquer ação: é o contrato do que pode, do que precisa de aprovação e do que é proibido.
O roteiro de trabalho está em [SKILL.md](SKILL.md).

## Configuração do projeto (edite ao instalar em um projeto)

```yaml
target: static            # static | react | lovable
lovable_architecture: auto  # auto | vite-spa | tanstack-start  (auto = detectar pelo package.json)
backend: none             # none | lovable-cloud | own-supabase | form-service
yolo_mode: off            # automação de deploy pelo navegador; só ligue com pedido explícito
production_level: studio  # focused | studio | max
media_provider: none      # none | openart | higgsfield | kie | other  (none = só mídia do cliente)
```

## Comandos

```bash
node scripts/doctor.mjs
bash scripts/process-media.sh frames public/film/lg media/approved/*.mp4
TK_PRESET=mobile bash scripts/process-media.sh frames public/film/sm media/approved-portrait/*.mp4
node scripts/qa-audit.ts --url http://127.0.0.1:4600 --browsers chromium,webkit
```

## Lovable

- Só `main` sincroniza. Push em `main` publica o front-end: peça aprovação (AGENTS.md §1).
- Migração e Edge Function: escreva o arquivo, depois entregue o prompt exato no formato abaixo e espere o usuário rodar.

```
📋 LOVABLE PROMPT:
> "Apply pending Supabase migrations"
```

Detalhes e detecção de arquitetura em [references/07-targets.md](references/07-targets.md).

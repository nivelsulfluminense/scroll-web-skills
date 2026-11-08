# 07 · Alvos de construção e backend

O motor é o mesmo nos três alvos. Muda onde os arquivos ficam e como o backend é implantado.

| Alvo | Quando | Estrutura |
|---|---|---|
| `static` (padrão) | landing de marca, sem login, hospedagem simples | `site/` com HTML, CSS, JS e assets; nada de build dentro de `site/` |
| `react` | o cliente já tem app React/Next/TanStack | componente `ScrollCanvasStage` em `src/lib/tk-stage/` |
| `lovable` | o projeto vive no Lovable com sincronização GitHub | idem `react`, mais as regras abaixo |

## Static

```
projeto/
  site/                 a única pasta que vai ao ar
    index.html  style.css  tk-stage.js  tk-stage.css
    film/lg/  film/sm/  film/poster.webp
  media/                masters, aprovados, rejeitados (nunca no ar)
  .10k/                 BRIEF.md, VISUAL_STORY.md, plan.md, research.md
  qa-report/            saída do qa-audit (nunca no ar)
```

Formulário: link `mailto:`, link de agenda que o cliente já usa, serviço de formulários, ou formulário
**explicitamente de demonstração**. Nunca um formulário que parece funcionar e não entrega.

## React / TanStack Start

TanStack Start atual: `vite.config.ts` com o plugin `tanstackStart` de `@tanstack/react-start/plugin/vite`,
código em `src/`, rotas em `src/routes/` (`index.tsx`, `__root.tsx`, rota dinâmica `$slug.tsx`).
Confira a versão instalada antes de escrever caminhos: a API do framework mudou em 2025.

```tsx
import { ScrollCanvasStage, StageBand } from "~/lib/tk-stage/react/ScrollCanvasStage";
import { framesFromManifest } from "~/lib/tk-stage/core/manifest";
// Copie os manifest.json para src/content/film/: o Vite não deve importar arquivos de public/ pelo JS.
import lg from "~/content/film/lg.manifest.json";
import sm from "~/content/film/sm.manifest.json";

export function Hero() {
  return (
    <ScrollCanvasStage
      label="Torrefação ao amanhecer"
      spanVh={500} spanVhMobile={420}
      keys={[[0, 0], [0.3, 70], [0.62, 70], [1, 119]]}
      poster={{ src: "/film/poster.webp", width: 1600, height: 900 }}
      variants={[
        { media: "(max-aspect-ratio: 3/4)", frames: framesFromManifest(sm, "/film/sm"), focal: [0.45, 0.5] },
        { frames: framesFromManifest(lg, "/film/lg") },
      ]}
    >
      <StageBand at="0 0.22 0 0.08"><h1>Título real</h1></StageBand>
      <StageBand at="0.78"><a href="#reservar">Reservar</a></StageBand>
    </ScrollCanvasStage>
  );
}
```

O componente renderiza markup real no servidor (seção, pôster, legendas) e só liga o motor no cliente.
Importe `stage.css` uma vez no layout raiz.

## Lovable

### Detectar a arquitetura

Leia o `package.json` do projeto real:

- tem `@tanstack/react-start` → TanStack Start (SSR);
- tem `react-router-dom` e não tem o anterior → Vite SPA (legado).

Não use o nome do arquivo de configuração como sinal: os dois tipos têm `vite.config.ts` hoje. A estrutura exata
dos projetos TanStack criados pelo Lovable **não foi verificada** neste pacote; liste as pastas antes de escrever.

### O que sincroniza sozinho e o que pede prompt

| Mudança | Como chega à produção |
|---|---|
| Componentes, rotas, estilos, `public/`, `package.json` | push em `main` (sincroniza em 1 a 2 min) · pede aprovação, porque publica |
| Funções de servidor do TanStack (`createServerFn`) | junto com o front-end, sem prompt |
| `supabase/functions/<nome>/index.ts` | escrever o arquivo, depois prompt "Deploy the <nome> edge function" |
| `supabase/migrations/*.sql` | escrever o arquivo, depois prompt "Apply pending Supabase migrations" |
| Segredos | manual: Cloud → Secrets; nunca em arquivo |
| `supabase/config.toml`, tipos gerados | não editar |

Formato obrigatório quando o backend precisa de ação no Lovable:

```
📋 LOVABLE PROMPT:
> "Apply pending Supabase migrations"
```

Para operação destrutiva, acrescente `⚠️ Aviso:` com o risco em uma frase.

Branches que não são `main` não sincronizam. Supabase próprio (não Lovable Cloud) permite `supabase db push`
e `supabase functions deploy` pela CLI, com as mesmas aprovações.

### Captura de leads (modelo em `targets/lovable/`)

- Tabela `leads` com RLS ligada e **nenhuma** política: a chave pública não lê nem escreve. A inserção passa só pela Edge Function, que aplica honeypot, consentimento e limite de taxa.
- Limites de tamanho e formato no próprio banco (`check`).
- Edge Function `submit-lead`: valida, descarta honeypot, insere com a chave de serviço **no servidor** e,
  se configurado, envia o aviso por e-mail. Segredos: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `LEAD_NOTIFY_TO`.
- Teste com notificação desligada primeiro; depois um envio real, rotulado como teste, com aprovação.
- Relate separadamente: site publicado, lead gravado, e-mail recebido.

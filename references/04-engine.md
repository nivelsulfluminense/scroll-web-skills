# 04 · O motor de palco

O motor faz uma coisa: um canvas fixado enquanto uma seção alta rola, com o quadro escolhido pela posição do scroll
e legendas que entram e saem por intervalos. A fixação é `position: sticky` nativo: o motor nunca intercepta
roda nem toque.

Copie para o projeto e não edite:

| Alvo | O que copiar |
|---|---|
| static | `dist/tk-stage.js` e `dist/tk-stage.css` (gere com `npm run build:engine`) |
| react / lovable | `engine/core/`, `engine/react/`, `engine/css/stage.css` para `src/lib/tk-stage/` |

## Contrato de markup

```html
<section data-tk-stage aria-label="Descrição da cena" style="--tk-span: 500vh; --tk-span-mobile: 420vh">
  <div data-tk-pin>
    <canvas data-tk-canvas aria-hidden="true"></canvas>
    <img data-tk-poster src="film/poster.webp" alt="" width="1600" height="900" fetchpriority="high">
    <div class="legenda" data-tk-band="0 0.22 0 0.08"><h1>Título real</h1></div>
    <div class="legenda" data-tk-band="0.34 0.6" data-tk-scrim><p>Apoio</p></div>
    <div class="legenda" data-tk-band="0.78"><a class="btn" href="#acao">Ação única</a></div>
  </div>
</section>
```

### `data-tk-band`

| Valor | Comportamento |
|---|---|
| `"0.2"` | entra em 0,2 e fica até o fim do palco |
| `"0.1 0.6"` | entra, platô, sai; rampas de 30% da janela de cada lado |
| `"0 0.78 0"` | já visível no início, depois sai |
| `"0.1 0.9 0.05 0.4"` | rampas explícitas (entrada rápida, saída longa) |

Rampas maiores que a janela são reduzidas proporcionalmente, para a legenda sempre atingir opacidade total.
Uma legenda que recebe foco de teclado faz a página rolar até o ponto em que ela está totalmente visível.

## API (static)

```js
import { ScrollStage, framesFromManifest } from "./tk-stage.js";
document.documentElement.classList.add("tk-js");
const [lg, sm] = await Promise.all(["film/lg/manifest.json", "film/sm/manifest.json"].map((u) => fetch(u).then((r) => r.json())));
const section = document.querySelector("#hero");
new ScrollStage({
  section,
  canvas: section.querySelector("canvas"),
  keys: [[0, 0], [0.3, 70], [0.62, 70], [1, 119]],     // pausa entre 0,30 e 0,62
  variants: [
    { media: "(max-aspect-ratio: 3/4)", frames: framesFromManifest(sm, "film/sm"), focal: [0.45, 0.5] },
    { frames: framesFromManifest(lg, "film/lg") },
  ],
  smooth: 0.18,            // 1 se a página já usa Lenis
});
```

| Opção | Padrão | Nota |
|---|---|---|
| `keys` | linha reta do primeiro ao último quadro | pares `[progresso, quadro]`; quadro igual em duas chaves = pausa |
| `variants` | — | a primeira cuja media query casa vence; reavaliada ao girar a tela |
| `focal` | `[0.5, 0.5]` | mantém o sujeito no recorte retrato |
| `smooth` | `0.18` | fração da distância por quadro a 60 Hz; independente da taxa de quadros |
| `maxDpr` | `2` | limita memória em telas 3x |
| `reducedMotion` | `"auto"` | segue o sistema ao vivo |
| `posterFrame` | último quadro-chave | o estado resolvido do filme |

## Estado publicado

Para CSS e para o QA, na `<section>`:

| Atributo / variável | Significado |
|---|---|
| `--tk-p` | progresso suavizado 0..1; camadas sob medida leem isto |
| `data-tk-status` | `idle`, `loading`, `ready`, `reduced`, `error` |
| `data-tk-motion` | `full` ou `reduced` |
| `data-tk-frame` / `data-tk-drawn` | quadro pedido / quadro na tela (diferem enquanto carrega) |
| `data-tk-settled` | `1` quando o laço está parado |

Evento `tk:status` (borbulha) a cada mudança de estado.

## Estados que o CSS já resolve

- **Carregando:** o pôster fica por cima até o primeiro quadro pintar; os quadros carregam do primeiro e do último para os quadros-chave e depois por bissecção, e o canvas mostra o vizinho mais próximo já decodificado.
- **Movimento reduzido:** a seção perde a altura extra e a fixação, as legendas viram blocos estáticos sobre o pôster, e só o quadro do pôster é baixado.
- **Sem JS:** igual ao reduzido (a classe `tk-js` no `<html>` é que liga o modo cinema).
- **Erro:** mais de 5% de quadros falhando põe `data-tk-status="error"` e o pôster volta.

## Comportamento sob medida

Nunca no motor. Na página, leia `--tk-p`:

```css
.plano-frente { transform: translate3d(0, calc(var(--tk-p) * -12vh), 0); }
.titulo-grande { scale: calc(1 + var(--tk-p) * 0.08); }
```

Para lógica, use `onUpdate` (static) ou `useStageSnapshot()` (React). `useStageSnapshot` re-renderiza a cada
atualização; use para interface de baixa frequência. Visual por quadro vai em CSS.

## Planejado: VideoSource

O pipeline já gera MP4 de scrub (GOP 8 desktop, 4 mobile, sem B-frames, sem áudio). Falta a fonte de vídeo do
motor: carregar como Blob (hosts sem Range), seek controlado (não pedir novo seek antes do `seeked` anterior),
`requestVideoFrameCallback` onde existir. Até lá, use sequência de quadros.

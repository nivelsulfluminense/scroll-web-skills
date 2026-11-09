# Visual Story · <nome do projeto>

Gramática: <escolhida> · Perderam porque: <uma linha>
Movimento-assinatura: <descrição>
Portão de impressão digital: <resultado contra cada linha do registro>

| Scene | Visual story | Website copy |
|---|---|---|
| 01 · Abertura | o que se vê, para onde a câmera vai, onde segura | **H1:** … · **Apoio:** … · **CTA:** … |
| 02 · | | |
| 03 · | | |

Copy real, específica do negócio. Nada de "Lorem", "Seu título aqui" ou números inventados.

## Partitura

| Ato | Batida | Dispositivo | Por que este | Span (vh desktop / mobile) | Pausas `[p, quadro]` | Sensação |
|---|---|---|---|---|---|---|

Checagens: ≥ 4 famílias · nenhuma família repetida em sequência · ≤ 2 atos de filme · nenhum par vizinho com a
mesma sensação · o pico tem o maior span por margem visível · nenhum ato existe só para completar comprimento.

## Produção de mídia

| Item | Tipo | Modelo (consultado em <data>) | Qtd | Preço unit. | Subtotal |
|---|---|---|---|---|---|
| Quadros-chave | still | | | | |
| Pernas | vídeo | | | | |
| Retrato (se necessário) | vídeo | | | | |
| Margem para refazer | | | | | |
| **Total** | | | | | |

Saldo atual: ___ (lido em ___). **Aprovado por:** ___ em ___

## Caderno de Prompts de Vídeo (Veo 3, Seedance 2 e outros geradores)

**Frase de Estilo Global (Style Lock):** `...`

| Clipe / Região | Papel (Fundo Scroll / Região Loop) | Modelo Alvo | Formato (Aspect Ratio) | Resolução Master / Web | Extensão (Master → Publicado) | Duração e FPS | Safe Zone (Texto/UI) |
|---|---|---|---|---|---|---|---|
| 01 · Hero / Fundo | Palco de Scroll (`<canvas>`) | Veo 3 / Seedance 2 | `16:9` (Desktop) / `9:16` (Mobile) | `1920x1080` (ou 4K) → `1600px` / `900px` | `.mp4` → `.webp` (`manifest.json`) | `6–8s` @ `24 fps` (sem áudio `-an`) | Terço esquerdo livre |
| 02 · Região X | Vídeo de Seção (`<video loop>`) | Veo 3 / Seedance 2 | `16:9` / `4:3` / `1:1` | `1920x1080` → `1280x720` | `.mp4` → `.mp4` (`+faststart`, `-an`) + `.webp` poster | `5–6s` @ `24 fps` | Centro / Direita |

### Prompts Detalhados por Clipe

#### Clipe 01 · <Nome da Cena ou Região>
- **Conteúdo e movimento detalhado:**
- **Prompt Google Veo 3:**
- **Prompt Seedance 2 (Sedance 2):**
- **Prompt Universal / Negative Prompt:**
- **Comando de processamento (`scripts/process-media.sh`):**

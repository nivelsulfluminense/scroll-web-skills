# 03 · Mídia: geração, prompts para Veo 3 / Seedance 2, continuidade e processamento

## 1. Modo Diretor de Prompts de Vídeo (Veo 3, Seedance 2 e outros geradores)

Quando o usuário quiser gerar o **vídeo de fundo da página (Hero / Palco de Scroll)** e/ou o **vídeo de alguma região específica da página** colando um prompt no **Google Veo 3**, **Seedance 2 (Sedance 2)** ou outro gerador (Kling, Runway Gen-4, Sora, Luma Ray 2), nunca entregue um prompt genérico de uma linha.

### Passo A: Entrevista de Direção de Vídeo (se ainda não respondida no Intake)

Antes de redigir os prompts, confirme com o usuário (consulte [00-intake.md](00-intake.md)):
1. **Região de destino e comportamento:** é o **vídeo de fundo principal controlado pelo scroll** (scrub quadro a quadro no `<canvas>`), um **vídeo de região específica em loop contínuo** (`<video autoplay muted loop playsinline>`), ou uma sequência de múltiplos atos?
2. **Modelo gerador alvo:** **Veo 3**, **Seedance 2 (Sedance 2)**, ou outro?
3. **Sujeito, ação e progressão temporal:** o que acontece do segundo `0s` até o final? (Para vídeos de scroll, a ação precisa ter progressão clara e contínua do início ao fim; para vídeos de região em loop, o início e o fim devem ter atmosfera estável e movimento cíclico sutil).
4. **Estética, câmera e lente:** tipo de lente (ex.: 35mm anamórfica, 85mm macro `f/2.0`, 24mm arquitetônica), movimento de câmera (dolly push-in lento, orbit de 45°, crane ascendente, câmera estática em tripé) e iluminação.
5. **Zonas de Respiro (Safe Zones para UI/Copy):** onde o texto HTML (`<h1>`, subtítulo, botões) ficará posicionado sobre o vídeo? Essa área precisa de espaço negativo, fundo mais escuro/desfocado ou baixo contraste para leitura perfeita.
6. **Proporções necessárias:** Desktop (`16:9`), Mobile dedicado (`9:16`) e/ou proporções de componente/região (`4:3`, `1:1`, `4:5`, `21:9`).

---

### Passo B: Especificações Técnicas Obrigatórias de Cada Vídeo

Todo prompt entregue ao usuário **deve** vir acompanhado desta ficha técnica explícita, detalhando **conteúdo, formato, extensão, resolução, taxa de quadros e duração**:

| Parâmetro | Vídeo de Fundo Principal (Palco de Scroll / Hero) | Vídeo de Região Específica da Página (Seção / Card / Loop) |
|---|---|---|
| **Conteúdo e Movimento** | Movimento contínuo, linear e ancorado (ex.: dolly-in constante, rotação de 0° a 90° ou revelação progressiva de luz). Sem cortes secos internos, sem câmera tremida (handheld shake) que prejudique o scrub reverso ao rolar para cima. | Movimento atmosférico, orgânico ou demonstrativo de produto (micro-movimentos de luz, tecido, partículas, interface ou detalhe mecânico), pensado para loop suave sem distrair da leitura ao redor. |
| **Zona Segura (Safe Zone)** | Terço esquerdo, direito ou superior livre de detalhes complexos de alta frequência onde entra o `<h1>` e o CTA. **Proibido qualquer texto, logotipo deformado ou HUD queimado dentro do vídeo.** | Enquadramento fechado no sujeito central ou deslocado conforme o grid da seção (`split layout`, bento card ou faixa full-bleed). |
| **Formato / Aspect Ratio** | **Desktop:** `16:9` (widescreen padrão)<br>**Mobile dedicado:** `9:16` (vertical retrato) | **Card / Coluna dividida:** `4:3`, `1:1` ou `4:5`<br>**Faixa de seção (Banner):** `16:9` ou `21:9` |
| **Resolução de Geração (Master)** | **Geração no Veo 3 / Seedance 2:** `1080p` (`1920x1080` em 16:9 · `1080x1920` em 9:16) ou `4K` (`3840x2160`) quando disponível para downscale nítido. | **Geração no Veo 3 / Seedance 2:** `1080p` (`1920x1080`, `1440x1080`, `1080x1080` ou `1080x1350`). |
| **Resolução Publicada (Web)** | **Sequência WebP (`process-media.sh`):** largura `1600px` no desktop (`lg`) e `900px` no mobile (`sm`), mantendo proporção original. | **Vídeo em loop na seção:** `1280x720` (720p) para cards/colunas ou `1920x1080` (1080p) para seções full-width. |
| **Extensão do Arquivo** | **Master baixado do gerador:** `.mp4` (H.264 / H.265, alta qualidade)<br>**Publicado no palco de scroll:** sequência de imagens `.webp` (`0001.webp`… + `manifest.json`) **ou** vídeo de scrub `.mp4` + pôster `.webp`. | **Master baixado do gerador:** `.mp4`<br>**Publicado na região:** `.mp4` (codec H.264 `avc1`, container MP4 com `moov atom` no início `+faststart`) + `.webp` para atributo `poster`. |
| **Taxa de Quadros (FPS) e Duração** | **No gerador:** `24 fps` ou `30 fps`, duração de **5 a 8 segundos** por perna/ato.<br>**Na extração (`process-media.sh`):** `24 fps` (120 a 192 quadros WebP por perna de 5–8s; teto recomendado de ~300 quadros por palco). | **No gerador e publicado:** `24 fps` ou `30 fps`, duração de **4 a 8 segundos**, sem faixa de áudio (`-an`), bitrate alvo de `1.5 Mbps a 3.5 Mbps` (peso ideal `< 2.5 MB` por clipe de região). |
| **Áudio** | **Sem áudio (`Muted / -an`).** Mesmo que o Veo 3 gere áudio nativo, o pipeline remove a trilha sonora (`-an`) para evitar bloqueio de autoplay e peso extra. | **Sem áudio (`Muted / -an`).** Obrigatório para `<video autoplay muted loop playsinline>` funcionar no iOS Safari e Chrome Android. |

---

### Passo C: Estrutura do Prompt para Veo 3, Seedance 2 e Outros Modelos

Para cada vídeo (fundo principal ou região específica), entregue o bloco completo abaixo, pronto para o usuário copiar e colar:

1. **Frase de Estilo Global (Style Lock):** uma única sentença em inglês que define lente, paleta cromática, película/sensor, iluminação e atmosfera. Ela é repetida **literalmente** em todos os clipes da página para garantir que o vídeo de fundo e os vídeos das regiões pareçam filmados no mesmo set.
2. **Prompt Otimizado para Google Veo 3:**
   - O Veo 3 responde melhor a descrições cinematográficas estruturadas em prosa fluida contendo: **[Tipo de plano e lente] + [Sujeito detalhado e materiais] + [Ação física contínua do segundo 0 ao segundo 8] + [Trajetória exata da câmera] + [Iluminação, atmosfera e paleta de cores] + [Composição de Zona Segura / Negative Space] + [Instrução de áudio silencioso e zero texto na tela]**.
3. **Prompt Otimizado para Seedance 2 (Sedance 2):**
   - O Seedance 2 se destaca em coerência temporal, dinâmica de movimento e controle de trajetória de câmera (inclusive modo *Image-to-Video* com *First Frame / Last Frame*). Estruture destacando: **[Anchor Subject & Material Physics] + [Camera Motion Vector: ex. Smooth slow dolly-in, 0 to 100% linear progression, tripod-stabilized] + [Temporal Action: Início → Meio → Fim] + [Lighting & Color Grade] + [Clean negative space on left/right third, no text, no morphing]**.
4. **Prompt Negativo / Restrições (para modelos que aceitam Negative Prompt):**
   - `text, typography, letters, watermark, logo, subtitles, UI elements, blurry, morphing geometry, flickering light, abrupt cuts, shaky camera, Dutch angle, oversaturated neon, deformed edges, compression artifacts`.
5. **Bloco de Exemplo Completo (Modelo que o Agente Deve Entregar ao Usuário):**

```markdown
### Clipe 01 · [Vídeo de Fundo Principal (Hero Scroll) | ou | Região Específica: Nome da Seção]

- **Papel na página:** [Ex.: Palco de scroll do Hero (0% a 100% de progresso do Ato 1) / ou / Vídeo em loop na seção de Engenharia]
- **Modelo recomendado:** Google Veo 3 / Seedance 2
- **Formato (Aspect Ratio):** `16:9` (Desktop) e `9:16` (Mobile)
- **Resolução de saída no gerador:** `1920x1080` (Full HD 1080p) ou `3840x2160` (4K)
- **Extensão:** Master em `.mp4` → Processado para `.webp` (sequência de quadros + `manifest.json`) ou `.mp4` otimizado sem áudio
- **Duração e FPS:** `6 a 8 segundos` a `24 fps` (gera ~144 a 192 quadros suaves para o scroll)
- **Zona Segura para Texto (Safe Zone):** [Ex.: Terço esquerdo mantido em sombra suave e baixa textura para leitura do H1 e botão CTA]

#### Prompt para Google Veo 3 (Copiar e Colar):
> **[Style Lock]:** Shot on Arri Alexa 65 with Panavision Primo 50mm anamorphic lens, f/2.0, cinematic chiaroscuro studio lighting, warm tungsten rim light against deep obsidian shadows, subtle 35mm Kodak Vision3 film grain, ultra-photorealistic commercial cinematography.
> **[Scene & Action]:** Medium-wide studio shot of [sujeito detalhado]. From 0s to 8s, the camera executes a continuous, ultra-smooth linear dolly push-in along the Z-axis while the subject slowly rotates 35 degrees clockwise, catching a sweeping golden key light across its brushed metal and matte glass surfaces. The left third of the frame remains in clean, dark unfocused negative space to accommodate website typography. Zero camera shake, no jump cuts, no on-screen text, no watermarks, silent ambient track.

#### Prompt para Seedance 2 / Sedance 2 (Copiar e Colar):
> **[Camera & Motion Control]:** [Slow, steady linear dolly-in + subtle 35-degree orbital pan right, constant speed, gimbal-locked].
> **[Visual Description]:** [Sujeito detalhado posizionado no terço direito do quadro], realistic physical reflections, light beam gradually revealing surface micro-textures from start frame to end frame. Clean dark negative space on the left 35% of the composition. Photorealistic 50mm lens, shallow depth of field, high dynamic range, no morphing, no text, no watermark.

#### Como processar assim que baixar o `.mp4` (salve em `media/approved/01.mp4`):
- **Se for o Vídeo de Fundo (Palco de Scroll):**
  `bash scripts/process-media.sh frames public/film/lg media/approved/01.mp4`
  `TK_PRESET=mobile bash scripts/process-media.sh frames public/film/sm media/approved/01.mp4`
  `bash scripts/process-media.sh poster media/approved/01.mp4 public/film/poster.webp last`
- **Se for Vídeo de Região Específica da Página (Loop / Scrub em `<video>`):**
  `bash scripts/process-media.sh video public/film/regiao-01.mp4 media/approved/01.mp4`
  `bash scripts/process-media.sh poster media/approved/01.mp4 public/film/regiao-01-poster.webp first`
```

---

## 2. Contrato neutro de provedor (quando gerado via API/MCP)

Qualquer gerador (OpenArt, Higgsfield, kie.ai, outro via MCP ou API) é usado através destas cinco operações.
O agente descobre modelos e preços **na hora**, nunca de memória, e registra tudo em `.10k/plan.md`.

| Operação | Entrada | Saída obrigatória |
|---|---|---|
| `models()` | tipo (imagem, vídeo) | nomes, durações e resoluções suportadas, preço atual |
| `balance()` | — | saldo e data da leitura |
| `still(prompt, refs, aspect)` | prompt com a frase de estilo, imagens de referência | arquivo + id do job |
| `shot(prompt, startFrame, endFrame?, seconds)` | quadro inicial extraído, final opcional | arquivo + id do job |
| `status(jobId)` | id | estado; jobs longos são acompanhados até baixar |

Nenhum adaptador de provedor está implementado nesta versão (IMPLEMENTATION_STATUS.md). Até lá o agente usa
a ferramenta MCP do provedor diretamente, obedecendo a este contrato.

## Antes de gerar

1. Orçamento aprovado (AGENTS.md).
2. **Frase de estilo** escrita uma vez e reutilizada literalmente em todo prompt. É o que faz seis imagens parecerem uma sessão só.
3. **Todos os quadros-chave** gerados com o mesmo modelo e a mesma referência, dispostos lado a lado. Estilo que deriva entre stills deriva no filme inteiro.
4. Calibrar com um still e um clipe antes de comprometer o lote.

## Continuidade

- **Mundo contínuo** (resposta da pergunta 7): cada perna é gerada entre um quadro inicial e um final; o final da perna A é o inicial da perna B. Use o quadro **extraído** do clipe A (`process-media.sh poster clipA.mp4 inicio-B.webp last`), não o still original: modelos alteram cor e enquadramento.
- Meça cada junção: `bash scripts/process-media.sh seams pernas/*.mp4`. SSIM ≥ 0,92 é invisível, < 0,80 é salto. Os limites são calibração inicial: confira toda junção a olho, em velocidade normal e quadro a quadro.
- Junção ruim: regenere aquela perna ancorada no quadro extraído. Duas falhas seguidas: mude a abordagem (AGENTS.md §4).
- **Cenas distintas:** não encadeie. Varie o dispositivo entre atos e o corte deixa de ser percebido.

## Inspeção

Abra cada imagem e quadro antes de usar. Rejeite: deriva de identidade do produto ou personagem, mãos e texto
deformados, composição copiada de referência, marca d'água, elemento duplicado. Recuse texto dentro da imagem:
todo texto é markup.

## Processamento

| | Sequência de quadros (padrão) | Vídeo de scrub |
|---|---|---|
| Precisão | quadro exato por posição | seek chega um pouco atrasado, pior no Safari |
| Peso | 20 a 60 kB por quadro em 900 a 1600 px | cerca de um terço |
| Quando | até ~300 quadros | filmes longos, orçamento de bytes apertado |
| Motor desta versão | suportado | planejado |

```bash
# desktop e mobile a partir das pernas aprovadas
bash scripts/process-media.sh frames public/film/lg media/approved/*.mp4
TK_PRESET=mobile bash scripts/process-media.sh frames public/film/sm media/approved/*.mp4
# retrato dedicado, quando o recorte não sustenta o sujeito
TK_PRESET=mobile bash scripts/process-media.sh frames public/film/sm media/approved-portrait/*.mp4
# pôster (estado reduzido, sem JS, falha) = estado resolvido do filme
bash scripts/process-media.sh poster media/approved/03.mp4 public/film/poster.webp last
# vídeo de scrub (para o futuro VideoSource ou outro motor)
bash scripts/process-media.sh video public/film/hero.mp4 media/approved/*.mp4
```

`frames` descarta o primeiro quadro de cada perna depois da primeira, porque ele repete o último da anterior,
e grava `manifest.json` com contagem, tamanho, fps e padrão de nome. O motor lê o manifesto.

## Onde os arquivos ficam

```
media/masters/      originais em alta, nunca publicados (Git LFS ou fora do git)
media/approved/     pernas aprovadas, nomeadas em ordem (01.mp4, 02.mp4…)
media/rejected/     versões descartadas, com o motivo no plan.md
public/film/lg|sm/  quadros publicados + manifest.json
```

Orçamentos de peso de partida: filme inteiro abaixo de ~8 MB no celular; o qa-audit mede e avisa.

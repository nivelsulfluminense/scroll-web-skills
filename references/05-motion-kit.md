# 05 · Kit de movimento

## Famílias de dispositivo (partitura)

Uma página usa pelo menos quatro famílias, nunca a mesma duas vezes seguidas, no máximo dois atos de filme.

| Família | O que faz | Com o quê |
|---|---|---|
| `scrub` | a roda do mouse é o controle do filme | `ScrollStage` |
| `pin` | o quadro segura, o conteúdo avança | pausa nas chaves + `data-tk-band` |
| `pan` | scroll vertical, deslocamento lateral (lê como "opções") | CSS lendo `--tk-p` em `translate` |
| `reveal` | uma cortina é uma mudança de estado | `clip-path` animado por `--tk-p` |
| `kinetic` | o texto se monta linha a linha com o quadro parado | legendas com intervalos escalonados |
| `parallax` | planos em velocidades diferentes, o sujeito entre o plano médio e o da frente | camadas com recorte alfa, `translate3d` por `--tk-p` |
| `count` | números que pousam | **só números reais** |
| `pointer` | a página para de rolar e passa a responder | Kinesis |
| `flow` | seção comum bem feita | HTML + revelação discreta |

## Kinesis para ponteiro e reações

Dependência opcional, MIT, ~14 KB gz, sem idle cost. Dono exclusivo do prefixo `--k-*`
(o motor de palco usa `--tk-*` para não colidir).

```bash
npm install @amineyarman/kinesis
```

```html
<section data-kinesis>
  <article class="cartao">…</article>
</section>
```

```css
.cartao { --k-tilt: 8deg; --k-parallax: 12px; --k-motion: soft; }
.btn    { --k-when: press; --k-scale: .94; }
.dock img { --k-when: near; --k-scale: 1.6; --k-radius: 140px; }
```

```js
import { initKinesis } from "@amineyarman/kinesis";
initKinesis();
```

Regras de uso aqui:

- Kinesis não faz timeline nem sequência de quadros: isso é do palco. Não use `--k-when: page` para controlar o filme.
- Pointer não existe no toque: todo efeito de ponteiro precisa de um estado de toque desenhado (ou nenhum).
- Em `prefers-reduced-motion`, confira que o efeito some ou fica estático; cite isso no QA.
- Movimento-assinatura pode usar Kinesis como peça, mas recolorir ou retunar um efeito do kit não conta como assinatura.

## Herói em camadas (padrão de herói premium)

Planeje planos independentes antes de pedir assets: fundo, sujeito, frente, atmosfera.
Profundidade vem de separação visível, oclusão e diferença controlada de movimento; o título continua legível.

- Plano de fundo limpo (sem o sujeito) + sujeito com alfa real, ancorados no mesmo ponto de contato.
- O tipo pode ficar **entre** planos (atrás do sujeito, à frente do fundo).
- No mobile, recomponha; não só encolha.
- Em movimento reduzido, a profundidade continua na composição estática.

## Planejado: `depth-parallax`

Uma foto (de preferência real do cliente) + mapa de profundidade gerado localmente (Depth Anything V2 Small,
Apache-2.0, via Transformers.js, baixado só quando usado). A câmera avança devagar com o scroll e o que está
perto se move mais do que o que está longe. Para conceitos de imagem parada ou rota de custo menor
**combinada** com o usuário. Falta de crédito não substitui sozinha um filme aprovado.

## Planejado: `surface-type`

Palavras presas a superfícies do filme (parede, mesa, rua, face do produto). Mede-se a transformação da
superfície quadro a quadro no filme **publicado** (não no master), com máscaras sobre o que se move por conta
própria, e aplica-se `matrix()` ao elemento de texto a partir do quadro na tela. Nunca estime o movimento da
câmera a olho. Verificação: folhas de prova com a grade sobre a superfície em 12 quadros, e rolagem lenta,
rápida e reversa.

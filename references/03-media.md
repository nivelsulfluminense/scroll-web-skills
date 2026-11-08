# 03 · Mídia: geração, continuidade e processamento

## Contrato neutro de provedor

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

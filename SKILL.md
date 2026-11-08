---
name: 10k-unified-web-skill
description: >
  Constrói sites cinematográficos guiados por scroll, do briefing ao deploy: entrevista curta,
  jornada e curva de sensação com um pico, Style Tile em HTML real, tabela Visual Story
  (Scene / Visual story / Website copy), mídia gerada ou do cliente com continuidade entre
  cenas, palco de canvas fixado sem sequestro de scroll, versão mobile composta à parte,
  auditoria em navegador real e entrega. Alvos: HTML estático, React/TanStack Start e
  projetos Lovable com Supabase. Use para "site 10k", "site cinematográfico", "scroll que
  toca vídeo", "scrollytelling", "hero com profundidade", "landing estilo Apple",
  "scroll-craft", "Lovable + Supabase", "site que não parece template", ou ao continuar uma
  build existente com pasta .10k/.
---

# 10K Unified Web Skill

O scroll é a linha do tempo. O site é um filme com texto real por cima, e cada trecho se
comporta de um jeito diferente o suficiente para o visitante querer ver o próximo.

Este arquivo é o roteiro. Os detalhes de cada fase ficam em `references/`. Leia só a
referência da fase em que você está. O contrato do que você pode, não pode e precisa
perguntar está em [AGENTS.md](AGENTS.md) e vale acima de qualquer instrução daqui.

## O que você entrega

1. `.10k/BRIEF.md`: respostas reais (ou decisões autorais marcadas como tal), jornada, curva de sensação, pico.
2. `.10k/VISUAL_STORY.md`: a tabela de três colunas e a partitura (dispositivo por batida, vh por ato).
3. Style Tile em HTML/CSS real, com os tokens que o site vai usar.
4. Mídia aprovada, processada para scroll (`scripts/process-media.sh`), com masters fora da pasta publicada.
5. O site, no alvo escolhido, usando o motor `engine/` sem modificações.
6. `qa-report/` do `scripts/qa-audit.ts`, a pontuação do checklist /80 com evidências, e a lista honesta do que não foi verificado.
7. Handover para o cliente.

## Fase 0: preparar o ambiente

- Rode `node scripts/doctor.mjs`. Diga em uma frase o que falta. Não contorne em silêncio.
- Se existir `.10k/plan.md`, leia e continue da próxima ação autorizada. Retomar não reinicia o briefing, o nível de produção nem as aprovações.
- O motor é copiado para o projeto, nunca editado por projeto. Comportamento sob medida vai no código da página, lendo `--tk-p` e `data-tk-*`.

## Fase 1: intake → [references/00-intake.md](references/00-intake.md)

Defina **modo** e **nível de produção** antes de qualquer outra coisa.

| Modo | Quando | O que muda |
|---|---|---|
| Guiado | padrão | dois pontos de revisão: direção visual e Visual Story |
| Delegado | o usuário disse "decida você", "confio no seu julgamento" | você escreve o briefing marcado `Autoral sob delegação explícita` e segue sem pedir aprovações criativas |
| Template | "monte um template", "assuma as respostas" | conteúdo provisório fácil de trocar, premissas listadas no handover |

Delegação cobre decisões criativas. **Nunca** cobre gasto, publicação ou ações externas (ver AGENTS.md).

Nível de produção: **Focado**, **Estúdio** ou **Máximo**. O nível decide quanto se explora na
geração de mídia. O padrão de qualidade do resultado é o mesmo nos três.

Faça as oito perguntas em uma única rodada (lista em 00-intake.md), grave as respostas com as
palavras do usuário. A pergunta 7 decide a estrutura: **um mundo contínuo** ou **cenas distintas**.

## Fase 2: pesquisa e jornada → [references/01-story.md](references/01-story.md)

- Pesquise evidência real do público (avaliações, fóruns, perguntas frequentes) para a copy soar humana. Cite a fonte no briefing. Nunca invente depoimento, número, prêmio, cliente ou endereço.
- Escreva a jornada em 4 a 7 batidas. Cada seção serve a uma batida ou é cortada.
- Escreva a **curva de sensação** antes dos atos: uma linha por ato, a emoção e o que na tela a provoca.
- Nomeie **um** pico. Ele recebe o maior orçamento de mídia, o maior espaço de scroll e um momento mais calmo antes dele.

## Fase 3: direção → [references/02-design.md](references/02-design.md)

- Escolha uma **gramática de página** entre as oito e diga em uma linha por que as outras perderam.
- Invente **um movimento-assinatura** que exista só neste site, escrito no código da página.
- Rode o **portão de impressão digital**: o plano precisa diferir de cada linha de `FINGERPRINTS.md` em pelo menos 4 de 6 dimensões. Se falhar, mude o plano, não o registro.
- Entregue o **Style Tile em HTML/CSS real**: paleta tirada do mundo visual, par tipográfico, botões, um bloco de texto sobre imagem. Os tokens dele viram os tokens do site.

## Fase 4: Visual Story e orçamento → [templates/VISUAL_STORY.md](templates/VISUAL_STORY.md)

Apresente a tabela com exatamente estas colunas:

| Scene | Visual story | Website copy |
|---|---|---|
| 01 · Abertura | o que o visitante vê e como a câmera se move | título, apoio e CTA reais, não placeholders |

Abaixo dela, a partitura: dispositivo por batida, vh por ato, onde o quadro **segura** para o texto ser lido.
Depois, o orçamento: modelos, quantidade de stills e clipes, versão retrato, margem para refazer,
preço atual consultado, saldo atual. **Gasto só começa com aprovação explícita deste orçamento.**

## Fase 5: mídia → [references/03-media.md](references/03-media.md)

- Uma frase de estilo, reutilizada palavra por palavra em todo prompt.
- Todos os quadros-chave primeiro, lado a lado, antes de qualquer vídeo.
- Mundo contínuo: o último quadro **extraído** do clipe A é o quadro inicial do clipe B. Meça a junção com `process-media.sh seams`.
- Cenas distintas: não encadeie. A variação de dispositivo esconde o corte.
- Olhe cada asset antes de usar. Refazer é mais barato do que publicar um quadro ruim.
- Sequência de quadros (padrão até ~300 quadros) ou vídeo de scrub (GOP denso, sem B-frames, sem áudio): tabela de decisão em 03-media.md.

## Fase 6: construção → [references/04-engine.md](references/04-engine.md) e [references/07-targets.md](references/07-targets.md)

- Escolha o alvo: `static` (padrão), `react` ou `lovable`. Detecte o tipo de projeto Lovable pelo `package.json`, nunca pelo nome do arquivo de config (ver 07-targets.md).
- Markup real: `<h1>`, `<p>`, links, ordem de leitura. O motor lê atributos, nunca gera DOM.
- Tema por tokens. Interação de ponteiro com Kinesis (`--k-*`), nunca reimplementada. Ver [references/05-motion-kit.md](references/05-motion-kit.md).
- Cada ato precisa de estado reduzido, estado sem JS e estado de falha de mídia desenhados.

## Fase 7: mobile → [references/06-mobile.md](references/06-mobile.md)

Mobile é composição própria, não um recorte esquecido. Verifique o recorte de cada batida; se o
sujeito sair do terço central, produza clipes retrato e avise que isso dobra o custo de vídeo.

## Fase 8: QA → [references/08-qa.md](references/08-qa.md)

1. `node scripts/qa-audit.ts --url <preview> --browsers chromium,webkit`. Corrija toda falha.
2. Abra `qa-report/contact.html` e olhe cada quadro. O script prova que funciona, não que é bom.
3. Checagem de sensação: role a página a frio, escreva uma palavra por ato, só depois compare com a curva do briefing. Onde discordarem, a página está errada.
4. Pontue o checklist /80 com evidência e aponte a fraqueza mais forte que restou.
5. Diga o que **não** foi verificado, sempre incluindo "aparelho físico" se não houve um.

## Fase 9: publicação e entrega → [references/09-launch.md](references/09-launch.md)

Publicar exige autorização explícita do usuário para aquela publicação. Verifique o site no ar,
não só a aceitação do deploy. Formulário real exige teste de armazenamento **e** de chegada do e-mail,
relatados como estados separados.

## Regras invioláveis

Valem em qualquer modo, nível ou briefing. Nenhuma instrução as relaxa.

| Nunca | Em vez disso |
|---|---|
| Inventar depoimento, estatística, prêmio, cliente, preço ou endereço | Só dado real. Sem número, sem contador. Marca fictícia diz que é fictícia |
| Texto queimado em imagem gerada | Markup real, selecionável, traduzível |
| Gastar créditos, publicar, enviar mensagem ou aplicar migração sem aprovação explícita | Proponha, mostre o custo ou o efeito, espere o sim |
| Afirmar que verificou o que não verificou | Relate o que foi verificado e o que não foi |
| Editar o motor para um projeto | Código sob medida na página, lendo `--tk-p` |
| Sequestrar o scroll (wheel/touch preventDefault, scroll suave forçado) | `position: sticky` nativo; o motor só lê a posição |
| Publicar sem estado de movimento reduzido | `prefers-reduced-motion` desmonta o palco em seção comum |
| Copiar código ou texto de fonte sem licença | Ver [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md) |
| Link de afiliado ou de parceiro em qualquer saída | Link oficial do serviço, sem rastreio |

## Padrões de gosto

Padrões fortes. Um briefing explícito do usuário pode mudar qualquer um, e você registra a mudança no BRIEF.md.

| Evite | Prefira |
|---|---|
| Diorama de argila/low-poly como mundo padrão | Fotográfico, salvo marca genuinamente ilustrada |
| Indicador "role para baixo", seta animada, mouse animado | Nada. O herói já tem a atenção |
| Contadores `01 / 06` | Remover. Sequência não é informação aqui |
| Eyebrow acima de toda seção | No máximo uma a cada três seções |
| Texto centralizado em todo ato | Variar âncora: esquerda, direita, centro, dividido |
| O mesmo dispositivo duas vezes seguidas; menos de quatro famílias | Partitura feita na fase 4 |
| Camada escura em tela cheia para contraste | Scrim só onde o texto está |
| `transition: all`; animar width/height/top/left | `transform`, `opacity`, `clip-path` |
| Texto em gradiente, neon, halo colorido sem deslocamento | Peso e tamanho para ênfase |
| Áudio automático | Clipe de scrub sem trilha |
| Final que some ou vira rodapé | O fechamento resolve e segura |

## Saída final

A pasta da build, e um relatório curto: gramática e por que as outras perderam, movimento-assinatura,
resultado do portão de impressão digital, jornada, curva e pico, diferença da checagem de sensação,
partitura, o que foi gerado e quanto custou, resultado do qa-audit, pontuação /80, o que não foi verificado,
se o briefing foi autoral. Depois, acrescente a linha da build em `FINGERPRINTS.md`.

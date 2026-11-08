# 01 · Pesquisa, jornada, sensação e ritmo

## Pesquisa da voz do cliente

Objetivo: copy específica e objeções reais, não adjetivos. Fontes aceitáveis: avaliações públicas do
negócio e de concorrentes, fóruns e comunidades do nicho, perguntas frequentes, o próprio material do cliente.

- Anote cada achado com a fonte em `.10k/research.md`.
- Use a linguagem do público para escrever copy nova. Não publique trecho de avaliação de terceiros como se fosse depoimento do cliente.
- Depoimento só entra se o cliente fornecer e tiver o direito de usar.

## Jornada

Quatro a sete batidas. Cada batida é uma mudança no que o visitante sabe ou sente.

```
1  Reconhecimento   ele vê a própria rotina
2  Tensão           o custo disso, dito com clareza
3  Virada           o que muda
4  Substância       por que se sustenta
5  Escolha          o que ele pode escolher
6  Compromisso      a ação única
```

É um exemplo de forma, não um molde. Seções servem às batidas; seção sem batida é cortada.

## Curva de sensação (antes dos atos)

Uma linha por ato: `emoção · o que na tela a provoca`. Regras:

- Dois atos vizinhos com a mesma emoção: um deles sobra. Corte agora, antes de gerar mídia.
- Um único **pico**, escrito como a frase que o visitante diria a um amigo. Ele tem o maior espaço de scroll da página e o ato anterior é mais calmo.
- Complete: "É o site em que ___", com uma experiência, não com o nome de um efeito.
- Silêncio autoral (um trecho em que nada muda de propósito) é anotado no briefing, para o QA não confundir com scroll morto.

## Ritmo e pausas

- O comprimento de cada ato é a altura do palco em vh (`--tk-span`). Referências, não cotas: cerca de 1 vh por 0,2 s de filme parece deliberado; páginas cinematográficas longas somam 8 a 14 alturas de tela; gramáticas editoriais e de galeria ficam curtas.
- Toda batida com texto tem uma **pausa**: duas chaves com o mesmo quadro (`[0.3, 70], [0.62, 70]`). Sem pausa, o texto desliza sobre imagem em movimento e ninguém lê.
- A legenda entra no começo da pausa e sai no fim. O qa-audit confere que ela chega a opacidade total e que fica na tela por pelo menos meia altura de tela de scroll.
- Nenhum scroll morto: posições consecutivas em que nem o quadro nem a legenda mudam. O qa-audit avisa.

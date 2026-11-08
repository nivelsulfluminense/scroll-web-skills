# 02 · Direção: gramática, assinatura, impressão digital e Style Tile

## Gramáticas de página

A estrutura é um eixo separado do visual. Escolha uma e diga em uma linha por que as outras perderam.
Uma gramática nova vale se navegação, sequência, final e proibições forem de fato diferentes; um nome novo não basta.
O filme de plano único foi o que as primeiras builds da fonte repetiram até parecerem template: escolhê-lo exige justificativa.

| Gramática | Serve para | O scroll parece | Evita |
|---|---|---|---|
| Filme de plano único | um argumento linear com um arco emocional; produtos de consumo, lançamentos | empurrar um filme sem emendas | sequência visível (números de capítulo, índice, barra de progresso), cortes secos, cromo de ferramenta |
| Editorial em capítulos | conteúdo longo: método, manifesto, história do fundador | virar páginas; intertítulos e diagramas assimétricos densos | herói de scrub em tela cheia, transição em degradê contínuo entre capítulos |
| Superfície viva | software, ferramentas, painéis: a demonstração é o argumento | operar o produto de verdade, com o scroll mudando o estado dele | qualquer cromo de marketing, scrim, foto em tela cheia, título sobre filmagem |
| Mundo contínuo | uma jornada literal por um único lugar | atravessar um lugar por pontos de passagem, não seções | montar a partir de atos fixados um após o outro: exige **um** palco fixo para a página inteira |
| Pôster tipográfico | marca cujo ativo é uma frase; ou quando gerar imagens daria quadros esquecíveis | palavras chegando em escalas muito diferentes | foto de apoio genérica |
| Galeria / catálogo | uma gama: variantes, portfólio, cardápio, casos | caminhar por uma sala; rótulos de museu, não de venda | argumento fixado, frase de herói única, copy persuasiva nos rótulos |
| Palco dividido | qualquer argumento de dois lados: antes/depois, custo/economia | ver uma balança pender até um lado vencer | tela cheia antes da resolução, texto centralizado, fechamento simétrico |
| Lista rítmica de cortes | marcas de energia: streetwear, esporte, eventos, música, bebidas | um corte por segundo; 12 a 20 seções curtas | ato acima de ~1,4 altura de tela, pausas, fusões |

Resumo em paráfrase das gramáticas do scroll-craft (MIT). Para o mundo contínuo, use **um** `data-tk-stage`
com `--tk-span` cobrindo a página inteira e as cenas como intervalos de chaves e legendas dentro dele.

## Movimento-assinatura

Uma interação que existe só neste site, escrita no código da página, nascida da pergunta 5.
Não conta: recolorir um holofote, retunar um tilt, trocar a velocidade de um efeito de kit.
Conta: algo que um concorrente não poderia usar sem parecer que copiou.

## Portão de impressão digital

Registro em `FINGERPRINTS.md` (modelo em [../templates/FINGERPRINTS.md](../templates/FINGERPRINTS.md)), no workspace do usuário.
Seis dimensões: gramática, tratamento da navegação, dispositivo do herói, forma da sequência de atos,
padrão de fechamento, movimento-assinatura. O plano precisa diferir de **cada** linha em pelo menos 4 de 6.
Também conta como impressão digital a faixa "6 a 7 atos somando cerca de 13,7 alturas de tela", onde as primeiras builds da fonte caíram todas: se o plano cair nela, justifique.
Registro vazio na primeira build é normal.

## Style Tile (antes de qualquer página)

Um arquivo HTML/CSS real, não uma imagem:

- Paleta amostrada do mundo visual escolhido: fundo, superfície, tinta, tinta suave, acento, tinta sobre acento.
- Par tipográfico com tamanhos reais de h1, h2, corpo e legenda; fontes com licença para web.
- Botão primário e secundário em todos os estados, inclusive foco visível.
- Um bloco de legenda sobre uma imagem do mundo, com o scrim que será usado, para provar o contraste.
- Os tokens viram as variáveis do site:

```css
:root {
  --tk-canvas: #0A0806;  --tk-surface: #16110E;
  --tk-ink: #F5EBDD;     --tk-ink-soft: #A2968A;
  --tk-accent: #FF5A3D;  --tk-accent-ink: #15110F;
  --tk-font-display: "Archivo", system-ui, sans-serif;
  --tk-font-text: "Geist", system-ui, sans-serif;
}
```

No modo guiado, o Style Tile é o primeiro ponto de revisão. Apresente também o "pitch de diretor":
três frases sobre o filme que a página vai ser, antes de qualquer geração.

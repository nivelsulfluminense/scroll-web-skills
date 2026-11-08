# 06 · Mobile

Mobile é um alvo de primeira classe desde o planejamento, não uma passada no fim. Um único site, uma base de código,
variantes escolhidas por media query.

## Recorte ou retrato dedicado

1. Processe o preset mobile a partir das pernas aprovadas e olhe o recorte de **cada batida** (não só o pôster).
2. Ajuste `focal` da variante mobile para manter o sujeito no quadro.
3. Se em alguma batida o sujeito sair do terço central, produza pernas retrato 9:16 a partir de quadros-chave retrato. Avise antes: isso dobra o custo de vídeo.
4. No nível Máximo, considere retrato dedicado mesmo quando o recorte "cabe", se ele melhorar a experiência.

## Composição

- Recomponha legendas para a largura: âncoras diferentes, tamanhos menores, quebras pensadas.
- `--tk-span-mobile` costuma ser menor: dedos rolam mais rápido que roda de mouse.
- Alvos de toque de pelo menos 44 × 44 px; nada sob o indicador de início do iPhone (use `env(safe-area-inset-bottom)`).
- Navegação própria: menu que abre e fecha por teclado e toque, foco preso enquanto aberto.
- Tipografia fluida com `clamp()`; teste em 360 px de largura.

## Peso

Filme inteiro abaixo de ~8 MB no celular como ponto de partida; quadros do preset mobile ficam em 15 a 30 kB.
O qa-audit mede o total transferido por viewport.

## O que a emulação não mostra

O qa-audit em `--viewports mobile --browsers webkit` aproxima um iPhone, mas não reproduz decodificador,
política de autoplay, Low Power Mode nem inércia do toque. Peça ao usuário uma rolagem num aparelho real e
registre se aconteceu. Quando ele relatar defeito no aparelho, peça uma gravação de tela antes de teorizar.

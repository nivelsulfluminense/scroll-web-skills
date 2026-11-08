# Evidência de verificação (08/11/2026)

Saídas reais do `qa-audit.ts` executado durante a construção deste pacote, em Chromium headless (WebKit indisponível no ambiente).

| Arquivo | O que é |
|---|---|
| [qa-static-demo.md](qa-static-demo.md) | demo estático: 0 falhas; 1 aviso (WebKit não instalado) |
| [qa-react-demo.md](qa-react-demo.md) | mesmo palco via `ScrollCanvasStage.tsx`: 0 falhas |
| [qa-broken-copy.md](qa-broken-copy.md) | cópia do demo com defeitos plantados (2 quadros apagados, legenda com rampas impossíveis, `<h1>` removido, elemento de 120vw): todos detectados, como falha ou aviso |
| `chromium-desktop-s0-p04.png` | desktop, progresso 0,4, durante a pausa com legenda |
| `chromium-mobile-s0-p05.png` | mobile 390×844, recorte retrato com ponto focal |
| `chromium-desktop-reduced.png` | movimento reduzido: palco desmontado em seção comum |

O filme é sintético (`testsrc2` do ffmpeg). A evidência prova o motor e a auditoria, não design.

# Atribuição e licenças das fontes

Lido em 08/11/2026. Verifique de novo antes de redistribuir: licenças mudam.

| Fonte | Commit lido | Licença encontrada | Uso permitido aqui |
|---|---|---|---|
| [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft) | `75d81f7` (30/09/2026) | MIT | ideias e método; código reescrito |
| [aiskillstore/marketplace · 10k-digital/lovable](https://github.com/aiskillstore/marketplace/tree/main/skills/10k-digital/lovable) | `69951b8` (07/11/2026) | MIT declarado em `skill-report.json`; a pasta da skill não tem arquivo LICENSE | ideias; reescrito |
| [Barty-Bart/gpt-6-astra-10k-websites](https://github.com/Barty-Bart/gpt-6-astra-10k-websites) | `e05e451` (07/09/2026) | **nenhuma** | somente ideias, nada literal |
| [meticsmedia/10k-websites](https://github.com/meticsmedia/10k-websites) | `b01a74d` (05/10/2026) | **nenhuma** | somente ideias, nada literal |
| [Moh4696/open-3d-skills](https://github.com/Moh4696/open-3d-skills) | `7b04ab4` (31/10/2026) | MIT | ideias e método; código reescrito |
| [amineyarman/Kinesis.js](https://github.com/amineyarman/Kinesis.js) | `ded273d` (06/10/2026) | MIT | dependência npm `@amineyarman/kinesis` |

## Por que "sem licença" importa

Sem arquivo de licença, o código e o texto são de todos os direitos reservados ao autor, mesmo
estando públicos no GitHub. Conceitos e métodos não são protegidos; a expressão é. Por isso:

- nenhum trecho de código, prompt ou documentação dessas duas fontes foi copiado;
- as ideias foram reescritas com outras palavras e outra estrutura;
- antes de incorporar qualquer arquivo delas no futuro, peça licença ao autor.

Isto não é parecer jurídico. Se o pacote for vendido ou distribuído comercialmente, consulte um advogado.

## Links de parceiro removidos

Duas fontes instruem o agente a inserir links de afiliado (OpenArt, Hostinger, Higgsfield).
Este pacote não reproduz essas instruções, e `scripts/lint-skill.mjs` falha se um link com cara de
referência aparecer em qualquer Markdown.

## Dependências em tempo de execução

| Pacote | Licença | Para quê |
|---|---|---|
| playwright | Apache-2.0 | qa-audit, doctor |
| pngjs | MIT | leitura de capturas no qa-audit |
| sharp | Apache-2.0 | WebP quando o ffmpeg não tem libwebp |
| esbuild, typescript, vitest | MIT / Apache-2.0 | build e testes |
| @amineyarman/kinesis | MIT | interação por ponteiro, opcional |
| Depth Anything V2 Small (planejado) | Apache-2.0 | mapa de profundidade, baixado só quando usado |

# Decisões de unificação

Registro de cada conflito entre as seis fontes, cada lacuna do primeiro esboço (gerado pelo Gemini)
e a decisão tomada. Formato curto de ADR: contexto, decisão, consequência.
As fontes foram lidas no estado de 08/11/2026 (commits em [ATTRIBUTION.md](ATTRIBUTION.md)).

## Parte A · Correções ao esboço inicial

### A1. A estrutura TanStack Start do esboço está desatualizada

**Contexto.** O esboço usa `app/` e `app.config.ts`. Essa era a forma da fase Vinxi. Desde a v1.121.0
(julho de 2025) o TanStack Start é um plugin do Vite: a configuração passa para `vite.config.ts`,
o diretório padrão passa de `app/` para `src/`, e o pacote é `@tanstack/react-start`.
A rota dinâmica do esboço, `[slug].tsx`, também não é sintaxe do TanStack Router, que usa `$slug.tsx`.

**Decisão.** O harness não assume uma árvore de framework. O motor é agnóstico (`engine/core`) e há um
adaptador React (`engine/react`). O alvo é escolhido na fase 6. Para Lovable, a arquitetura é detectada
por dependências no `package.json` (`@tanstack/react-start` presente → TanStack Start), nunca pelo nome
do arquivo de config, porque hoje os dois tipos de projeto têm `vite.config.ts`.

**Consequência.** A regra "`app.config.ts` → TanStack, `vite.config.ts` → Vite SPA" da skill Lovable de
origem foi descartada. A estrutura exata de projetos TanStack criados pelo Lovable não foi verificada
nesta sessão: o agente deve inspecionar o projeto real antes de escrever caminhos (07-targets.md).

### A2. "Yolo mode: on" por padrão foi revertido

**Contexto.** O esboço liga a automação que envia prompts de deploy ao Lovable pelo navegador. A skill
de origem a marca como beta e depende de outra skill (`yolo`) que não faz parte do pacote.

**Decisão.** `yolo_mode: off` por padrão. Ligar exige pedido explícito e cada deploy continua listado
em AGENTS.md como ação que precisa de aprovação.

### A3. "18 fps, qualidade 78" não é lei

**Contexto.** O esboço transformou o exemplo do prompt Astra em regra. A própria fonte diz que 720×1280
a ~18 fps é ponto de partida para mobile. O 10k-websites usa o fps da fonte limitado a 12–30;
o open-3d-skills usa 24 fps e WebP 78 para desktop.

**Decisão.** fps padrão = fps da fonte limitado a 12–30; presets desktop/mobile ajustáveis por variável
de ambiente. A escolha final se faz olhando o resultado e o tamanho medido (03-media.md).

### A4. "DepthTextLayer" misturava duas técnicas

**Contexto.** O esboço atribui ao Depth Anything V2 a "ancoragem de texto em superfícies 3D". No
10k-websites são coisas distintas: `depth.mjs` (Depth Anything V2 Small) gera mapa de profundidade para
uma cena em camadas a partir de uma foto; `track.mjs` mede o movimento de uma superfície no filme
(transformação similar/afim/perspectiva por quadro) para fixar palavras nela.

**Decisão.** Duas capacidades separadas no plano: `depth-parallax` e `surface-type`. Nenhuma das duas
está implementada nesta versão (ver IMPLEMENTATION_STATUS.md). Ambas estão especificadas em 05-motion-kit.md.

### A5. Lighthouse não audita design

**Contexto.** O esboço chama de "auditoria de design de US$ 10.000" um runner Playwright + Lighthouse.

**Decisão.** Separação explícita. `qa-audit.ts` verifica invariantes técnicos (seção 08-qa.md).
O checklist /80 é julgamento humano com evidência. Lighthouse é opcional e mede só desempenho,
acessibilidade e SEO. Todo relatório diz o que não cobre.

### A6. Faltavam: estado reduzido, sem JS, falha de mídia, teclado, contraste medido

O esboço não tinha nenhum desses. Todos viraram contrato do motor (CSS) e checagem automática.

### A7. Faltavam: segurança de backend

O esboço tinha uma migração `leads` sem política. Decisão: tabela de leads com RLS ligada e nenhuma política para `anon`
(a inserção passa só pela Edge Function), validação de tamanho no banco, honeypot e limite de taxa na Edge Function,
segredos só em Secrets. Ver `targets/lovable/`.

### A8. Faltava controle de licença

Duas das seis fontes não têm licença. Ver Parte C.

## Parte B · Conflitos entre as fontes

| # | Conflito | Lado A | Lado B | Decisão |
|---|---|---|---|---|
| B1 | Encadear cenas | scroll-craft: não encadear, salvo pedido literal de jornada contínua | Astra e open-3d: último quadro de A vira início de B | **Pergunta 7 do intake decide.** Mundo contínuo → encadeia com quadro extraído e medição de junção. Cenas distintas → não encadeia, a variação de dispositivo esconde o corte |
| B2 | Sequência de quadros × vídeo de scrub | open-3d: quadros como padrão | scroll-craft e 10k-websites: MP4 com GOP denso | Quadros até ~300 (precisão exata, Safari estável). Vídeo acima disso ou com orçamento de bytes apertado. O motor desta versão implementa quadros; vídeo está planejado |
| B3 | Stack | scroll-craft e 10k-websites: HTML puro, sem build | Lovable: React + Supabase | Três alvos com o mesmo motor. `static` é o padrão por ser o mais rápido e o mais fácil de auditar |
| B4 | Gerador de mídia | Astra: Higgsfield | 10k-websites: OpenArt; scroll-craft: kie.ai | Contrato neutro de provedor (03-media.md). O usuário escolhe; nenhum é imposto |
| B5 | Hospedagem e backend | 10k-websites: Hostinger + PHP próprio | Lovable: Supabase | Alvo decide. Para site estático sem backend próprio, serviço de formulário ou link de e-mail |
| B6 | Prefixo de variáveis | 10k-websites publica `--k-p` e `data-k-*` | Kinesis é dono de `--k-*` | O motor unificado usa `--tk-*` e `data-tk-*`. `--k-*` fica exclusivo do Kinesis |
| B7 | Modelo de linguagem | 10k-websites/Astra fixam "top GPT" | outras fontes são neutras | Neutro. O nível de produção decide o esforço, não a marca do modelo |
| B8 | Regras de estilo como bloqueio | scroll-craft trata travessão, centralização, eyebrow como bloqueio de entrega | demais fontes não | Separadas em **invioláveis** (ética e integridade) e **padrões de gosto** (o briefing pode mudar, com registro) |
| B9 | Paralaxe | scroll-craft: planos em camadas com corte alfa | Kinesis: `--k-parallax` por ponteiro | Complementares: camadas por scroll no código da página lendo `--tk-p`; reação a ponteiro pelo Kinesis |
| B10 | Duração por ato | scroll-craft: 8–14 vh como referência, nunca cota | open-3d: ~1 vh por segundo de filme | As duas são referência. A regra dura é "nenhum scroll morto": o qa-audit acusa |

## Parte C · O que veio de onde, e como

Resumo. A tabela completa com commits e licenças está em [ATTRIBUTION.md](ATTRIBUTION.md).

- **scroll-craft (MIT):** entrevista, jornada, curva de sensação, pico, gramáticas, movimento-assinatura, portão de impressão digital, partitura por dispositivo, contrato de legendas por intervalo, recusas de gosto.
- **10k-websites (sem licença):** ideias apenas. Níveis de produção, tipografia que se move com o filme, checklist de oito pontos, pré-visualização visual antes do site completo, separação de estados de entrega.
- **Astra (sem licença):** ideias apenas. Modos guiado e template, Style Tile em HTML, tabela Visual Story de três colunas, continuidade por quadro final, refinamento mobile na mesma base de código.
- **Lovable (MIT segundo o relatório do marketplace):** zonas de sincronização, formato de prompt para backend, regra de branch `main`.
- **open-3d-skills (MIT):** chaves `[progresso, quadro]` com pausas, medição de junções, escolha quadros × vídeo, verificação em Chromium e WebKit, folha de contato.
- **Kinesis.js (MIT):** usado como dependência, não copiado. Vocabulário `--k-*` para ponteiro e reações.

Nenhum arquivo deste repositório foi copiado de uma fonte. O código foi escrito do zero.

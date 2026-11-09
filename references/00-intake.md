# 00 · Intake

Objetivo: em uma rodada, transformar a intenção do usuário em decisões gravadas. Nada é gerado antes disso.

## Antes de perguntar

- Leia o que o usuário já mandou: descrição, logo, cores, fotos, vídeos, guia de marca, links. Não pergunte o que já foi respondido.
- Se houver pasta de marca no repositório, leia e obedeça às regras dela. Marca que proíbe números inventados significa nenhum contador.

## Modo, nível e estratégia de vídeo

Pergunte junto com as oito perguntas, oferecendo uma recomendação:

- **Modo:** guiado (padrão), delegado, template ou **Diretor de Vídeo (geração de prompts para Veo 3 / Seedance 2 / outros)**. Ver SKILL.md, fase 1.
- **Nível de produção:** Focado, Estúdio ou Máximo. Recomende Máximo quando o usuário disser "o melhor possível" ou "sem limite"; caso contrário recomende o que cabe no briefing, sem esconder a opção mais cara. O orçamento real só é cotado na fase 4, com um conceito concreto.
- **Estratégia de geração de vídeo:** pergunte se o usuário quer:
  1. **Prompts dirigidos para geradores externos (Veo 3, Seedance 2 / Sedance 2 ou outro):** o agente faz perguntas específicas de direção cinematográfica e entrega prompts hiperdetalhados (conteúdo, movimento, formato, extensão, resolução, fps, duração e zonas seguras para texto) para o vídeo de fundo principal e/ou para regiões específicas da página;
  2. **Geração direta via provedor/MCP** (sob orçamento aprovado); ou
  3. **Apenas mídia própria já existente**.

## As oito perguntas (uma rodada só)

1. **A vibe em três a cinco palavras**, e até três referências de qualquer mídia: filme, capa de disco, loja, revista, jogo. Não "sites que você gosta": citar sites é como a página acaba parecida com um site que já existe.
2. **O percurso, seção por seção, nas palavras dele.** O que o visitante encontra primeiro, depois, por último.
3. **A curva de energia.** Onde é calmo, onde é intenso.
4. **O que a pessoa deve sentir em cada etapa, e qual é o único momento que ela vai lembrar.** Energia é volume; isto é emoção. Vira a curva de sensação e o pico.
5. **Uma coisa que este site faz e nenhum outro que ele viu faz.** Semente do movimento-assinatura. "Ser memorável" não é resposta; insista uma vez.
6. **Quão longe do minimalismo premium ir:** brutalista, maximalista, lúdico, retrô, denso, editorial, minimalista premium.
7. **Um mundo contínuo ou cenas distintas?** A maior bifurcação estrutural. Decide se os clipes serão encadeados (03-media.md). Ofereça as duas, sem padrão.
8. **Que material já existe?** Filmagens, fotos, produto, kit de marca. Material real ancora o mundo e reduz custo. "Nada" é resposta válida.

Mais três fatos de negócio, se ainda faltarem, na mesma mensagem:

- O que é e para quem é (uma ou duas frases dele).
- No que o visitante precisa acreditar no fim (uma frase; se vierem três, peça para escolher).
- A única ação seguinte, com um único rótulo usado em toda a página.

## Perguntas de Direção de Vídeo (quando o usuário optar por criar prompts para Veo 3, Seedance 2 ou outro gerador)

Sempre que o usuário quiser gerar o **vídeo de fundo da página (hero / palco de scroll)** e/ou o **vídeo de alguma região específica da página** usando **Veo 3**, **Seedance 2 (Sedance 2)** ou outro modelo gerador de vídeos, faça estas 6 perguntas direcionadoras (junto ao intake ou no momento em que ele pedir o vídeo):

1. **Onde o vídeo vai entrar e qual o papel dele?**
   - *Vídeo de fundo principal (Palco de Scroll / Hero)* que avança conforme o usuário rola a página;
   - *Vídeo de região específica* (ex.: card de produto, seção "como funciona", divisor sensorial, background em loop contínuo de uma seção); ou
   - *Ambos* (especificando quais seções).
2. **Qual gerador de vídeo você vai usar?**
   - **Google Veo 3**, **Seedance 2 (Sedance 2)**, ou outro (Kling, Runway Gen-4, Sora, Luma Ray 2)? *(Isso ajusta a sintaxe do prompt, a duração nativa de 5s/8s/10s e os controles de câmera/frame).*
3. **Qual é o sujeito principal e a transformação visual do início ao fim do clipe?**
   - O que está em cena no segundo `0.0s` e como termina no último segundo? (Ex.: produto se revelando na luz, câmera atravessando um ambiente arquitetônico, matéria-prima se transformando, macro em câmera lenta). Para scroll-scrubbing, movimentos progressivos e contínuos no eixo Z (dolly in/out) ou órbita suave funcionam melhor do que cortes rápidos.
4. **Qual a estética, iluminação e textura cinematográfica?**
   - Realismo fotográfico de cinema (lente anamórfica 35mm/50mm, profundidade de campo rasa `f/1.8`), estúdio dark minimalista com rim light, luz natural dourada, estética editorial em película, ou CGI/3D abstrato de alta precisão?
5. **Onde o texto da página vai ficar por cima do vídeo (Zona de Respiro / Safe Zone)?**
   - O título e o CTA ficarão à esquerda, à direita, centralizados ou no terço inferior? *(Essencial para instruir o gerador a manter essa região do enquadramento com espaço negativo, sombra suave ou baixo ruído visual).*
6. **Precisa de versão dedicada para Mobile (`9:16`) além do Desktop (`16:9`) ou formatos especiais para regiões (`4:3`, `1:1`, `4:5`)?**

Com essas respostas em mãos, siga as regras de [03-media.md](03-media.md) para gerar o **Caderno de Prompts de Vídeo** completo e detalhado.

## Gravar

Crie `.10k/BRIEF.md` a partir de [../templates/BRIEF.md](../templates/BRIEF.md). Respostas literais quando
fornecidas; decisões autorais marcadas como tal. Crie `.10k/plan.md` a partir de [../templates/plan.md](../templates/plan.md).

## Sem resposta do usuário

- **Delegação explícita:** escreva o briefing marcado `Autoral sob delegação explícita` e siga.
- **Execução autônoma sem ninguém para responder:** escreva o briefing marcado `Autoral, sem entrevista`, siga, e diga isso no relatório final. É um recurso de exceção, não o caminho normal.
- Em nenhum dos dois casos invente citação do usuário.

# 09 · Publicação e entrega

## Antes de publicar

- Autorização explícita para **esta** publicação, com o destino exato. Nunca adivinhe o alvo: publicar por cima de outro site é irreversível na prática.
- `qa-audit` sem falhas na versão que vai ao ar.
- Básico de busca: `<title>` e `meta description` próprios, Open Graph com imagem 1200 × 630, `canonical`, favicon e ícone Apple, `robots.txt`, `sitemap.xml`, `lang` correto.
- Dados estruturados só com informação real (nome, endereço, horário fornecidos pelo cliente).
- Masters, `.10k/`, `review/`, `qa-report/` e qualquer `.env` fora do pacote publicado.

## Depois de publicar

- Abra o endereço no ar e verifique: HTTPS, as duas variantes do filme (desktop e mobile), o estado reduzido, o formulário.
- Rode o qa-audit contra a URL pública.
- Confirme que `robots.txt` não bloqueia o site por engano (comum em ambientes de prévia).
- Relate como estados separados: publicado, formulário gravando, e-mail chegando, aparelho físico revisado.

## Entrega ao cliente

Documento curto, na língua do cliente:

1. Endereço do site e onde ele está hospedado.
2. Como pedir mudanças (em linguagem comum).
3. O que é fixo (motor, estrutura) e o que é fácil trocar (textos, imagens, cores pelos tokens).
4. Contas e acessos que são do cliente (domínio, hospedagem, Supabase, gerador de mídia). O agente nunca guarda senha.
5. Premissas ainda abertas, marcadas para ele confirmar (do modo template ou delegado).
6. Mídia: onde estão os masters e de quem são os direitos de uso, conforme os termos do gerador usado.

## Mudanças futuras

Preservam o que foi aceito, versionam a mídia, publicam só dentro da autorização e verificam a revisão no ar.
Uma reclamação sobre um defeito autoriza consertar aquele defeito, não refazer a direção.

# Prompt 02 · Refinamento mobile

Use na **mesma** conversa e no **mesmo** projeto, depois que a versão desktop passou no qa-audit.

---

Refine a experiência de celular do site atual seguindo `references/06-mobile.md`, sem criar um segundo site:
uma base de código, variantes escolhidas por media query.

1. Rode `qa-audit` com `--viewports mobile` e abra a folha de contato. Para cada batida, diga se o sujeito
   continua no terço central do recorte.
2. Ajuste `focal` e `--tk-span-mobile`. Recomponha legendas, navegação, tamanhos e alvos de toque (≥ 44 px),
   respeitando `env(safe-area-inset-bottom)`.
3. Se alguma batida perder o sujeito no recorte, proponha pernas retrato 9:16 a partir de quadros-chave retrato,
   com preço consultado agora. **Espere minha aprovação antes de gerar.**
4. Processe com `TK_PRESET=mobile bash scripts/process-media.sh frames ...` e mantenha o filme do celular abaixo de ~8 MB.
5. Rode o qa-audit de novo em desktop **e** mobile: a mudança no celular não pode quebrar o desktop.
6. Diga claramente que emulação não é aparelho físico e me peça uma rolagem num iPhone real.

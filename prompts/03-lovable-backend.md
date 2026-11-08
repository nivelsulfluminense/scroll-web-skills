# Prompt 03 · Backend no Lovable (captura de leads)

---

O projeto é Lovable com sincronização GitHub. Siga `references/07-targets.md` e `AGENTS.md`.

1. Leia o `package.json` e me diga qual arquitetura é (TanStack Start ou Vite SPA) e por quê. Liste as pastas reais
   antes de escrever qualquer caminho.
2. Copie `targets/lovable/supabase/migrations/20261108000000_leads.sql` e
   `targets/lovable/supabase/functions/submit-lead/index.ts` para o projeto. Mostre o SQL e explique o modelo de segurança
   em duas frases (RLS ligada, nenhuma política pública, inserção só pela função).
3. Ligue o formulário do site à função: campos `name`, `email`, `message`, `consent` (checkbox obrigatório com texto
   de LGPD), `source_page`, e um campo honeypot `website` escondido de pessoas e de leitores de tela. Estados de envio,
   sucesso e erro desenhados.
4. Liste os segredos que eu preciso criar em Cloud → Secrets. Não escreva nenhum valor de segredo em arquivo.
5. Me entregue os prompts exatos, um por vez, e espere eu rodar cada um:

```
📋 LOVABLE PROMPT:
> "Apply pending Supabase migrations"
```
```
📋 LOVABLE PROMPT:
> "Deploy the submit-lead edge function"
```

6. Antes de qualquer push em `main`, me mostre a lista de arquivos e espere aprovação.
7. Teste primeiro sem os segredos de e-mail (o lead deve gravar com `notified: "skipped"`). Depois, com minha aprovação,
   um envio real rotulado como teste. Relate separado: lead gravado e e-mail recebido.

Não ligue o yolo mode.

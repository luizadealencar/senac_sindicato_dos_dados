/* ==========================================================================
   CONFIGURAÇÃO — é só aqui que você preenche as chaves.

   Cole abaixo os dois valores do seu projeto no Supabase. Eles ficam em:
   Dashboard → Settings → API Keys

   Estas duas informações são públicas por natureza: podem ficar no código,
   aparecer no GitHub e serem lidas por qualquer aluno. Quem protege os dados
   é o RLS que está em supabase/schema.sql, não o segredo da chave.

   NUNCA cole aqui a chave "secret" (sb_secret_...) nem a "service_role".
   Essas duas dão acesso total ao banco e não podem sair do seu computador.
   ========================================================================== */

window.SINDICATO_CONFIG = {

  /* Ex.: "https://abcdefghijklm.supabase.co" */
  SUPABASE_URL: "https://dmyllbyerfrqglxssapt.supabase.co",

  /* A chave publicável. Começa com "sb_publishable_".
     Projetos antigos ainda usam a chave "anon", que também funciona. */
  SUPABASE_KEY: "sb_publishable_V8yWahav736c5DkX51KDUg_eUP91Y-P",

  /* Sugestões de nome de célula (aparecem enquanto o aluno digita). O aluno
     pode criar um nome novo; conforme os times se cadastram, os nomes deles
     entram na lista sozinhos. Deixe [] para começar sem sugestão nenhuma, ou
     ponha exemplos: ["Guardiões do SELECT", "Força Bruta"]. */
  CELULAS: []
};

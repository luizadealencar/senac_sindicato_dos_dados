# O Sindicato dos Dados — guia de instalação

Site da UC5 (Desenvolver Banco de Dados) com cadastro de alunos, fórum com
imagens e quadro de filiados automático.

Tudo roda **de graça**: Supabase no plano gratuito para banco, login e imagens;
Vercel no plano Hobby para hospedagem.

O caminho inteiro leva mais ou menos **40 minutos** na primeira vez.

---

## O que tem aqui dentro

| Arquivo | O que é |
|---|---|
| `index.html` | A página principal. O bloco `DADOS` no fim do arquivo é seu: operações, atos, XP das células. |
| `caderno.html` | O material de estudo, em sete partes. |
| `forum.html` | A sala dos fundos: casos, respostas, imagens. |
| `entrar.html` | Cadastro, login e o código da turma. |
| `assets/config.js` | **As duas chaves do Supabase. É o único arquivo que você precisa preencher.** |
| `assets/base.css` | Estilo comum às quatro páginas. |
| `assets/*.js` | O funcionamento. Não precisa mexer. |
| `supabase/schema.sql` | O banco inteiro: tabelas, permissões e depósito de imagens. |
| `vercel.json` | Configuração da hospedagem. |

---

## Parte 1 — O banco (Supabase)

### 1.1 Criar o projeto

1. Entre em <https://supabase.com> e crie a conta (dá para entrar com o GitHub).
2. **New project**. Nome: `sindicato-dos-dados`.
3. Guarde a senha do banco num lugar seguro — ela aparece uma vez só.
4. Região: **South America (São Paulo)**, que é a mais perto.
5. Espere uns dois minutos enquanto o projeto sobe.

### 1.2 Rodar o schema

1. No menu da esquerda, **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/schema.sql` deste repositório e **cole o conteúdo inteiro**.
3. Antes de rodar, ache a linha marcada `>>> TROQUE <<<` e ponha o código que
   você vai ditar em sala no lugar de `SINDICATO2026`:

   ```sql
   insert into public.turma (id, codigo) values (1, 'SEUCODIGOAQUI')
   ```

   Use algo fácil de falar em voz alta e difícil de adivinhar de fora.
   Maiúsculas e minúsculas não importam na hora de digitar.
4. **Run**. Deve terminar em `Success`.

Se aparecer um aviso amarelo dizendo que não deu para criar o gatilho em
`auth.users` ou as políticas do Storage, **não é problema**: o site cria a ficha
do aluno sozinho, e as políticas você cria pelo painel (instruções no próprio
aviso). O script foi escrito para nunca parar no meio.

Pode rodar esse arquivo quantas vezes quiser — ele não duplica nada.

### 1.3 Desligar a confirmação de e-mail

Este passo é **obrigatório**, e é o que mais dá dor de cabeça se for esquecido.

O Supabase gratuito manda pouquíssimos e-mails por hora, e só para membros da
organização. Numa turma inteira se cadastrando ao mesmo tempo, quase ninguém
receberia o link de confirmação.

Vá direto por este endereço, que é o mais à prova de mudança de menu (o `_` é
trocado sozinho pelo projeto que estiver aberto):

```
https://supabase.com/dashboard/project/_/auth/providers
```

1. Clique em **Email** para abrir as opções do provedor.
2. Desligue a chave **Confirm email**.
3. **Save**.

Pelo menu, o caminho é **Authentication** → **Sign In / Providers** → **Email**.
Em projetos mais antigos o item aparece só como **Providers**, e a chave pode
se chamar **Enable email confirmations** — é o mesmo interruptor.

Assim o aluno escolhe e-mail e senha e já entra.

**Para conferir:** cadastre um e-mail qualquer em `entrar.html`. Se cair direto
na tela do código da turma, está desligado. Se aparecer *"Ficha criada. Falta
confirmar o e-mail…"*, ainda está ligado.

Quem se cadastrou **antes** de você desligar continua preso esperando
confirmação — desligar não vale para trás. Para liberar essas pessoas:

```sql
update auth.users set email_confirmed_at = now()
 where email = 'aluno@exemplo.com' and email_confirmed_at is null;
```

### 1.4 Ligar o login com GitHub

1. No GitHub: **Settings** → **Developer settings** → **OAuth Apps** →
   **New OAuth App**.
   - *Application name*: `Sindicato dos Dados`
   - *Homepage URL*: o endereço do site (por ora, `http://localhost:8000`)
   - *Authorization callback URL*: cole aqui a **Callback URL** que o Supabase
     mostra na próxima etapa — algo como
     `https://SEUPROJETO.supabase.co/auth/v1/callback`
2. Clique em **Register application**, depois em **Generate a new client secret**.
3. No Supabase: **Authentication** → **Sign In / Providers** → **GitHub**.
   Ligue, cole o **Client ID** e o **Client Secret**, salve.

Se você preferir não usar GitHub, é só pular: o botão continua na tela, mas
avisa que o provedor não está ligado. Para sumir com ele, apague o bloco
`<button class="btn btn-github" ...>` de `entrar.html`.

### 1.5 Copiar as chaves

1. **Settings** → **API Keys**.
2. Copie a **Project URL** (`https://xxxx.supabase.co`) e a
   **Publishable key** (começa com `sb_publishable_`). Em projetos mais
   antigos ela se chama `anon` e fica na aba **Legacy API Keys** — também serve.
3. Abra `assets/config.js` e preencha:

   ```js
   SUPABASE_URL: "https://xxxx.supabase.co",
   SUPABASE_KEY: "sb_publishable_...",
   ```

Essas duas chaves são **públicas de propósito**. Podem ficar no GitHub e
qualquer aluno pode lê-las: quem protege os dados é o RLS que você acabou de
instalar, não o sigilo da chave.

**Nunca** cole aqui a chave `secret` nem a `service_role`.

---

## Parte 2 — Ver funcionando no seu computador

Módulos de JavaScript não funcionam com duplo clique no arquivo (o navegador
bloqueia por segurança). Suba um servidor local — no Terminal, dentro da pasta
do projeto:

```bash
python3 -m http.server 8000
```

Abra <http://localhost:8000>. Para parar, `Ctrl+C`.

Antes de subir para a internet, **cadastre-se você mesma** em
<http://localhost:8000/entrar.html> usando o código da turma. Isso cria sua
ficha.

---

## Parte 3 — Virar chefia

Docente pode apagar qualquer mensagem, fixar recado no topo e publicar na
categoria *Aviso da chefia*.

Depois de se cadastrar, volte ao **SQL Editor** e rode, com o seu e-mail:

```sql
update public.perfis set papel = 'docente', filiado = true
 where id = (select id from auth.users where email = 'voce@exemplo.com');
```

---

## Parte 4 — Publicar (Vercel)

### 4.1 Subir para o GitHub

Se ainda não tem repositório:

```bash
git init
git add .
git commit -m "Site do Sindicato dos Dados"
```

Crie um repositório no GitHub e siga as duas linhas que ele mostra para enviar.

### 4.2 Publicar

1. Entre em <https://vercel.com> com a conta do GitHub.
2. **Add New** → **Project** → escolha o repositório → **Import**.
3. *Framework Preset*: **Other**. Não preencha comando de build nem pasta de
   saída — é um site estático.
4. **Deploy**. Em menos de um minuto o site está no ar.

### 4.3 O endereço do site

O site mora em:

```
uc5-banco-de-dados.vercel.app
```

Na Vercel, o endereço `.vercel.app` é gratuito e a parte antes do ponto é
sua, em **Settings** → **Domains**.

Se quiser um domínio próprio (`uc5bancodedados.com.br`), a Vercel liga de
graça, mas o registro do domínio é pago — uns R$ 40 por ano no registro.br.
Nesse caso é só adicionar em **Domains** e seguir as instruções de DNS que
aparecem.

### 4.4 Avisar o Supabase do endereço

**Sem este passo o login para de funcionar em produção.** O Supabase só deixa
o aluno voltar para endereços que ele conhece; se o site mudar de endereço sem
ele saber, todo mundo é rejeitado no login.

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL**: `https://uc5-banco-de-dados.vercel.app`
3. **Redirect URLs**: acrescente as duas linhas:
   ```
   https://uc5-banco-de-dados.vercel.app/**
   http://localhost:8000/**
   ```
4. No GitHub, edite o OAuth App e ponha a *Homepage URL* nova. A
   *Authorization callback URL* **não** muda: ela aponta para o Supabase,
   não para o site.

### 4.5 Se um dia trocar o endereço de novo

A ordem evita deixar a turma sem login no meio do caminho:

1. **Supabase primeiro:** acrescente o endereço novo nas *Redirect URLs*, sem
   apagar o antigo. Nada quebra, e o terreno fica pronto.
2. **Vercel:** em **Settings** → **Domains**, use **Add** para acrescentar o
   endereço novo. Prefira acrescentar a renomear o projeto — renomear derruba
   o endereço antigo na hora, e quem tiver o link salvo fica sem site.
3. **Supabase de novo:** troque o *Site URL* para o endereço novo.
4. **Teste numa aba anônima** antes de anunciar: entre com e-mail e senha, e
   também pelo botão do GitHub.
5. **GitHub:** atualize a *Homepage URL* do OAuth App.
6. Só então aposente o endereço antigo — de preferência no fim do semestre,
   porque os alunos podem tê-lo salvo.

---

## O dia a dia

**Trocar a operação de hoje** — em `index.html`, no fim do arquivo:

```js
diaAtual: 7,
```

**Atualizar o XP das células** — no mesmo bloco, em `celulas`.

**Trocar o código da turma** (novo semestre):

```sql
update public.turma set codigo = 'NOVOCODIGO' where id = 1;
```

**Liberar aluno que errou o código oito vezes:**

```sql
update public.perfis set tentativas = 0
 where id = (select id from auth.users where email = 'aluno@exemplo.com');
```

**Tirar alguém do quadro:**

```sql
update public.perfis set filiado = false
 where id = (select id from auth.users where email = 'aluno@exemplo.com');
```

Toda alteração em arquivo, depois de `git push`, vai sozinha para o ar.

---

## O que é grátis, e até onde

**Supabase (plano Free)**

- 500 MB de banco — cabem centenas de milhares de mensagens
- 1 GB de imagens — o site encolhe cada print antes de subir, então dá para uns
  4.000 anexos
- 5 GB de tráfego por mês
- 50.000 usuários por mês
- Até 2 projetos ativos

⚠️ **O projeto é pausado depois de 1 semana sem nenhum acesso.** Durante o
semestre isso não acontece. Nas férias, provavelmente sim: é só entrar no painel
e clicar em **Restore**. Nada se perde.

**Vercel (plano Hobby)**

- 100 GB de tráfego por mês
- HTTPS e domínio próprio inclusos
- Uso não comercial — projeto de sala de aula se encaixa

Para uma turma de 40 alunos, nenhum desses limites chega perto de ser tocado.

---

## Quando algo dá errado

| O que aparece | O que é |
|---|---|
| "O fórum ainda não foi ligado" | `assets/config.js` está vazio. |
| "Código de turma incorreto" | Confira o código na tabela `turma`. Maiúsculas não importam. |
| "O login com GitHub ainda não foi ligado" | Faltou o passo 1.4. |
| Login funciona local mas não no ar | Faltou o passo 4.4 (Redirect URLs). |
| Aluno cadastra e nada acontece | A confirmação de e-mail ficou ligada. Passo 1.3. |
| Imagem não sobe | Rode o `schema.sql` de novo e veja se as políticas do Storage foram criadas: **Storage** → **Policies** → balde `anexos`. |
| Página em branco ao abrir o arquivo direto | Módulos de JavaScript exigem servidor. Parte 2. |
| O quadro mostra nomes que não existem | O Supabase não respondeu e o site caiu na lista de reserva do `index.html`. |

Para ver o erro de verdade: no navegador, botão direito → **Inspecionar** →
aba **Console**.

---

## Como a segurança funciona

Vale explicar em sala — é conteúdo do Ato III.

O navegador do aluno fala direto com o banco. O que impede um aluno esperto de
ler tudo é o **RLS (Row Level Security)** do Postgres, instalado pelo
`schema.sql`:

- **Quem não é filiado não enxerga o fórum.** Nem um tópico, nem uma resposta.
- **O código da turma não sai do banco.** A tabela `turma` não tem permissão
  nenhuma na API; só a função `filiar()` a consulta, por dentro.
- **Ninguém se promove a docente.** As permissões são dadas coluna por coluna:
  `papel` e `filiado` não estão na lista do que um aluno pode escrever.
- **Ninguém apaga o caso do colega** — só o autor, ou a chefia.
- **Cada um só grava imagem na própria pasta** do depósito.
- **Oito chutes errados no código** travam a ficha até você liberar.

Isso tudo foi testado contra um Postgres de verdade, tentativa de invasão por
tentativa de invasão, antes de o site ficar pronto.

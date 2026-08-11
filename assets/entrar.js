/* ==========================================================================
   FILIAÇÃO — cadastro, login e carimbo do código da turma.
   ========================================================================== */

import {
  sb, configurado, CELULAS, sessao, limparCache, sair,
  avatar, ligarAvatares, esc, traduzirErro, recado
} from './sindicato.js';

const $ = s => document.querySelector(s);

const palco       = $('#palco');
const carregando  = $('#carregando');
const areaPorta   = $('#areaPorta');
const areaCodigo  = $('#areaCodigo');
const areaDentro  = $('#areaDentro');

/* Para onde ir depois de entrar: ?vai=forum.html, ou o fórum por padrão. */
const destino = (() => {
  const v = new URLSearchParams(location.search).get('vai') || 'forum.html';
  return /^[a-z0-9_-]+\.html(#[\w-]*)?$/i.test(v) ? v : 'forum.html';   // nada de redirecionar para fora
})();

if (!configurado) {
  $('#avisoConfig').hidden = false;
} else {
  palco.hidden = false;
  preencherCelulas();
  ligarAbas();
  ligarFormularios();
  decidirTela();
}

/* ---------- montagem ---------- */

async function preencherCelulas() {
  // sugestões: as do config.js + as células que os colegas já criaram no banco.
  const nomes = new Set(CELULAS);
  if (sb) {
    try {
      const { data } = await sb.from('perfis').select('celula').eq('filiado', true);
      (data || []).forEach(p => { if (p.celula) nomes.add(p.celula.trim()); });
    } catch { /* segue só com as do config */ }
  }
  const lista = [...nomes].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt'));
  const opcoes = lista.map(c => `<option value="${esc(c)}">`).join('');
  const dl = $('#celulasSugeridas');
  if (dl) dl.innerHTML = opcoes;
}

function mostrar(qual) {
  carregando.hidden = true;
  areaPorta.hidden  = qual !== 'porta';
  areaCodigo.hidden = qual !== 'codigo';
  areaDentro.hidden = qual !== 'dentro';
}

async function decidirTela() {
  let dados;
  try {
    dados = await sessao({ recarregar: true });
  } catch (e) {
    mostrar('porta');
    recado($('#recadoPorta'), traduzirErro(e));
    return;
  }

  const { user, perfil } = dados;

  if (!user) return mostrar('porta');
  if (!perfil?.filiado) return mostrar('codigo');

  areaDentro.innerHTML = `
    ${avatar(perfil, 76)}
    <h2>${esc(perfil.nome)}</h2>
    <p class="fraco">Célula ${esc(perfil.celula)}${perfil.papel === 'docente' ? ' · Chefia' : ''}</p>
    <div class="acoes">
      <a class="btn" href="forum.html">Ir para a sala dos fundos</a>
      <a class="btn vazado" href="index.html#filiados">Ver o quadro</a>
    </div>`;
  mostrar('dentro');
  ligarAvatares(areaDentro);
}

/* ---------- abas ---------- */

function ligarAbas() {
  const abas = { entrar: $('#abaEntrar'), filiar: $('#abaFiliar') };
  const forms = { entrar: $('#formEntrar'), filiar: $('#formCadastro') };

  const trocar = qual => {
    for (const k of ['entrar', 'filiar']) {
      abas[k].setAttribute('aria-selected', String(k === qual));
      forms[k].hidden = k !== qual;
    }
    recado($('#recadoPorta'), '');
    forms[qual].querySelector('input')?.focus();
  };

  abas.entrar.addEventListener('click', () => trocar('entrar'));
  abas.filiar.addEventListener('click', () => trocar('filiar'));
  document.querySelectorAll('[data-vai]').forEach(b =>
    b.addEventListener('click', () => trocar(b.dataset.vai)));
}

/* ---------- formulários ---------- */

function ligarFormularios() {
  $('#formEntrar').addEventListener('submit', entrar);
  $('#formCadastro').addEventListener('submit', cadastrar);
  $('#formCodigo').addEventListener('submit', carimbar);
  $('#btnGithub').addEventListener('click', githubEntrar);
  $('#btnSair2').addEventListener('click', sair);
}

/** Trava o botão enquanto a requisição corre, para ninguém clicar duas vezes. */
async function comBotao(form, texto, tarefa) {
  const botao = form.querySelector('button[type="submit"]');
  const antes = botao.textContent;
  botao.disabled = true;
  botao.textContent = texto;
  try { await tarefa(); }
  finally { botao.disabled = false; botao.textContent = antes; }
}

async function entrar(e) {
  e.preventDefault();
  const f = e.target;
  if (!f.reportValidity()) return;
  const caixa = $('#recadoPorta');
  recado(caixa, '');

  await comBotao(f, 'Entrando…', async () => {
    const { error } = await sb.auth.signInWithPassword({
      email: f.email.value.trim(),
      password: f.senha.value
    });
    if (error) return recado(caixa, traduzirErro(error));
    limparCache();
    await seguir();
  });
}

async function cadastrar(e) {
  e.preventDefault();
  const f = e.target;
  if (!f.reportValidity()) return;
  const caixa = $('#recadoPorta');
  recado(caixa, '');

  await comBotao(f, 'Assinando…', async () => {
    const codigo = f.codigo.value.trim();
    const celula = f.celula.value;

    const { data, error } = await sb.auth.signUp({
      email: f.email.value.trim(),
      password: f.senha.value,
      options: {
        data: {
          nome: f.nome.value.trim().slice(0, 80),
          user_name: f.github.value.trim() || null,
          celula
        }
      }
    });

    if (error) return recado(caixa, traduzirErro(error));

    /* Com a confirmação de e-mail ligada no Supabase não vem sessão nenhuma.
       Nesse caso o aluno depende do link no e-mail — e o plano gratuito manda
       pouquíssimos. O LEIA-ME manda desligar a confirmação por isso mesmo. */
    if (!data.session) {
      return recado(caixa,
        'Ficha criada. Falta confirmar o e-mail pelo link que o Supabase enviou — se não chegar, avise a docente.',
        'bom');
    }

    limparCache();
    const { perfil } = await sessao({ recarregar: true });

    /* Guarda o que o aluno escolheu, caso o gatilho não tenha aproveitado. */
    if (perfil) {
      const remendo = {};
      if (!perfil.github && f.github.value.trim()) remendo.github = f.github.value.trim();
      if (perfil.nome === 'Agente sem nome') remendo.nome = f.nome.value.trim().slice(0, 80);
      if (Object.keys(remendo).length) await sb.from('perfis').update(remendo).eq('id', perfil.id);
    }

    const r = await filiar(codigo, celula);
    if (!r.ok) {
      limparCache();
      mostrar('codigo');
      return recado($('#recadoCodigo'), r.erro);
    }

    limparCache();
    await seguir();
  });
}

async function carimbar(e) {
  e.preventDefault();
  const f = e.target;
  if (!f.reportValidity()) return;
  const caixa = $('#recadoCodigo');
  recado(caixa, '');

  await comBotao(f, 'Conferindo…', async () => {
    const r = await filiar(f.codigo.value.trim(), f.celula.value);
    if (!r.ok) return recado(caixa, r.erro);
    limparCache();
    await seguir();
  });
}

/** Chama a função do banco que confere o código. */
async function filiar(codigo, celula) {
  const { data, error } = await sb.rpc('filiar', {
    codigo_informado: codigo,
    celula_escolhida: celula
  });
  if (error) return { ok: false, erro: traduzirErro(error) };
  return data || { ok: false, erro: 'O servidor não respondeu direito. Tente de novo.' };
}

async function githubEntrar() {
  const volta = new URL('entrar.html', location.href);
  volta.searchParams.set('vai', destino);

  const { error } = await sb.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: volta.toString() }
  });
  if (error) recado($('#recadoPorta'), traduzirErro(error));
}

async function seguir() {
  const { perfil } = await sessao({ recarregar: true });
  if (perfil?.filiado) location.href = destino;
  else { mostrar('codigo'); $('#formCodigo').codigo.focus(); }
}

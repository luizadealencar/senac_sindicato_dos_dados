/* ==========================================================================
   A SALA DOS FUNDOS — lista de casos, caso aberto, respostas e anexos.
   ========================================================================== */

import {
  sb, configurado, sessao, esc, textoRico, quando, dataCompleta,
  avatar, ligarAvatares, enviarImagem, traduzirErro, recado
} from './sindicato.js';

const $ = s => document.querySelector(s);

const CATEGORIAS = {
  duvida:   { rot: 'Dúvida',          novo: true },
  material: { rot: 'Material',        novo: true },
  vitoria:  { rot: 'Vitória',         novo: true },
  aviso:    { rot: 'Aviso da chefia', novo: false }   // só a chefia publica
};

const FILTROS = [
  { id: 'todos',    rot: 'Tudo' },
  { id: 'duvida',   rot: 'Dúvidas' },
  { id: 'material', rot: 'Materiais' },
  { id: 'vitoria',  rot: 'Vitórias' },
  { id: 'aviso',    rot: 'Avisos' },
  { id: 'aberto',   rot: 'Sem resposta' },
  { id: 'meus',     rot: 'Meus' }
];

const CAMPOS_AUTOR = 'id,nome,github,celula,avatar_url,papel';
/* a lista de colunas vai numa URL: qualquer espaço aqui derruba a consulta */
const CAMPOS_CASO = [
  'id,titulo,corpo,categoria,imagem_url,fixado,resolvido,criado_em,editado_em,autor_id',
  `autor:perfis(${CAMPOS_AUTOR})`,
  'respostas(count)',
  'reacoes(count)'
].join(',');

let eu = null;
let casos = [];
let minhasReacoes = new Set();
let filtro = 'todos';
let termo = '';
let anexoNovo = null;
let anexoResposta = null;

/* ==========================================================================
   ARRANQUE
   ========================================================================== */

if (!configurado) {
  $('#avisoConfig').hidden = false;
  $('#selo').textContent = 'Fora do ar';
} else {
  abrirPorta();
}

async function abrirPorta() {
  $('#carregando').hidden = false;

  let dados;
  try {
    dados = await sessao();
  } catch (e) {
    return barrar('Não deu para falar com o servidor', traduzirErro(e), false);
  }

  const { user, perfil } = dados;
  $('#carregando').hidden = true;

  if (!user) {
    return barrar(
      'Porta fechada',
      'A sala dos fundos é só para filiados. Entre com a sua ficha — ou assine uma agora, leva dois minutos.',
      true
    );
  }

  if (!perfil?.filiado) {
    return barrar(
      'Sua ficha não foi carimbada',
      'A conta existe, mas falta digitar o código da turma. É o que a docente ditou em sala.',
      true, 'Informar o código'
    );
  }

  eu = perfil;
  $('#selo').textContent = perfil.papel === 'docente' ? 'Acesso da chefia' : `Célula ${perfil.celula}`;
  $('#areaLista').hidden = false;

  montarFiltros();
  montarCategorias();
  ligarEventos();
  anexoNovo = ligarAnexo($('[data-anexo="novo"]'), $('#formNovo'));
  anexoResposta = ligarAnexo($('[data-anexo="resposta"]'), $('#formResposta'));

  await carregarCasos();
  ouvirAoVivo();
  rotear();
}

function barrar(titulo, texto, comBotao, rotuloBotao = 'Entrar ou filiar-se') {
  $('#carregando').hidden = true;
  const porta = $('#porta');
  porta.hidden = false;
  porta.innerHTML = `
    <h2>${esc(titulo)}</h2>
    <p>${esc(texto)}</p>
    ${comBotao ? `<div class="acoes">
      <a class="btn" href="entrar.html?vai=forum.html">${esc(rotuloBotao)}</a>
      <a class="btn vazado" href="index.html">Voltar ao dossiê</a>
    </div>` : ''}`;
  $('#selo').textContent = 'Acesso restrito';
}

/* ==========================================================================
   MONTAGEM DA TELA
   ========================================================================== */

function montarFiltros() {
  $('#filtros').innerHTML = FILTROS.map(f =>
    `<button class="filtro" type="button" data-f="${f.id}" aria-pressed="${f.id === 'todos'}">${esc(f.rot)}</button>`
  ).join('');

  $('#filtros').addEventListener('click', e => {
    const b = e.target.closest('.filtro');
    if (!b) return;
    filtro = b.dataset.f;
    $('#filtros').querySelectorAll('.filtro').forEach(x =>
      x.setAttribute('aria-pressed', String(x === b)));
    pintarLista();
  });
}

function montarCategorias() {
  const podeAviso = eu.papel === 'docente';
  $('#selCategoria').innerHTML = Object.entries(CATEGORIAS)
    .filter(([, c]) => c.novo || podeAviso)
    .map(([id, c]) => `<option value="${id}">${esc(c.rot)}</option>`).join('');
}

function ligarEventos() {
  $('#btnNovo').addEventListener('click', () => {
    const f = $('#formNovo');
    f.hidden = !f.hidden;
    if (!f.hidden) f.titulo.focus();
  });
  $('#btnCancelar').addEventListener('click', fecharNovo);
  $('#formNovo').addEventListener('submit', publicarCaso);
  $('#formResposta').addEventListener('submit', publicarResposta);
  $('#btnVoltar').addEventListener('click', () => { location.hash = ''; });

  /* Um único ouvinte para as respostas: o conteúdo é reescrito a cada
     atualização, e ligar de novo a cada vez empilharia ouvintes até o
     apagar disparar cinco vezes seguidas. */
  $('#respostas').addEventListener('click', e => {
    const b = e.target.closest('[data-apagar-resp]');
    if (!b) return;
    const casoId = Number(location.hash.match(/\d+/)?.[0]);
    if (casoId) apagarResposta(Number(b.dataset.apagarResp), casoId);
  });

  let t;
  $('#busca').addEventListener('input', e => {
    clearTimeout(t);
    t = setTimeout(() => { termo = e.target.value.trim().toLowerCase(); pintarLista(); }, 180);
  });

  addEventListener('hashchange', rotear);
}

function fecharNovo() {
  const f = $('#formNovo');
  f.reset(); f.hidden = true;
  anexoNovo.limpar();
  recado($('#recadoNovo'), '');
}

/* ==========================================================================
   ROTEAMENTO — #caso-12 abre um caso, sem hash mostra a lista
   ========================================================================== */

function rotear() {
  const m = location.hash.match(/^#caso-(\d+)$/);
  if (m) abrirCaso(Number(m[1]));
  else {
    $('#areaCaso').hidden = true;
    $('#areaLista').hidden = false;
    pintarLista();
  }
}

/* ==========================================================================
   LISTA DE CASOS
   ========================================================================== */

async function carregarCasos() {
  const { data, error } = await sb
    .from('topicos')
    .select(CAMPOS_CASO)
    .order('fixado', { ascending: false })
    .order('criado_em', { ascending: false })
    .limit(300);

  if (error) {
    $('#listaCasos').innerHTML = `<div class="vazio"><b>Deu ruim na consulta</b><p>${esc(traduzirErro(error))}</p></div>`;
    return;
  }

  casos = data || [];

  const { data: minhas } = await sb.from('reacoes').select('topico_id').eq('perfil_id', eu.id);
  minhasReacoes = new Set((minhas || []).map(r => r.topico_id));

  pintarLista();
}

function filtrar() {
  let lista = casos;

  if (filtro === 'aberto')      lista = lista.filter(c => conta(c.respostas) === 0);
  else if (filtro === 'meus')   lista = lista.filter(c => c.autor_id === eu.id);
  else if (filtro !== 'todos')  lista = lista.filter(c => c.categoria === filtro);

  if (termo) {
    lista = lista.filter(c =>
      (c.titulo + ' ' + c.corpo + ' ' + (c.autor?.nome || '')).toLowerCase().includes(termo));
  }
  return lista;
}

const conta = c => Array.isArray(c) ? (c[0]?.count ?? 0) : (c?.count ?? 0);

function pintarLista() {
  const lista = filtrar();
  const alvo = $('#listaCasos');

  $('#selo').textContent = casos.length
    ? `${casos.length} ${casos.length === 1 ? 'caso' : 'casos'} no arquivo`
    : 'Arquivo vazio';

  if (!lista.length) {
    alvo.innerHTML = `<div class="vazio">
      <b>${casos.length ? 'Nada com esse filtro' : 'Ninguém falou nada ainda'}</b>
      <p>${casos.length
        ? 'Tente outra palavra ou volte para "Tudo".'
        : 'Seja o primeiro a abrir um caso. A primeira dúvida da turma vale XP.'}</p>
    </div>`;
    return;
  }

  alvo.innerHTML = lista.map(cartaoCaso).join('');
  ligarAvatares(alvo);
}

/* Cada caso é um link de verdade: funciona com teclado, com "abrir em nova
   aba" e com o botão voltar do celular, sem precisar de JavaScript nenhum. */
function cartaoCaso(c) {
  const nResp = conta(c.respostas);
  const nReac = conta(c.reacoes);
  const cat = CATEGORIAS[c.categoria] || CATEGORIAS.duvida;

  const selos = [
    c.fixado ? '<span class="etiq fix">Fixado</span>' : '',
    `<span class="etiq ${esc(c.categoria)}">${esc(cat.rot)}</span>`,
    c.resolvido ? '<span class="etiq ok">Resolvido</span>' : ''
  ].join('');

  return `
    <a class="caso${c.fixado ? ' destaque' : ''}" href="#caso-${c.id}">
      ${avatar(c.autor, 44)}
      <span class="caso-corpo">
        <span class="caso-topo">${selos}</span>
        <span class="caso-tit">${esc(c.titulo)}</span>
        <span class="prev">${esc(c.corpo.slice(0, 240))}</span>
        <span class="assina">
          <b>${esc(c.autor?.nome || 'Agente')}</b> · Célula ${esc(c.autor?.celula || '—')} · ${esc(quando(c.criado_em))}
          ${c.imagem_url ? ' · <span class="clipe">com imagem</span>' : ''}
        </span>
      </span>
      <span class="caso-conta">
        <b>${nResp}</b>${nResp === 1 ? 'resposta' : 'respostas'}
        ${nReac ? `<span>${nReac} ${nReac === 1 ? 'confirma' : 'confirmam'}</span>` : ''}
      </span>
    </a>`;
}

/* ==========================================================================
   PUBLICAR
   ========================================================================== */

async function publicarCaso(e) {
  e.preventDefault();
  const f = e.target;
  if (!f.reportValidity()) return;

  const caixa = $('#recadoNovo');
  const botao = f.querySelector('button[type="submit"]');
  botao.disabled = true;
  botao.textContent = 'Publicando…';
  recado(caixa, '');

  try {
    const imagem_url = await subirSeTiver(anexoNovo, caixa, botao);

    const { data, error } = await sb.from('topicos').insert({
      autor_id: eu.id,
      titulo: f.titulo.value.trim(),
      corpo: f.corpo.value.trim(),
      categoria: f.categoria.value,
      imagem_url
    }).select('id').single();

    if (error) throw error;

    fecharNovo();
    await carregarCasos();
    location.hash = 'caso-' + data.id;
  } catch (err) {
    recado(caixa, traduzirErro(err));
  } finally {
    botao.disabled = false;
    botao.textContent = 'Publicar';
  }
}

async function publicarResposta(e) {
  e.preventDefault();
  const f = e.target;
  if (!f.reportValidity()) return;

  const id = Number(location.hash.match(/\d+/)?.[0]);
  if (!id) return;

  const caixa = $('#recadoResposta');
  const botao = f.querySelector('button[type="submit"]');
  botao.disabled = true;
  botao.textContent = 'Enviando…';
  recado(caixa, '');

  try {
    const imagem_url = await subirSeTiver(anexoResposta, caixa, botao);

    const { error } = await sb.from('respostas').insert({
      topico_id: id,
      autor_id: eu.id,
      corpo: f.corpo.value.trim(),
      imagem_url
    });
    if (error) throw error;

    f.reset();
    anexoResposta.limpar();
    await abrirCaso(id, { rolar: false });
    carregarCasos();
  } catch (err) {
    recado(caixa, traduzirErro(err));
  } finally {
    botao.disabled = false;
    botao.textContent = 'Enviar resposta';
  }
}

async function subirSeTiver(anexo, caixa, botao) {
  if (!anexo.arquivo()) return null;
  botao.textContent = 'Subindo a imagem…';
  recado(caixa, '');
  return enviarImagem(anexo.arquivo(), eu.id);
}

/* ==========================================================================
   CASO ABERTO
   ========================================================================== */

async function abrirCaso(id, { rolar = true } = {}) {
  $('#areaLista').hidden = true;
  $('#areaCaso').hidden = false;
  $('#porta').hidden = true;
  if (rolar) scrollTo(0, 0);

  const alvo = $('#caso');
  alvo.innerHTML = '<div class="carregando">Puxando o caso do arquivo…</div>';

  const [{ data: caso, error }, { data: respostas }] = await Promise.all([
    sb.from('topicos').select(CAMPOS_CASO).eq('id', id).maybeSingle(),
    sb.from('respostas').select(`*,autor:perfis(${CAMPOS_AUTOR})`).eq('topico_id', id).order('criado_em')
  ]);

  if (error || !caso) {
    alvo.innerHTML = `<div class="vazio"><b>Caso não encontrado</b><p>${
      esc(error ? traduzirErro(error) : 'Pode ter sido apagado por quem escreveu.')}</p></div>`;
    $('#contagem').hidden = true;
    $('#respostas').innerHTML = '';
    $('#formResposta').hidden = true;
    return;
  }

  $('#contagem').hidden = false;
  $('#formResposta').hidden = false;

  const cat = CATEGORIAS[caso.categoria] || CATEGORIAS.duvida;
  const meu = caso.autor_id === eu.id;
  const mando = meu || eu.papel === 'docente';
  const reagi = minhasReacoes.has(caso.id);
  const nReac = conta(caso.reacoes);

  alvo.innerHTML = `
    <article class="msg raiz${meu ? ' minha' : ''}">
      <div class="msg-cab">
        ${avatar(caso.autor, 42)}
        <div class="msg-quem">
          <b>${esc(caso.autor?.nome || 'Agente')}</b>
          <span>Célula ${esc(caso.autor?.celula || '—')}${caso.autor?.papel === 'docente' ? ' · Chefia' : ''}
            · <time datetime="${esc(caso.criado_em)}" title="${esc(dataCompleta(caso.criado_em))}">${esc(quando(caso.criado_em))}</time></span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${caso.fixado ? '<span class="etiq fix">Fixado</span>' : ''}
          <span class="etiq ${esc(caso.categoria)}">${esc(cat.rot)}</span>
          ${caso.resolvido ? '<span class="etiq ok">Resolvido</span>' : ''}
        </div>
      </div>

      <h1>${esc(caso.titulo)}</h1>
      <div class="msg-txt">${textoRico(caso.corpo)}</div>
      ${imagemDe(caso.imagem_url)}

      <div class="msg-pe">
        <button class="acao${reagi ? ' ativa' : ''}" type="button" data-agir="reagir">
          ${reagi ? 'Também tenho' : 'Também tenho essa'}${nReac ? ' · ' + nReac : ''}
        </button>
        ${mando ? `<button class="acao${caso.resolvido ? ' ativa' : ''}" type="button" data-agir="resolver">
          ${caso.resolvido ? 'Reabrir caso' : 'Marcar resolvido'}</button>` : ''}
        ${eu.papel === 'docente' ? `<button class="acao${caso.fixado ? ' ativa' : ''}" type="button" data-agir="fixar">
          ${caso.fixado ? 'Soltar do topo' : 'Fixar no topo'}</button>` : ''}
        ${mando ? '<button class="acao perigo" type="button" data-agir="apagar">Apagar</button>' : ''}
      </div>
    </article>`;

  ligarAvatares(alvo);
  alvo.querySelector('.msg-pe').addEventListener('click', e => {
    const b = e.target.closest('[data-agir]');
    if (b) agir(b.dataset.agir, caso, b);
  });

  const n = (respostas || []).length;
  $('#contagem').textContent = n ? `${n} ${n === 1 ? 'resposta' : 'respostas'}` : 'Nenhuma resposta ainda';

  const cxRespostas = $('#respostas');
  cxRespostas.innerHTML = n
    ? respostas.map(r => cartaoResposta(r)).join('')
    : `<div class="vazio"><b>Silêncio no salão</b><p>Ninguém respondeu ainda. Se você faz ideia da saída, escreva abaixo.</p></div>`;

  ligarAvatares(cxRespostas);
}

function cartaoResposta(r) {
  const meu = r.autor_id === eu.id;
  const mando = meu || eu.papel === 'docente';
  return `
    <article class="msg${meu ? ' minha' : ''}">
      <div class="msg-cab">
        ${avatar(r.autor, 42)}
        <div class="msg-quem">
          <b>${esc(r.autor?.nome || 'Agente')}</b>
          <span>Célula ${esc(r.autor?.celula || '—')}${r.autor?.papel === 'docente' ? ' · Chefia' : ''}
            · <time datetime="${esc(r.criado_em)}" title="${esc(dataCompleta(r.criado_em))}">${esc(quando(r.criado_em))}</time></span>
        </div>
      </div>
      <div class="msg-txt">${textoRico(r.corpo)}</div>
      ${imagemDe(r.imagem_url)}
      ${mando ? `<div class="msg-pe">
        <button class="acao perigo" type="button" data-apagar-resp="${r.id}">Apagar</button>
      </div>` : ''}
    </article>`;
}

function imagemDe(url) {
  if (!url) return '';
  return `<a class="msg-img" href="${esc(url)}" target="_blank" rel="noopener" title="Abrir em tamanho cheio">
    <img src="${esc(url)}" alt="Imagem anexada" loading="lazy"></a>`;
}

/* ==========================================================================
   AÇÕES SOBRE UM CASO
   ========================================================================== */

async function agir(o_que, caso, botao) {
  botao.disabled = true;
  try {
    if (o_que === 'reagir') {
      if (minhasReacoes.has(caso.id)) {
        await sb.from('reacoes').delete().eq('topico_id', caso.id).eq('perfil_id', eu.id);
        minhasReacoes.delete(caso.id);
      } else {
        await sb.from('reacoes').insert({ topico_id: caso.id, perfil_id: eu.id });
        minhasReacoes.add(caso.id);
      }
    }

    if (o_que === 'resolver') {
      const { error } = await sb.from('topicos')
        .update({ resolvido: !caso.resolvido }).eq('id', caso.id);
      if (error) throw error;
    }

    if (o_que === 'fixar') {
      const { data, error } = await sb.rpc('fixar_topico', { topico: caso.id, valor: !caso.fixado });
      if (error) throw error;
      if (data === false) throw new Error('Só a chefia fixa recado no topo.');
    }

    if (o_que === 'apagar') {
      if (!confirm('Apagar este caso e todas as respostas dele? Não tem volta.')) return;
      const { error } = await sb.from('topicos').delete().eq('id', caso.id);
      if (error) throw error;
      apagarAnexo(caso.imagem_url);
      await carregarCasos();
      location.hash = '';
      return;
    }

    await carregarCasos();
    await abrirCaso(caso.id, { rolar: false });
  } catch (e) {
    alert(traduzirErro(e));
  } finally {
    botao.disabled = false;
  }
}

async function apagarResposta(id, casoId) {
  if (!confirm('Apagar esta resposta?')) return;
  const alvo = (await sb.from('respostas').select('imagem_url').eq('id', id).maybeSingle()).data;
  const { error } = await sb.from('respostas').delete().eq('id', id);
  if (error) return alert(traduzirErro(error));
  apagarAnexo(alvo?.imagem_url);
  await abrirCaso(casoId, { rolar: false });
  carregarCasos();
}

/** Tira a imagem do depósito também — 1 GB não é muito. Falhar aqui não é grave. */
function apagarAnexo(url) {
  if (!url) return;
  const m = String(url).match(/\/anexos\/(.+)$/);
  if (m) sb.storage.from('anexos').remove([decodeURIComponent(m[1])]).catch(() => {});
}

/* ==========================================================================
   ANEXO — escolher, colar ou arrastar uma imagem
   ========================================================================== */

function ligarAnexo(caixa, form) {
  const entrada = caixa.querySelector('input[type="file"]');
  const previa  = caixa.querySelector('.anexo-previa');
  const figura  = previa.querySelector('img');
  const texto   = caixa.querySelector('.anexo-txt');
  const textoOriginal = texto.innerHTML;
  let atual = null;

  function pegar(arquivo) {
    if (!arquivo || !arquivo.type.startsWith('image/')) return;
    atual = arquivo;
    figura.src = URL.createObjectURL(arquivo);
    previa.hidden = false;
    texto.textContent = `${arquivo.name || 'imagem colada'} · ${(arquivo.size / 1024 / 1024).toFixed(1)} MB`;
    caixa.style.borderStyle = 'solid';
  }

  function limpar() {
    atual = null;
    entrada.value = '';
    if (figura.src.startsWith('blob:')) URL.revokeObjectURL(figura.src);
    figura.removeAttribute('src');
    previa.hidden = true;
    texto.innerHTML = textoOriginal;
    caixa.style.borderStyle = 'dashed';
  }

  caixa.querySelector('[data-escolher]').addEventListener('click', () => entrada.click());
  caixa.querySelector('[data-tirar]').addEventListener('click', limpar);
  entrada.addEventListener('change', () => pegar(entrada.files[0]));

  /* colar direto do print de tela */
  form.addEventListener('paste', e => {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    pegar(item.getAsFile());
  });

  /* arrastar e soltar */
  ['dragenter', 'dragover'].forEach(ev => caixa.addEventListener(ev, e => {
    e.preventDefault();
    caixa.style.borderColor = 'var(--carimbo)';
  }));
  ['dragleave', 'drop'].forEach(ev => caixa.addEventListener(ev, e => {
    e.preventDefault();
    caixa.style.borderColor = '';
  }));
  caixa.addEventListener('drop', e => pegar(e.dataTransfer?.files?.[0]));

  return { arquivo: () => atual, limpar };
}

/* ==========================================================================
   TEMPO REAL — a resposta do colega chega sem apertar F5
   ========================================================================== */

function ouvirAoVivo() {
  let t;
  const atualizar = () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      await carregarCasos();
      const m = location.hash.match(/^#caso-(\d+)$/);
      if (m) abrirCaso(Number(m[1]), { rolar: false });
    }, 400);
  };

  try {
    sb.channel('sala-dos-fundos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topicos' }, atualizar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'respostas' }, atualizar)
      .subscribe();
  } catch (e) {
    console.warn('Sem tempo real; a lista atualiza ao recarregar a página.', e);
  }
}

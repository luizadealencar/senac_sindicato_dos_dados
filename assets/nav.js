/* ==========================================================================
   BARRA DE NAVEGAÇÃO — a mesma em todas as páginas, montada aqui.
   Basta a página ter <nav class="nav" id="nav" data-pagina="..."></nav>.
   No celular a barra vira menu de gaveta.
   ========================================================================== */

import { sessao, sair, avatar, ligarAvatares, esc, configurado } from './sindicato.js';

const ITENS = [
  { t: 'Hoje',      casa: 'index.html', ancora: '#hoje' },
  { t: 'Atos',      casa: 'index.html', ancora: '#atos' },
  { t: 'Arsenal',   casa: 'index.html', ancora: '#arsenal' },
  { t: 'Placar',    casa: 'index.html', ancora: '#placar' },
  { t: 'Filiados',  casa: 'index.html', ancora: '#filiados' },
  { t: 'Eventos',   casa: 'index.html', ancora: '#eventos' },
  { t: 'Caderno',   casa: 'caderno.html' },
  { t: 'Laboratório', sub: [
      { t: 'I · As Consultas',  casa: 'laboratorio.html',  desc: 'SELECT, filtros, agrupamento' },
      { t: 'II · A Construção', casa: 'laboratorio2.html', desc: 'CREATE, INSERT, UPDATE, DELETE' }
  ]},
  { t: 'Desafio', sub: [
      { t: 'I · O Interrogatório', casa: 'desafio.html',  desc: 'perguntas sobre consultas' },
      { t: 'II · A Vistoria',      casa: 'desafio2.html', desc: 'perguntas sobre construção' }
  ]},
  { t: 'Fórum',     casa: 'forum.html' }
];

const nav = document.getElementById('nav');
if (nav) montar();

function montar() {
  const aqui = nav.dataset.pagina || 'index.html';

  const links = ITENS.map(i => {
    if (i.sub) {
      const aberto = i.sub.some(f => f.casa === aqui);
      const filhos = i.sub.map(f =>
        `<a href="${f.casa}"${f.casa === aqui ? ' class="aqui"' : ''}>
           <b>${esc(f.t)}</b><span>${esc(f.desc || '')}</span>
         </a>`).join('');
      return `<div class="nav-grupo${aberto ? ' aqui' : ''}">
        <button type="button" class="nav-grupo-btn" aria-expanded="false">${esc(i.t)} <i aria-hidden="true">▾</i></button>
        <div class="nav-gaveta">${filhos}</div>
      </div>`;
    }
    const destino = i.casa === aqui ? (i.ancora || i.casa) : i.casa + (i.ancora || '');
    const marcado = i.casa === aqui && !i.ancora ? ' class="aqui"' : '';
    return `<a href="${destino}"${marcado}>${esc(i.t)}</a>`;
  }).join('');

  nav.innerHTML = `
    <div class="nav-in">
      <a class="nav-marca" href="index.html">Sindicato dos Dados</a>
      <button class="nav-abrir" type="button" aria-expanded="false" aria-controls="navMenu">
        <span class="barras" aria-hidden="true"><i></i><i></i><i></i></span> Menu
      </button>
      <div class="nav-menu" id="navMenu">
        ${links}
        <div class="nav-sessao" id="navSessao"></div>
      </div>
    </div>`;

  /* abrir e fechar a gaveta */
  const botao = nav.querySelector('.nav-abrir');
  const menu = nav.querySelector('.nav-menu');

  const fechar = () => {
    nav.classList.remove('aberto');
    botao.setAttribute('aria-expanded', 'false');
    nav.querySelectorAll('.nav-grupo').forEach(g => g.classList.remove('escancarado'));
  };
  const alternar = () => {
    const on = nav.classList.toggle('aberto');
    botao.setAttribute('aria-expanded', String(on));
  };

  botao.addEventListener('click', alternar);

  /* submenus: no computador abrem ao passar o mouse (CSS) e ao clicar;
     no celular funcionam como sanfona dentro da gaveta */
  nav.querySelectorAll('.nav-grupo-btn').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const grupo = b.closest('.nav-grupo');
      const abrindo = !grupo.classList.contains('escancarado');
      nav.querySelectorAll('.nav-grupo').forEach(g => g.classList.remove('escancarado'));
      grupo.classList.toggle('escancarado', abrindo);
      b.setAttribute('aria-expanded', String(abrindo));
    });
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) fechar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
  document.addEventListener('click', e => { if (!nav.contains(e.target)) fechar(); });

  /* a mesma medida do CSS: ao voltar para tela larga a gaveta some sozinha */
  matchMedia('(min-width: 981px)').addEventListener('change', e => { if (e.matches) fechar(); });

  pintarSessao();
}

async function pintarSessao() {
  const caixa = document.getElementById('navSessao');
  if (!caixa) return;

  if (!configurado) {
    caixa.innerHTML = `<a class="nav-sessao-btn" href="entrar.html">Entrar</a>`;
    return;
  }

  let dados = { user: null, perfil: null };
  try { dados = await sessao(); } catch (e) { console.error(e); }

  const { user, perfil } = dados;

  if (!user) {
    caixa.innerHTML = `<a class="nav-sessao-btn" href="entrar.html">Entrar</a>`;
    return;
  }

  const nome = perfil?.nome || user.email || 'Agente';
  caixa.innerHTML = `
    ${avatar(perfil, 26)}
    <span class="nav-sessao-nome" title="${esc(nome)}">${esc(nome.split(' ')[0])}</span>
    <button class="nav-sessao-btn" type="button" id="navSair">Sair</button>`;

  ligarAvatares(caixa);
  document.getElementById('navSair').addEventListener('click', sair);
}

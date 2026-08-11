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
  { t: 'Fórum',     casa: 'forum.html' }
];

const nav = document.getElementById('nav');
if (nav) montar();

function montar() {
  const aqui = nav.dataset.pagina || 'index.html';

  const links = ITENS.map(i => {
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

  const fechar = () => { nav.classList.remove('aberto'); botao.setAttribute('aria-expanded', 'false'); };
  const alternar = () => {
    const on = nav.classList.toggle('aberto');
    botao.setAttribute('aria-expanded', String(on));
  };

  botao.addEventListener('click', alternar);
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
    caixa.innerHTML = '<span class="nav-sessao-aviso">Sem cadastro</span>';
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

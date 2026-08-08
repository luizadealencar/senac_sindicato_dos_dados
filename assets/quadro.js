/* ==========================================================================
   QUADRO DE FILIADOS — as fichas saem do banco de dados.
   Enquanto o Supabase não estiver ligado (ou se ele cair), o quadro usa a
   lista de reserva que está no bloco DADOS do index.html.
   ========================================================================== */

import { sb, configurado, esc } from './sindicato.js';

const quadro = document.getElementById('quadro');
if (quadro) pintar();

async function pintar() {
  const reserva = (window.DADOS?.alunos || []).map((a, i) => ({
    nome: a.nome, github: a.github, celula: a.celula, papel: i === 0 ? 'docente' : 'aluno'
  }));

  let fichas = reserva;
  let doBanco = false;

  if (configurado && sb) {
    try {
      const { data, error } = await sb
        .from('perfis')
        .select('nome,github,celula,papel,avatar_url,criado_em')
        .eq('filiado', true)
        .order('papel', { ascending: false })     // a chefia primeiro
        .order('criado_em', { ascending: true });

      if (error) throw error;
      if (data?.length) { fichas = data; doBanco = true; }
    } catch (e) {
      console.warn('Quadro veio da lista de reserva:', e.message || e);
    }
  }

  quadro.innerHTML =
    fichas.map((f, i) => cartao(f, i)).join('') +
    `<article class="fich vaga">
       <b>Vaga aberta</b>
       <span>Sua ficha ainda não está aqui. ${doBanco
         ? 'Leva dois minutos para mudar isso.'
         : 'As instruções estão logo abaixo.'}</span>
       <a class="btn miudo" href="entrar.html" style="margin-top:12px;align-self:flex-start">Filiar-se</a>
     </article>`;

  /* foto do GitHub que não existe vira caixinha neutra */
  quadro.querySelectorAll('img').forEach(im =>
    im.addEventListener('error', () => {
      const cx = document.createElement('span');
      cx.className = 'fich-sem';
      cx.textContent = im.dataset.ini || '?';
      cx.title = 'Sem foto do GitHub';
      im.replaceWith(cx);
    }, { once: true }));
}

function cartao(f, n) {
  const foto = f.avatar_url || (f.github ? `https://github.com/${encodeURIComponent(f.github)}.png?size=160` : '');
  const ini = iniciais(f.nome);

  return `
    <article class="fich${f.papel === 'docente' ? ' chefia' : ''}">
      <div class="fich-topo">
        ${foto
          ? `<img src="${esc(foto)}" alt="" loading="lazy" data-ini="${esc(ini)}">`
          : `<span class="fich-sem">${esc(ini)}</span>`}
        <div>
          <span class="fich-mat">MAT ${String(n + 1).padStart(3, '0')}</span>
          <h3>${esc(f.nome || 'Sem nome')}</h3>
        </div>
      </div>
      <div class="fich-baixo">
        ${f.github
          ? `<a href="https://github.com/${encodeURIComponent(f.github)}" target="_blank" rel="noopener">@${esc(f.github)}</a>`
          : '<span class="fraco" style="font-size:14px">sem GitHub</span>'}
        <span class="fich-cel">${f.papel === 'docente' ? 'Chefia' : 'Célula ' + esc(f.celula || '—')}</span>
      </div>
    </article>`;
}

function iniciais(nome) {
  const p = String(nome || '?').trim().split(/\s+/);
  return ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

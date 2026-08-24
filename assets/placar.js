/* ==========================================================================
   PLACAR DAS CÉLULAS — os membros saem do banco (perfis filiados), o XP é
   lançado pela docente no placar.json. Sem Supabase (ou se ele cair), cai na
   lista de reserva do bloco DADOS do index.html.
   ========================================================================== */

import { sb, configurado, esc } from './sindicato.js';

const alvo = document.getElementById('celulas');
if (alvo) pintar();

// Patentes por faixa de XP (soma das notas). Ajustadas para ~8 missões de nota
// até 10 (total possível 80). Se você usar outra escala, troque os números.
const patenteDe = xp =>
  xp >= 72 ? 'Lenda' : xp >= 55 ? 'Veterano' : xp >= 35 ? 'Operador' : xp >= 15 ? 'Agente' : 'Novato';

async function lerPlacar() {
  // placar.json manda; DADOS.pontos é reserva. Cada célula pode ter um número
  // (total) ou um objeto com a nota por missão (o placar SOMA). O bloco _logos
  // guarda a imagem de cada célula.
  const xp = {}, logos = {};
  const soma = v => {
    if (v && typeof v === 'object') {
      let s = 0;
      for (const k in v) { const n = Number(v[k]); if (!isNaN(n)) s += n; }
      return s;
    }
    return Number(v) || 0;
  };
  const guarda = obj => {
    for (const k in (obj || {})) {
      if (k.charAt(0) === '_') continue;         // ignora _comodousar, _missoes, _logos
      xp[k.trim().toLowerCase()] = soma(obj[k]);
    }
  };
  guarda(window.DADOS?.pontos);
  try {
    const r = await fetch('placar.json', { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      guarda(j);
      const L = j._logos || {};
      for (const k in L) if (L[k]) logos[k.trim().toLowerCase()] = String(L[k]);
    }
  } catch { /* sem arquivo: fica a reserva */ }
  return { xp, logos };
}

async function membros() {
  const fora = new Set((window.DADOS?.foraDoPlacar || []).map(s => s.trim().toLowerCase()));

  // 1) tenta o banco
  if (configurado && sb) {
    try {
      const { data, error } = await sb.from('perfis')
        .select('celula,papel').eq('filiado', true);
      if (error) throw error;
      if (data) {
        const m = new Map();
        data.forEach(p => {
          const nome = (p.celula || '').trim();
          const chave = nome.toLowerCase();
          if (!nome || fora.has(chave) || p.papel === 'docente') return;
          if (!m.has(chave)) m.set(chave, { nome, chave, n: 0 });
          m.get(chave).n++;
        });
        if (m.size) return [...m.values()];
      }
    } catch (e) { console.warn('Placar veio da reserva:', e.message || e); }
  }

  // 2) reserva: DADOS.alunos
  const m = new Map();
  (window.DADOS?.alunos || []).forEach(a => {
    const nome = (a.celula || '').trim();
    const chave = nome.toLowerCase();
    if (!nome || fora.has(chave)) return;
    if (!m.has(chave)) m.set(chave, { nome, chave, n: 0 });
    m.get(chave).n++;
  });
  return [...m.values()];
}

async function pintar() {
  const [times, dados] = await Promise.all([membros(), lerPlacar()]);
  const { xp, logos } = dados;

  const celulas = times
    .map(c => ({ ...c, xp: xp[c.chave] || 0, logo: logos[c.chave] || '' }))
    .sort((a, b) => b.xp - a.xp || b.n - a.n || a.nome.localeCompare(b.nome, 'pt'));

  if (!celulas.length) {
    alvo.innerHTML = `<p class="secao-sub" style="grid-column:1/-1">Nenhum time ainda. Assim que os alunos se filiarem com um nome de célula, o placar se monta sozinho.</p>`;
    return;
  }

  alvo.innerHTML = celulas.map((c, i) => `
    <div class="celula">
      <span class="celula-pos">${i + 1}º</span>
      <div class="celula-xp">${c.xp} XP</div>
      <h3>${esc(c.nome)}</h3>
      <p>${c.n} ${c.n === 1 ? 'agente' : 'agentes'}</p>
      <span class="patente">${esc(patenteDe(c.xp))}</span>
      ${c.logo ? `<img class="celula-logo" src="${esc(c.logo)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
    </div>`).join('');
}

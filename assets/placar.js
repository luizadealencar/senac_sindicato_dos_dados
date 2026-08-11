/* ==========================================================================
   PLACAR DAS CÉLULAS — os membros saem do banco (perfis filiados), o XP é
   lançado pela docente no placar.json. Sem Supabase (ou se ele cair), cai na
   lista de reserva do bloco DADOS do index.html.
   ========================================================================== */

import { sb, configurado, esc } from './sindicato.js';

const alvo = document.getElementById('celulas');
if (alvo) pintar();

const patenteDe = xp =>
  xp >= 300 ? 'Lenda' : xp >= 180 ? 'Veterano' : xp >= 90 ? 'Operador' : xp >= 30 ? 'Agente' : 'Novato';

async function xpPorCelula() {
  // placar.json vence; DADOS.pontos é a reserva
  const mapa = {};
  const guarda = obj => { for (const k in (obj || {})) mapa[k.trim().toLowerCase()] = Number(obj[k]) || 0; };
  guarda(window.DADOS?.pontos);
  try {
    const r = await fetch('placar.json', { cache: 'no-store' });
    if (r.ok) guarda(await r.json());
  } catch { /* sem arquivo: fica a reserva */ }
  return mapa;
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
  const [times, xp] = await Promise.all([membros(), xpPorCelula()]);

  const celulas = times
    .map(c => ({ ...c, xp: xp[c.chave] || 0 }))
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
    </div>`).join('');
}

/* ==========================================================================
   NÚCLEO — conexão com o Supabase, sessão do agente e utilidades.
   Daqui para baixo não precisa mexer. As chaves ficam em assets/config.js.
   ========================================================================== */

const cfg = window.SINDICATO_CONFIG || {};

export const CELULAS = cfg.CELULAS || ['Alfa', 'Bravo', 'Charlie', 'Delta'];
export const configurado = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_KEY);

/* O cliente só é baixado se as chaves estiverem preenchidas. Sem elas o site
   continua de pé, apenas sem cadastro e sem fórum. */
export let sb = null;
export let falhaCarga = null;

if (configurado) {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm');
    sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  } catch (e) {
    falhaCarga = e;
    console.error('Não foi possível carregar a biblioteca do Supabase:', e);
  }
}

/* ---------- utilidades de texto ---------- */

export const esc = t => String(t ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Transforma quebras de linha em parágrafos e destaca trechos entre crases.
   Nada de HTML do usuário chega à tela: tudo passa por esc() antes. */
export function textoRico(t) {
  return esc(t)
    .split(/\n{2,}/)
    .map(p => '<p>' + p.replace(/\n/g, '<br>').replace(/`([^`\n]{1,200})`/g, '<code class="inl">$1</code>') + '</p>')
    .join('');
}

const RELOGIO = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const ESCALAS = [['second', 60], ['minute', 60], ['hour', 24], ['day', 7], ['week', 4.35], ['month', 12], ['year', Infinity]];

export function quando(iso) {
  const seg = (new Date(iso) - new Date()) / 1000;
  let valor = seg;
  for (const [unidade, tamanho] of ESCALAS) {
    if (Math.abs(valor) < tamanho) return RELOGIO.format(Math.round(valor), unidade);
    valor /= tamanho;
  }
  return new Date(iso).toLocaleDateString('pt-BR');
}

export const dataCompleta = iso =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ---------- sessão ---------- */

let cache = null;

/** Devolve { user, perfil }. perfil é null enquanto a ficha não existir. */
export async function sessao({ recarregar = false } = {}) {
  if (cache && !recarregar) return cache;
  if (!sb) return (cache = { user: null, perfil: null });

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return (cache = { user: null, perfil: null });

  let { data: perfil } = await sb.from('perfis').select('*').eq('id', user.id).maybeSingle();

  /* Se o gatilho do banco não tiver criado a ficha (acontece quando o projeto
     bloqueia gatilhos no schema auth), criamos aqui, do lado do aluno. */
  if (!perfil) {
    const m = user.user_metadata || {};
    const { data } = await sb.from('perfis').insert({
      id: user.id,
      nome: (m.nome || m.full_name || m.name || m.user_name || 'Agente sem nome').slice(0, 80),
      github: m.user_name || null,
      avatar_url: m.avatar_url || null
    }).select().maybeSingle();
    perfil = data || null;
  }

  return (cache = { user, perfil });
}

export function limparCache() { cache = null; }

export async function sair() {
  limparCache();
  if (sb) await sb.auth.signOut();
  location.href = 'index.html';
}

/** Avatar do agente: o do GitHub quando houver, senão as iniciais. */
export function avatar(perfil, tamanho = 44) {
  const ini = iniciais(perfil?.nome);
  const url = perfil?.avatar_url || (perfil?.github ? `https://github.com/${encodeURIComponent(perfil.github)}.png?size=${tamanho * 2}` : '');
  if (!url) return `<span class="ini">${esc(ini)}</span>`;
  return `<img class="av" src="${esc(url)}" alt="" width="${tamanho}" height="${tamanho}" loading="lazy" data-ini="${esc(ini)}">`;
}

/** Foto do GitHub que não carrega vira caixinha com as iniciais. */
export function ligarAvatares(raiz = document) {
  raiz.querySelectorAll('img.av:not([data-ligado])').forEach(im => {
    im.dataset.ligado = '1';
    im.addEventListener('error', () => {
      const caixa = document.createElement('span');
      caixa.className = 'ini';
      caixa.textContent = im.dataset.ini || '?';
      im.replaceWith(caixa);
    }, { once: true });
  });
}

export function iniciais(nome) {
  const p = String(nome || '?').trim().split(/\s+/);
  return ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

/* ---------- imagens ---------- */

export const LIMITE_ARQUIVO = 5 * 1024 * 1024;
const TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

/** Encolhe a imagem antes de subir: o print de tela de 4 MB vira uns 200 kB. */
async function comprimir(arquivo, maxLado = 1600, qualidade = 0.82) {
  if (arquivo.type === 'image/gif') return arquivo;          // gif animado perde a animação no canvas
  if (typeof createImageBitmap !== 'function') return arquivo;

  let bitmap;
  try { bitmap = await createImageBitmap(arquivo); } catch { return arquivo; }

  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  if (escala === 1 && arquivo.size < 350 * 1024) { bitmap.close?.(); return arquivo; }

  const tela = document.createElement('canvas');
  tela.width = Math.max(1, Math.round(bitmap.width * escala));
  tela.height = Math.max(1, Math.round(bitmap.height * escala));
  const ctx = tela.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, tela.width, tela.height);
  ctx.drawImage(bitmap, 0, 0, tela.width, tela.height);
  bitmap.close?.();

  const blob = await new Promise(r => tela.toBlob(r, 'image/jpeg', qualidade));
  if (!blob || blob.size >= arquivo.size) return arquivo;
  return new File([blob], 'anexo.jpg', { type: 'image/jpeg' });
}

/** Sobe a imagem para o Storage e devolve a URL pública. */
export async function enviarImagem(arquivo, uid) {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new Error('Só entram imagens PNG, JPG, WEBP ou GIF.');
  }
  if (arquivo.size > LIMITE_ARQUIVO * 4) {
    throw new Error('Imagem grande demais. O limite é 5 MB.');
  }

  const pronta = await comprimir(arquivo);
  if (pronta.size > LIMITE_ARQUIVO) {
    throw new Error('Mesmo comprimida a imagem passou de 5 MB. Corte um pedaço menor da tela.');
  }

  const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' })[pronta.type] || 'jpg';
  const caminho = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await sb.storage.from('anexos')
    .upload(caminho, pronta, { contentType: pronta.type, cacheControl: '31536000' });
  if (error) throw error;

  return sb.storage.from('anexos').getPublicUrl(caminho).data.publicUrl;
}

/* ---------- mensagens de erro em português ---------- */

const TRADUCOES = [
  [/invalid login credentials/i, 'E-mail ou senha que não batem com nenhuma ficha.'],
  [/email not confirmed/i, 'Este e-mail ainda não foi confirmado. Fale com a docente.'],
  [/user already registered|already been registered/i, 'Já existe uma ficha com este e-mail. Use "Já sou filiado" para entrar.'],
  [/password should be at least (\d+)/i, 'A senha precisa de pelo menos $1 caracteres.'],
  [/rate limit|too many requests/i, 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'],
  [/unable to validate email|invalid format/i, 'Esse e-mail não parece válido.'],
  [/row-level security|violates row-level/i, 'Sua ficha ainda não está filiada. Informe o código da turma.'],
  [/failed to fetch|networkerror/i, 'Sem conexão com o servidor. Confira a internet e tente de novo.'],
  [/provider is not enabled/i, 'O login com GitHub ainda não foi ligado no painel do Supabase.'],
  [/duplicate key|already exists/i, 'Isso já está registrado.'],
  [/exceeded the maximum allowed size|payload too large/i, 'Arquivo grande demais para o servidor.']
];

export function traduzirErro(e) {
  const bruto = e?.message || e?.error_description || String(e || 'Erro desconhecido');
  for (const [re, texto] of TRADUCOES) {
    if (re.test(bruto)) return bruto.replace(re, texto);
  }
  return bruto;
}

/** Mostra um recado na tela. Passe tipo 'ruim' ou 'bom'. */
export function recado(el, texto, tipo = 'ruim') {
  if (!el) return;
  el.className = 'recado ' + tipo;
  el.textContent = texto;
  el.hidden = !texto;
}

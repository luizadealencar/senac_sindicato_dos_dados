/* Service worker do Sindicato dos Dados.
   Estratégia: "network-first" — sempre tenta a versão mais nova da internet
   (para as atualizações do site chegarem na hora) e, se estiver offline,
   cai no que ficou guardado. Assim o app abre mesmo sem internet, mas não
   trava numa versão velha quando há conexão. */

const CACHE = 'sindicato-v1';

// o essencial para a casca do app abrir offline
const BASICO = [
  'index.html', 'caderno.html', 'entrar.html', 'forum.html', 'desafio.html',
  'curriculo.js', 'placar.json',
  'assets/base.css', 'assets/config.js', 'assets/sindicato.js',
  'assets/nav.js', 'assets/quadro.js', 'assets/placar.js',
  'assets/entrar.js', 'assets/forum.js',
  'favicon.svg', 'icon-192.png', 'icon-512.png', 'manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(BASICO)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // só cuida de GET e do mesmo site; deixa o Supabase e outros passarem direto
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});

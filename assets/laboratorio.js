/* ==========================================================================
   O LABORATÓRIO — prática de SQL rodando no navegador (sql.js / SQLite).
   Banco: Loja Aurora. Lições + desafios com correção automática.
   ========================================================================== */

let db = null;
const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- liga o motor ---------- */
initSqlJs({ locateFile: f => 'assets/sqljs/' + f })
  .then(SQL => {
    db = new SQL.Database();
    db.run(window.AURORA_SQL);
    $('#motor').remove();
    $('#progresso').hidden = false;
    ligarConsole();
    montarConteudo();
    rodarNaSaida($('#sqlLivre').value, $('#saidaLivre'));
  })
  .catch(e => {
    $('#motor').innerHTML = 'Não consegui ligar o banco. Recarregue a página (F5). Detalhe: ' + esc(e.message || e);
  });

/* ---------- executar SQL ---------- */
function exec(sql) {
  const res = db.exec(sql);          // [{columns, values}, ...]
  return res.length ? res[res.length - 1] : { columns: [], values: [] };
}

function tabelaHTML(r) {
  if (!r.columns.length) return '<p class="nlinhas">Comando executado. Nenhuma linha para mostrar.</p>';
  const cab = r.columns.map(c => `<th>${esc(c)}</th>`).join('');
  const corpo = r.values.map(linha =>
    '<tr>' + linha.map(v => `<td>${v === null ? '<i style="color:#9a9a9a">NULL</i>' : esc(v)}</td>`).join('') + '</tr>'
  ).join('');
  return `<p class="nlinhas">${r.values.length} linha${r.values.length === 1 ? '' : 's'}</p>
          <table><thead><tr>${cab}</tr></thead><tbody>${corpo}</tbody></table>`;
}

function rodarNaSaida(sql, alvo) {
  try {
    alvo.innerHTML = tabelaHTML(exec(sql));
  } catch (e) {
    alvo.innerHTML = `<div class="erro">Erro: ${esc(e.message)}</div>`;
  }
}

function ligarConsole() {
  $('#btnRodar').addEventListener('click', () => rodarNaSaida($('#sqlLivre').value, $('#saidaLivre')));
  $('#btnRecomecar')?.addEventListener('click', recomecar);
  $('#btnLimpar').addEventListener('click', () => { $('#sqlLivre').value = ''; $('#saidaLivre').innerHTML = ''; $('#sqlLivre').focus(); });
  // Ctrl+Enter roda
  $('#sqlLivre').addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); rodarNaSaida($('#sqlLivre').value, $('#saidaLivre')); }
  });
}

/* ---------- conferir desafio ---------- */
function normaliza(valores) { return valores.map(l => JSON.stringify(l)); }

function conferir(sqlAluno, sqlRef, ordenado) {
  let ra, rb;
  try { rb = exec(sqlRef); } catch (e) { return { ok: false, msg: 'Gabarito com problema — avise a docente.' }; }
  try { ra = exec(sqlAluno); }
  catch (e) { return { ok: false, msg: 'O seu SQL deu erro: ' + e.message }; }

  let A = normaliza(ra.values), B = normaliza(rb.values);
  if (!ordenado) { A = A.slice().sort(); B = B.slice().sort(); }
  const igual = A.length === B.length && A.every((x, i) => x === B[i]);
  if (igual) return { ok: true };
  if (ra.columns.length !== rb.columns.length)
    return { ok: false, msg: 'Quase — o número de colunas está diferente do pedido.' };
  return { ok: false, msg: 'O resultado não bate com o pedido. Confira os filtros, as colunas e a ordem.' };
}

/* ==========================================================================
   CONTEÚDO — módulos, lições e desafios.
   Cada desafio tem: pergunta, resposta (gabarito), ordenado?, dica.
   ========================================================================== */
const MODULOS = [
  {
    num: 'I', nome: 'Ver e filtrar', dur: 'Dia 1 · ~50 min · 10 casos',
    licoes: [
      {
        titulo: 'SELECT — escolher o que ver',
        html: `O <code>SELECT</code> diz <b>quais colunas</b> você quer, e o <code>FROM</code> diz <b>de qual tabela</b>. O <code>*</code> traz todas as colunas. Para renomear uma coluna na saída, use <code>AS</code>.`,
        exemplo: `-- todas as colunas dos produtos\nSELECT * FROM produtos;\n\n-- só nome e preço, com a coluna renomeada\nSELECT nome, preco AS valor FROM produtos;`,
        desafios: [
          { p: 'Mostre <b>apenas o nome e o email</b> de todos os clientes.', r: 'SELECT nome, email FROM clientes;', dica: 'SELECT coluna1, coluna2 FROM tabela;' },
          { p: 'Mostre <b>todas as colunas</b> da tabela de pedidos.', r: 'SELECT * FROM pedidos;', dica: 'Use o * para trazer tudo.' },
          { p: 'Mostre o <b>nome do produto e o preço</b>, mas com a coluna de preço aparecendo com o título <b>valor</b>.', r: 'SELECT nome, preco AS valor FROM produtos;', dica: 'Use AS para renomear: preco AS valor' }
        ]
      },
      {
        titulo: 'WHERE — filtrar linhas',
        html: `O <code>WHERE</code> deixa passar só as linhas que atendem a uma condição. Use <code>=</code>, <code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>, <code>&lt;=</code> e <code>&lt;&gt;</code> (diferente). Texto vai entre aspas simples: <code>'ativo'</code>.`,
        exemplo: `-- produtos com preço maior que 20\nSELECT nome, preco FROM produtos WHERE preco > 20;\n\n-- clientes da cidade de Vitoria\nSELECT nome, cidade FROM clientes WHERE cidade = 'Vitoria';`,
        desafios: [
          { p: 'Mostre o nome e o preço dos produtos com <b>preço abaixo de 10</b>.', r: "SELECT nome, preco FROM produtos WHERE preco < 10;", dica: 'WHERE preco < 10' },
          { p: 'Mostre o nome dos clientes que estão com <b>status inativo</b>.', r: "SELECT nome FROM clientes WHERE status_cliente = 'inativo';", dica: "status_cliente = 'inativo'" },
          { p: 'Mostre nome e cidade dos clientes que <b>não</b> são de Vitoria.', r: "SELECT nome, cidade FROM clientes WHERE cidade <> 'Vitoria';", dica: "<> quer dizer 'diferente de'" },
          { p: "Mostre o id e a data dos pedidos feitos <b>a partir de 01/07/2026</b> (data &gt;= '2026-07-01').", r: "SELECT id_pedido, data_pedido FROM pedidos WHERE data_pedido >= '2026-07-01';", dica: 'Data é texto no formato AAAA-MM-DD, entre aspas.' }
        ]
      },
      {
        titulo: 'AND, OR e NOT — juntar condições',
        html: `Combine condições: <code>AND</code> exige as duas verdadeiras, <code>OR</code> exige pelo menos uma, e <code>NOT</code> inverte.`,
        exemplo: `-- produtos de Papelaria com preço até 10\nSELECT nome, preco FROM produtos\nWHERE categoria = 'Papelaria' AND preco <= 10;`,
        desafios: [
          { p: 'Mostre nome e preço dos produtos da categoria <b>Papelaria</b> com <b>preço acima de 15</b>.', r: "SELECT nome, preco FROM produtos WHERE categoria = 'Papelaria' AND preco > 15;", dica: 'Duas condições ligadas por AND.' },
          { p: 'Mostre o nome dos clientes de <b>Serra ou Cariacica</b>.', r: "SELECT nome FROM clientes WHERE cidade = 'Serra' OR cidade = 'Cariacica';", dica: "cidade = 'Serra' OR cidade = 'Cariacica'" },
          { p: 'Mostre nome e estoque dos produtos de <b>Papelaria</b> que estão com <b>estoque abaixo de 60</b>.', r: "SELECT nome, estoque FROM produtos WHERE categoria = 'Papelaria' AND estoque < 60;", dica: 'Duas condições com AND.' }
        ]
      }
    ]
  },
  {
    num: 'II', nome: 'Refinar a busca', dur: 'Dia 2 · ~50 min · 11 casos',
    licoes: [
      {
        titulo: 'ORDER BY e LIMIT — ordenar e cortar',
        html: `<code>ORDER BY</code> ordena o resultado; <code>ASC</code> é do menor para o maior (padrão) e <code>DESC</code> é o contrário. <code>LIMIT n</code> mostra só as n primeiras linhas.`,
        exemplo: `-- 5 produtos mais caros\nSELECT nome, preco FROM produtos\nORDER BY preco DESC\nLIMIT 5;`,
        desafios: [
          { p: 'Mostre nome e preço de <b>todos os produtos, do mais barato para o mais caro</b>.', r: 'SELECT nome, preco FROM produtos ORDER BY preco ASC;', ordenado: true, dica: 'ORDER BY preco ASC' },
          { p: 'Mostre o nome e o estoque dos <b>3 produtos com maior estoque</b>.', r: 'SELECT nome, estoque FROM produtos ORDER BY estoque DESC LIMIT 3;', ordenado: true, dica: 'ORDER BY estoque DESC LIMIT 3' },
          { p: 'Liste os clientes em <b>ordem alfabética</b> (só o nome).', r: 'SELECT nome FROM clientes ORDER BY nome ASC;', ordenado: true, dica: 'ORDER BY nome' },
          { p: 'Liste nome, categoria e preço dos produtos ordenados <b>por categoria (A-Z) e, dentro de cada categoria, do mais caro para o mais barato</b>.', r: 'SELECT nome, categoria, preco FROM produtos ORDER BY categoria ASC, preco DESC;', ordenado: true, dica: 'Dá para ordenar por duas colunas: ORDER BY a ASC, b DESC' }
        ]
      },
      {
        titulo: 'DISTINCT — tirar repetidos',
        html: `<code>DISTINCT</code> remove linhas repetidas do resultado. Útil para responder "quais valores diferentes existem".`,
        exemplo: `-- quais cidades diferentes há entre os clientes\nSELECT DISTINCT cidade FROM clientes;`,
        desafios: [
          { p: 'Liste as <b>categorias diferentes</b> de produto que existem.', r: 'SELECT DISTINCT categoria FROM produtos;', dica: 'SELECT DISTINCT categoria …' },
          { p: 'Liste as <b>cidades diferentes</b> onde a loja tem clientes.', r: 'SELECT DISTINCT cidade FROM clientes;', dica: 'SELECT DISTINCT cidade FROM clientes;' }
        ]
      },
      {
        titulo: 'LIKE, BETWEEN e IN — filtros espertos',
        html: `<code>LIKE</code> busca por padrão de texto: <code>'A%'</code> começa com A, <code>'%a'</code> termina com a, <code>'%an%'</code> contém "an". <code>BETWEEN a AND b</code> pega um intervalo (inclusivo). <code>IN (…)</code> testa vários valores de uma vez.`,
        exemplo: `-- produtos cujo nome contém "Caneta"\nSELECT nome FROM produtos WHERE nome LIKE '%Caneta%';\n\n-- produtos de preço entre 10 e 20\nSELECT nome, preco FROM produtos WHERE preco BETWEEN 10 AND 20;\n\n-- clientes de três cidades\nSELECT nome, cidade FROM clientes WHERE cidade IN ('Vitoria','Serra','Guarapari');`,
        desafios: [
          { p: 'Mostre o nome dos produtos cujo nome <b>começa com "Caneta"</b>.', r: "SELECT nome FROM produtos WHERE nome LIKE 'Caneta%';", dica: "LIKE 'Caneta%'" },
          { p: 'Mostre nome e preço dos produtos com <b>preço entre 5 e 15</b>.', r: 'SELECT nome, preco FROM produtos WHERE preco BETWEEN 5 AND 15;', dica: 'BETWEEN 5 AND 15' },
          { p: 'Mostre os pedidos cujo <b>status é pago ou enviado</b> (id e status).', r: "SELECT id_pedido, status FROM pedidos WHERE status IN ('pago','enviado');", dica: "status IN ('pago','enviado')" },
          { p: 'Mostre o nome dos clientes cujo nome <b>termina com a letra a</b>.', r: "SELECT nome FROM clientes WHERE nome LIKE '%a';", dica: "O % fica no começo: LIKE '%a'" },
          { p: 'Mostre nome e categoria dos produtos que <b>não</b> são de Papelaria nem de Decoracao.', r: "SELECT nome, categoria FROM produtos WHERE categoria NOT IN ('Papelaria','Decoracao');", dica: "NOT IN ('Papelaria','Decoracao')" }
        ]
      }
    ]
  },
  {
    num: 'III', nome: 'Contar e agrupar', dur: 'Dia 3 · ~55 min · 14 casos',
    licoes: [
      {
        titulo: 'As funções de agregação',
        html: `Elas resumem várias linhas em <b>um número</b>: <code>COUNT(*)</code> conta linhas, <code>SUM</code> soma, <code>AVG</code> tira a média, <code>MAX</code> e <code>MIN</code> pegam o maior e o menor. Dê um apelido ao resultado com <code>AS</code>.`,
        exemplo: `-- quantos clientes existem\nSELECT COUNT(*) AS total FROM clientes;\n\n-- preço médio, mais caro e mais barato dos produtos\nSELECT AVG(preco) AS media, MAX(preco) AS maior, MIN(preco) AS menor\nFROM produtos;`,
        desafios: [
          { p: 'Descubra <b>quantos produtos</b> existem no catálogo.', r: 'SELECT COUNT(*) FROM produtos;', dica: 'COUNT(*)' },
          { p: 'Descubra a <b>soma de todo o estoque</b> (todas as unidades somadas).', r: 'SELECT SUM(estoque) FROM produtos;', dica: 'SUM(estoque)' },
          { p: 'Descubra o <b>preço médio</b> dos produtos da categoria <b>Papelaria</b>.', r: "SELECT AVG(preco) FROM produtos WHERE categoria = 'Papelaria';", dica: 'Junte AVG com um WHERE.' },
          { p: 'Descubra o <b>preço do produto mais caro</b> do catálogo.', r: 'SELECT MAX(preco) FROM produtos;', dica: 'MAX(preco)' },
          { p: 'Descubra <b>quantas cidades diferentes</b> aparecem no cadastro de clientes.', r: 'SELECT COUNT(DISTINCT cidade) FROM clientes;', dica: 'COUNT(DISTINCT cidade)' },
          { p: 'Descubra <b>quanto a loja faturou ao todo</b>: some quantidade × preço unitário de todos os itens vendidos.', r: 'SELECT SUM(quantidade * preco_unit) FROM itens_pedido;', dica: 'SUM(quantidade * preco_unit)' }
        ]
      },
      {
        titulo: 'GROUP BY — um número por grupo',
        html: `Sozinha, a agregação dá um número para a tabela toda. Com <code>GROUP BY</code>, ela dá <b>um número por grupo</b>. A regra: tudo que aparece no <code>SELECT</code> sem estar dentro de uma função tem que estar no <code>GROUP BY</code>.`,
        exemplo: `-- quantos produtos há em cada categoria\nSELECT categoria, COUNT(*) AS qtd\nFROM produtos\nGROUP BY categoria;\n\n-- quantos clientes em cada cidade\nSELECT cidade, COUNT(*) AS clientes\nFROM clientes\nGROUP BY cidade;`,
        desafios: [
          { p: 'Conte <b>quantos clientes há em cada cidade</b> (cidade e a contagem).', r: 'SELECT cidade, COUNT(*) FROM clientes GROUP BY cidade;', dica: 'GROUP BY cidade' },
          { p: 'Conte <b>quantos pedidos há em cada status</b> (status e a contagem).', r: 'SELECT status, COUNT(*) FROM pedidos GROUP BY status;', dica: 'GROUP BY status' },
          { p: 'Mostre o <b>preço médio por categoria</b> de produto (categoria e a média).', r: 'SELECT categoria, AVG(preco) FROM produtos GROUP BY categoria;', dica: 'AVG(preco) … GROUP BY categoria' },
          { p: 'Mostre <b>quantos produtos há em cada categoria</b>, da categoria com mais produtos para a com menos.', r: 'SELECT categoria, COUNT(*) AS qtd FROM produtos GROUP BY categoria ORDER BY qtd DESC;', ordenado: true, dica: 'GROUP BY categoria e depois ORDER BY a contagem DESC' },
          { p: 'Mostre o <b>estoque total por categoria</b> (categoria e a soma do estoque).', r: 'SELECT categoria, SUM(estoque) FROM produtos GROUP BY categoria;', dica: 'SUM(estoque) com GROUP BY categoria' },
          { p: 'Contando <b>só os clientes ativos</b>, mostre quantos há em cada cidade.', r: "SELECT cidade, COUNT(*) FROM clientes WHERE status_cliente = 'ativo' GROUP BY cidade;", dica: 'O WHERE vem antes do GROUP BY.' },
          { p: 'Mostre <b>quantos pedidos cada cliente fez</b> (id do cliente e a contagem), do que mais pediu para o que menos pediu.', r: 'SELECT id_cliente, COUNT(*) AS pedidos FROM pedidos GROUP BY id_cliente ORDER BY pedidos DESC, id_cliente ASC;', dica: 'GROUP BY id_cliente' },
          { p: 'Mostre, <b>para cada cidade e cada status</b>, quantos clientes existem (cidade, status e a contagem).', r: 'SELECT cidade, status_cliente, COUNT(*) FROM clientes GROUP BY cidade, status_cliente;', dica: 'Dá para agrupar por duas colunas: GROUP BY cidade, status_cliente' }
        ]
      }
    ]
  },
  {
    num: 'IV', nome: 'Filtrar grupos e cruzar tabelas', dur: 'Dia 4 · ~55 min · 11 casos',
    licoes: [
      {
        titulo: 'HAVING — filtrar depois de agrupar',
        html: `O <code>WHERE</code> filtra linhas <b>antes</b> de agrupar; ele não enxerga um <code>COUNT</code> ou <code>SUM</code>. Para filtrar pelo <b>resultado do grupo</b>, use <code>HAVING</code>, que vem depois do <code>GROUP BY</code>.`,
        exemplo: `-- cidades que têm mais de 2 clientes\nSELECT cidade, COUNT(*) AS clientes\nFROM clientes\nGROUP BY cidade\nHAVING COUNT(*) > 2;`,
        desafios: [
          { p: 'Mostre as <b>cidades com mais de 3 clientes</b> (cidade e a contagem).', r: 'SELECT cidade, COUNT(*) FROM clientes GROUP BY cidade HAVING COUNT(*) > 3;', dica: 'HAVING COUNT(*) > 3' },
          { p: 'Mostre as <b>categorias com preço médio acima de 15</b> (categoria e a média).', r: 'SELECT categoria, AVG(preco) FROM produtos GROUP BY categoria HAVING AVG(preco) > 15;', dica: 'HAVING AVG(preco) > 15' },
          { p: 'Mostre os <b>status que aparecem em mais de 5 pedidos</b> (status e a contagem).', r: 'SELECT status, COUNT(*) FROM pedidos GROUP BY status HAVING COUNT(*) > 5;', dica: 'GROUP BY status HAVING COUNT(*) > 5' },
          { p: 'Mostre as <b>categorias com estoque total acima de 100</b> (categoria e a soma).', r: 'SELECT categoria, SUM(estoque) FROM produtos GROUP BY categoria HAVING SUM(estoque) > 100;', dica: 'HAVING SUM(estoque) > 100' },
          { p: 'Mostre os <b>clientes que fizeram 3 pedidos ou mais</b> (id do cliente e a contagem).', r: 'SELECT id_cliente, COUNT(*) FROM pedidos GROUP BY id_cliente HAVING COUNT(*) >= 3;', dica: 'HAVING COUNT(*) >= 3' },
          { p: 'Entre os <b>pedidos já pagos</b>, mostre os clientes com <b>2 ou mais</b> pedidos pagos (id do cliente e a contagem). Repare: um filtro é WHERE, o outro é HAVING.', r: "SELECT id_cliente, COUNT(*) FROM pedidos WHERE status = 'pago' GROUP BY id_cliente HAVING COUNT(*) >= 2;", dica: "WHERE status='pago' filtra linhas; HAVING COUNT(*)>=2 filtra grupos." },
          { p: 'Mostre as <b>cidades com 3 clientes ou mais</b>, da que tem mais para a que tem menos.', r: 'SELECT cidade, COUNT(*) AS n FROM clientes GROUP BY cidade HAVING COUNT(*) >= 3 ORDER BY n DESC;', ordenado: true, dica: 'HAVING COUNT(*) >= 3 e depois ORDER BY' }
        ]
      },
      {
        titulo: 'JOIN — juntar duas tabelas',
        html: `Quando a resposta está espalhada em duas tabelas, o <code>JOIN</code> as costura pela chave que elas têm em comum, dita no <code>ON</code>. Aqui, <code>pedidos.id_cliente</code> aponta para <code>clientes.id_cliente</code>.`,
        exemplo: `-- nome do cliente ao lado da data de cada pedido\nSELECT c.nome, p.data_pedido\nFROM pedidos p\nJOIN clientes c ON c.id_cliente = p.id_cliente;`,
        desafios: [
          { p: 'Mostre o <b>nome do cliente e o status</b> de cada pedido, juntando as duas tabelas.', r: 'SELECT c.nome, p.status FROM pedidos p JOIN clientes c ON c.id_cliente = p.id_cliente;', dica: 'JOIN clientes c ON c.id_cliente = p.id_cliente' },
          { p: 'Some <b>quantas unidades cada produto vendeu</b> ao todo: nome do produto e a soma da quantidade (junte produtos com itens_pedido, agrupe pelo produto).', r: 'SELECT pr.nome, SUM(i.quantidade) AS vendidas FROM itens_pedido i JOIN produtos pr ON pr.id_produto = i.id_produto GROUP BY pr.id_produto, pr.nome;', dica: 'JOIN + GROUP BY pelo produto, SUM(quantidade).' },
          { p: 'Mostre o <b>nome do cliente e a cidade</b> de cada pedido <b>cancelado</b>.', r: "SELECT c.nome, c.cidade FROM pedidos p JOIN clientes c ON c.id_cliente = p.id_cliente WHERE p.status = 'cancelado';", dica: "JOIN e depois WHERE p.status='cancelado'" },
          { p: '<b>Caso final.</b> Mostre o <b>nome do produto e o total faturado</b> (soma de quantidade × preço unitário), apenas para os produtos que faturaram <b>mais de 300</b>, do maior para o menor.', r: 'SELECT pr.nome, SUM(i.quantidade * i.preco_unit) AS receita FROM itens_pedido i JOIN produtos pr ON pr.id_produto = i.id_produto GROUP BY pr.id_produto, pr.nome HAVING SUM(i.quantidade * i.preco_unit) > 300 ORDER BY receita DESC;', ordenado: true, dica: 'JOIN + GROUP BY + HAVING + ORDER BY, tudo junto.' }
        ]
      }
    ]
  }
];

/* ==========================================================================
   PROGRESSO SALVO — o aluno pode fechar a aba e voltar no dia seguinte.
   Fica no navegador dele (localStorage), não no servidor.
   ========================================================================== */
const CHAVE = 'lab-aurora-v1';

function lerEstado() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return { feitos: [], rascunhos: {} };
    const e = JSON.parse(bruto);
    return { feitos: e.feitos || [], rascunhos: e.rascunhos || {} };
  } catch { return { feitos: [], rascunhos: {} }; }   // aba anônima, cota cheia
}

function salvarEstado() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({
      feitos: [...resolvidos],
      rascunhos,
      em: new Date().toISOString()
    }));
  } catch { /* sem espaço ou sem permissão: segue sem salvar */ }
}

/* ---------- render ---------- */
let totalDesafios = 0;
const estadoSalvo = lerEstado();
const resolvidos = new Set(estadoSalvo.feitos);
const rascunhos = estadoSalvo.rascunhos;

function montarConteudo() {
  const alvo = $('#conteudo');
  let n = 0;
  const html = MODULOS.map(mod => {
    const licoes = mod.licoes.map(li => {
      const desafios = li.desafios.map(d => {
        const id = 'd' + (n++);
        return `
          <div class="desafio" id="${id}">
            <div class="desafio-cab"><span>Caso</span><span>+10 XP</span></div>
            <div class="desafio-corpo">
              <p>${d.p}</p>
              <textarea spellcheck="false" placeholder="Escreva a sua consulta aqui…"></textarea>
              <div class="desafio-acoes">
                <button class="btn-mini" data-conferir="${id}">Conferir</button>
                <button class="btn-mini vazado" data-rodar="${id}">Rodar sem conferir</button>
                <button class="btn-mini vazado" data-dica="${id}">Dica</button>
              </div>
              <div class="dica-txt" data-dicatxt="${id}">${esc(d.dica || '')}</div>
              <div class="veredicto" data-vered="${id}"></div>
              <div class="saida" data-saida="${id}"></div>
            </div>
          </div>`;
      }).join('');
      return `
        <div class="licao">
          <h3>${esc(li.titulo)}</h3>
          <p>${li.html}</p>
          <div class="exemplo">${pintarSQL(li.exemplo)}</div>
          <div class="desafio-acoes"><button class="btn-mini vazado" data-exemplo="${btoa(unescape(encodeURIComponent(li.exemplo)))}">Rodar este exemplo ↑</button></div>
          ${desafios}
        </div>`;
    }).join('');
    return `
      <section class="modulo">
        <div class="modulo-cab"><span class="m-num">${mod.num}</span><h2>${esc(mod.nome)}</h2><span class="dur">${esc(mod.dur)}</span></div>
        ${licoes}
      </section>`;
  }).join('');
  alvo.innerHTML = html;
  totalDesafios = n;
  $('#total').textContent = n;

  /* devolve o que o aluno já tinha escrito e o que já tinha acertado */
  for (const [id, texto] of Object.entries(rascunhos)) {
    const ta = document.querySelector('#' + id + ' textarea');
    if (ta) ta.value = texto;
  }
  for (const id of resolvidos) {
    const cx = document.getElementById(id);
    if (!cx) { resolvidos.delete(id); continue; }
    cx.classList.add('resolvido');
    const v = cx.querySelector('[data-vered]');
    if (v) { v.className = 'veredicto bom'; v.textContent = 'Resolvido numa sessão anterior.'; }
  }

  // guardar gabaritos por id
  n = 0;
  MODULOS.forEach(mod => mod.licoes.forEach(li => li.desafios.forEach(d => { gabaritos['d' + (n++)] = d; })));

  ligarInteracoes();
  atualizarProgresso();   // sem isto o contador volta zerado depois de um F5
}

const gabaritos = {};

function pintarSQL(sql) {
  return esc(sql).replace(/(--[^\n]*)/g, '<span class="cm">$1</span>');
}

function ligarInteracoes() {
  /* guarda o que está sendo digitado, sem gravar a cada tecla */
  let espera;
  document.addEventListener('input', e => {
    const ta = e.target;
    if (ta.tagName !== 'TEXTAREA' || !ta.closest('.desafio')) return;
    rascunhos[ta.closest('.desafio').id] = ta.value;
    clearTimeout(espera);
    espera = setTimeout(salvarEstado, 600);
  });

  document.addEventListener('click', e => {
    const alvo = e.target.closest('button');
    if (!alvo) return;

    if (alvo.dataset.exemplo) {
      const sql = decodeURIComponent(escape(atob(alvo.dataset.exemplo)));
      $('#sqlLivre').value = sql;
      rodarNaSaida(sql, $('#saidaLivre'));
      $('#sqlLivre').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const idR = alvo.dataset.rodar;
    if (idR) {
      const ta = $('#' + idR + ' textarea');
      rodarNaSaida(ta.value, document.querySelector(`[data-saida="${idR}"]`));
      return;
    }
    const idD = alvo.dataset.dica;
    if (idD) { const el = document.querySelector(`[data-dicatxt="${idD}"]`); el.style.display = 'block'; return; }

    const idC = alvo.dataset.conferir;
    if (idC) {
      const ta = $('#' + idC + ' textarea');
      const g = gabaritos[idC];
      const vered = document.querySelector(`[data-vered="${idC}"]`);
      const saida = document.querySelector(`[data-saida="${idC}"]`);
      rodarNaSaida(ta.value, saida);
      const r = conferir(ta.value, g.r, !!g.ordenado);
      if (r.ok) {
        vered.className = 'veredicto bom';
        vered.textContent = 'Certo! Resultado bate com o pedido. +10 XP';
        document.getElementById(idC).classList.add('resolvido');
        if (!resolvidos.has(idC)) { resolvidos.add(idC); atualizarProgresso(); }
        salvarEstado();
      } else {
        vered.className = 'veredicto ruim';
        vered.textContent = r.msg;
      }
    }
  });
}

function recomecar() {
  if (!confirm('Isto apaga o seu progresso e as consultas que você escreveu. Continuar?')) return;
  try { localStorage.removeItem(CHAVE); } catch {}
  location.reload();
}

function atualizarProgresso() {
  $('#feitos').textContent = resolvidos.size;
  $('#barraLab').style.width = (resolvidos.size / totalDesafios * 100) + '%';
}

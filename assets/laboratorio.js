/* ==========================================================================
   O LABORATÓRIO — prática de SQL rodando no navegador (sql.js / SQLite).
   Banco: Loja Aurora. Lições + desafios com correção automática.
   ========================================================================== */

import { sb, configurado, sessao, esc } from './sindicato.js';

let db = null;
let eu = null;                    // ficha do aluno que entrou
const $ = s => document.querySelector(s);

/* ---------- porta: o laboratório é só para quem entrou ---------- */
function barrar(titulo, texto, rotulo = 'Entrar') {
  const m = $('#motor'); if (m) m.remove();
  const porta = $('#portaLab');
  porta.hidden = false;
  porta.innerHTML = `
    <h2>${esc(titulo)}</h2>
    <p>${esc(texto)}</p>
    <div class="acoes">
      <a class="btn" href="entrar.html?vai=laboratorio.html">${esc(rotulo)}</a>
      <a class="btn vazado" href="index.html">Voltar ao início</a>
    </div>`;
}

async function abrir() {
  if (!configurado) {
    return barrar('O cadastro ainda não foi ligado',
      'Quem cuida do site precisa preencher as chaves do Supabase em assets/config.js.');
  }

  let dados;
  try { dados = await sessao(); }
  catch { return barrar('Não deu para falar com o servidor', 'Confira a internet e recarregue a página.'); }

  if (!dados.user) {
    return barrar('Entre para começar',
      'O laboratório guarda o seu progresso na sua ficha, então precisa saber quem é você. ' +
      'Assim você fecha o navegador, troca de computador e continua de onde parou.');
  }
  if (!dados.perfil?.filiado) {
    return barrar('Sua ficha não foi carimbada',
      'A conta existe, mas falta digitar o código da turma.', 'Informar o código');
  }

  eu = dados.perfil;
  await ligarMotor();
}

function ligarMotor() {
  /* Se demorar muito, avisa em vez de deixar a tela parada: numa internet
     ruim o motor do banco (640 KB) leva um tempo, e sem retorno o aluno
     acha que a página travou. */
  const demorou = setTimeout(() => {
    const m = $('#motor');
    if (m) m.innerHTML = 'Ainda baixando o banco de dados (são 640 KB). ' +
      'Em internet lenta pode levar um minuto — deixe a página aberta.';
  }, 8000);

  return initSqlJs({ locateFile: f => 'assets/sqljs/' + f })
    .then(async SQL => {
      clearTimeout(demorou);
      db = new SQL.Database();
      db.run(window.AURORA_SQL);
      await carregarProgresso();
      $('#motor').remove();
      $('#areaLab').hidden = false;
      $('#progresso').hidden = false;
      ligarConsole();
      montarEsquema();
      montarConteudo();
      rodarNaSaida($('#sqlLivre').value, $('#saidaLivre'));
    })
    .catch(e => {
      clearTimeout(demorou);
      const m = $('#motor');
      if (m) m.innerHTML = 'Não consegui ligar o banco de dados. Puxe a página para baixo para recarregar, ' +
        'ou feche e abra de novo. Se insistir, avise a docente.<br><small>' + esc(e.message || e) + '</small>';
    });
}

abrir();

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


/* ==========================================================================
   O BANCO NA TELA — lê a estrutura do próprio banco, em vez de repetir a
   lista à mão. Assim nenhuma coluna fica de fora quando o banco mudar.
   ========================================================================== */
function montarEsquema() {
  const alvo = $('#tabelas');
  if (!alvo) return;

  const tabelas = exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid;")
    .values.map(l => l[0]);

  const html = tabelas.map(t => {
    const colunas = exec(`PRAGMA table_info(${t});`);
    const iNome = colunas.columns.indexOf('name');
    const iPk   = colunas.columns.indexOf('pk');

    /* quais colunas apontam para outra tabela */
    const fks = new Set();
    try {
      const r = exec(`PRAGMA foreign_key_list(${t});`);
      const iFrom = r.columns.indexOf('from');
      r.values.forEach(l => fks.add(l[iFrom]));
    } catch { /* tabela sem chave estrangeira */ }

    const itens = colunas.values.map(l => {
      const nome = l[iNome];
      const classe = l[iPk] ? 'pk' : (fks.has(nome) ? 'fk' : '');
      return `<li${classe ? ` class="${classe}"` : ''}>${esc(nome)}</li>`;
    }).join('');

    const n = exec(`SELECT COUNT(*) FROM ${t};`).values[0][0];
    return `<div class="tabela"><h4>${esc(t)} <small>${n}</small></h4><ul>${itens}</ul></div>`;
  }).join('');

  alvo.innerHTML = html;
  const cab = $('#bancoCab');
  if (cab) cab.textContent = `O banco: ${tabelas.length} tabelas`;
}

/* ---------- conferir desafio ---------- */
function normaliza(valores) { return valores.map(l => JSON.stringify(l)); }

/* Quais linhas do gabarito estão empatadas na ordenação.
   Sem isto, um caso como "do mais vendido para o menos" reprovaria o aluno
   que pôs dois empatados em ordem diferente da minha — sendo que o enunciado
   não diz como desempatar. Devolve blocos [início, fim] intercambiáveis. */
function blocosDeEmpate(sqlRef, quantasLinhas) {
  const limpo = sqlRef.trim().replace(/;\s*$/, '');

  /* acha o ORDER BY que está fora de parênteses (o de fora, não o de subconsulta) */
  let nivel = 0, pos = -1;
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (c === '(') nivel++;
    else if (c === ')') nivel--;
    else if (nivel === 0 && /^order\s+by\b/i.test(limpo.slice(i))) pos = i;
  }
  if (pos < 0) return null;

  let exprs = limpo.slice(pos).replace(/^order\s+by\s+/i, '');
  const lim = exprs.search(/\s+LIMIT\b/i);
  if (lim >= 0) exprs = exprs.slice(0, lim);

  const colunas = exprs.split(',')
    .map(t => t.trim().replace(/\s+(ASC|DESC)$/i, '').trim())
    .filter(Boolean);
  if (!colunas.length) return null;

  let chaves;
  try {
    chaves = exec(`SELECT ${colunas.join(', ')} FROM (${limpo})`).values;
  } catch { return null; }                    // não deu para saber: cobra ordem exata
  if (chaves.length !== quantasLinhas) return null;

  const blocos = [];
  let ini = 0;
  for (let i = 1; i <= chaves.length; i++) {
    const fimDoBloco = i === chaves.length ||
      JSON.stringify(chaves[i]) !== JSON.stringify(chaves[i - 1]);
    if (fimDoBloco) { blocos.push([ini, i - 1]); ini = i; }
  }
  return blocos;
}

function conferir(sqlAluno, sqlRef, ordenado) {
  let ra, rb;
  try { rb = exec(sqlRef); } catch (e) { return { ok: false, msg: 'Gabarito com problema — avise a docente.' }; }
  try { ra = exec(sqlAluno); }
  catch (e) { return { ok: false, msg: 'O seu SQL deu erro: ' + e.message }; }

  const A = normaliza(ra.values), B = normaliza(rb.values);

  if (A.length !== B.length) {
    if (ra.columns.length !== rb.columns.length)
      return { ok: false, msg: 'Quase — o número de colunas está diferente do pedido.' };
    return { ok: false, msg: `O resultado veio com ${A.length} linha(s) e o pedido dá ${B.length}. Confira os filtros.` };
  }

  let igual;
  if (!ordenado) {
    const a = A.slice().sort(), b = B.slice().sort();
    igual = a.every((x, i) => x === b[i]);
  } else {
    const blocos = blocosDeEmpate(sqlRef, B.length);
    if (!blocos) {
      igual = A.every((x, i) => x === B[i]);
    } else {
      /* dentro de um bloco empatado a ordem é livre; entre blocos, não */
      igual = blocos.every(([ini, fim]) => {
        const a = A.slice(ini, fim + 1).sort();
        const b = B.slice(ini, fim + 1).sort();
        return a.every((x, i) => x === b[i]);
      });
    }
  }

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
    num: 'I', nome: 'Ver e filtrar', dur: 'Dia 1',
    licoes: [
      {
        titulo: 'SELECT — escolher o que ver',
        html: `O <code>SELECT</code> diz <b>quais colunas</b> você quer, e o <code>FROM</code> diz <b>de qual tabela</b>. O <code>*</code> traz todas as colunas. Para renomear uma coluna na saída, use <code>AS</code>.`,
        exemplo: `-- todas as colunas dos produtos\nSELECT * FROM produtos;\n\n-- só nome e preço, com a coluna renomeada\nSELECT nome, preco AS valor FROM produtos;`,
        desafios: [
          { p: 'Mostre <b>apenas o nome e o email</b> de todos os clientes.', r: 'SELECT nome, email FROM clientes;', dica: 'SELECT coluna1, coluna2 FROM tabela;' },
          { p: 'Mostre <b>todas as colunas</b> da tabela de pedidos.', r: 'SELECT * FROM pedidos;', dica: 'Use o * para trazer tudo.' },
          { p: 'Mostre o <b>nome do produto e o preço</b>, mas com a coluna de preço aparecendo com o título <b>valor</b>.', r: 'SELECT nome, preco AS valor FROM produtos;', dica: 'Use AS para renomear: preco AS valor' }
        ,
          { p: 'Mostre o <b>id, a data e o status</b> de cada pedido — nessa ordem.', r: 'SELECT id_pedido, data_pedido, status FROM pedidos;', dica: 'Três colunas separadas por vírgula.' }
        ,
          { p: 'Mostre <b>todas as colunas</b> da tabela de itens de pedido.', r: 'SELECT * FROM itens_pedido;', dica: 'SELECT * FROM itens_pedido;' }
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
        ,
          { p: 'Mostre nome e preço dos produtos que custam <b>30 ou mais</b>.', r: 'SELECT nome, preco FROM produtos WHERE preco >= 30;', dica: 'O >= inclui o próprio 30.' }
        ,
          { p: "Mostre o id e a data dos pedidos feitos <b>antes de março terminar</b> (data menor que '2026-04-01').", r: "SELECT id_pedido, data_pedido FROM pedidos WHERE data_pedido < '2026-04-01';", dica: "data_pedido < '2026-04-01'" }
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
        ,
          { p: 'Mostre nome, cidade e status dos clientes <b>ativos de Vila Velha</b>.', r: "SELECT nome, cidade, status_cliente FROM clientes WHERE cidade = 'Vila Velha' AND status_cliente = 'ativo';", dica: 'Duas condições com AND.' }
        ,
          { p: 'Mostre nome e preço dos produtos que <b>não custam entre 10 e 30</b> (use NOT com BETWEEN).', r: 'SELECT nome, preco FROM produtos WHERE NOT preco BETWEEN 10 AND 30;', dica: 'NOT preco BETWEEN 10 AND 30' }
        ]
      }
    ,
      {
        titulo: 'IS NULL — quando não há informação',
        html: `Campo vazio não é zero nem texto em branco: é <code>NULL</code>, a ausência de informação. E <code>NULL</code> não se compara com <code>=</code>. Para testar, use <code>IS NULL</code> e <code>IS NOT NULL</code>. Para trocar o vazio por um texto na hora de mostrar, use <code>COALESCE</code> (no MySQL também existe o <code>IFNULL</code>).`,
        exemplo: `-- clientes que ainda não deixaram telefone\nSELECT nome FROM clientes WHERE telefone IS NULL;\n\n-- trocando o vazio por um aviso na saída\nSELECT nome, COALESCE(telefone, 'sem telefone') AS contato\nFROM clientes;`,
        desafios: [
          { p: 'Liste o nome dos clientes que <b>não têm telefone cadastrado</b>.', r: 'SELECT nome FROM clientes WHERE telefone IS NULL;', dica: 'WHERE telefone IS NULL — nunca use = NULL' },
          { p: 'Liste nome e telefone dos clientes que <b>têm</b> telefone.', r: 'SELECT nome, telefone FROM clientes WHERE telefone IS NOT NULL;', dica: 'IS NOT NULL' },
          { p: 'Mostre o nome de todos os clientes e o telefone; onde não houver telefone, mostre o texto <b>sem telefone</b>.', r: "SELECT nome, COALESCE(telefone, 'sem telefone') FROM clientes;", dica: "COALESCE(telefone, 'sem telefone')" },
          { p: 'Conte <b>quantos clientes estão sem telefone</b>.', r: 'SELECT COUNT(*) FROM clientes WHERE telefone IS NULL;', dica: 'COUNT(*) com WHERE ... IS NULL' }
        ,
          { p: 'Mostre nome e cidade dos <b>clientes sem telefone que moram em Vila Velha</b>.', r: "SELECT nome, cidade FROM clientes WHERE telefone IS NULL AND cidade = 'Vila Velha';", dica: 'IS NULL combinado com AND' }
        ]
      }
    ]
  },
  {
    num: 'II', nome: 'Refinar a busca', dur: 'Dia 2',
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
        ,
          { p: 'Mostre o <b>produto mais barato</b> do catálogo (nome e preço, só uma linha).', r: 'SELECT nome, preco FROM produtos ORDER BY preco ASC LIMIT 1;', ordenado: true, dica: 'ORDER BY preco ASC LIMIT 1' }
        ,
          { p: 'Liste os clientes ordenados <b>por cidade (A-Z) e, dentro da cidade, por nome (A-Z)</b>.', r: 'SELECT nome, cidade FROM clientes ORDER BY cidade ASC, nome ASC;', ordenado: true, dica: 'ORDER BY cidade, nome' }
        ,
          { p: 'Mostre os <b>5 clientes cadastrados mais recentemente</b> (nome e data de cadastro).', r: 'SELECT nome, data_cadastro FROM clientes ORDER BY data_cadastro DESC LIMIT 5;', ordenado: true, dica: 'ORDER BY data_cadastro DESC LIMIT 5' }
        ,
          { p: 'Liste os produtos do <b>menor para o maior estoque</b>, mostrando nome, categoria e estoque.', r: 'SELECT nome, categoria, estoque FROM produtos ORDER BY estoque ASC;', ordenado: true, dica: 'ORDER BY estoque ASC' }
        ,
          { p: 'Mostre os <b>3 pedidos mais antigos</b> (id e data).', r: 'SELECT id_pedido, data_pedido FROM pedidos ORDER BY data_pedido ASC LIMIT 3;', ordenado: true, dica: 'ORDER BY data_pedido ASC LIMIT 3' }
        ]
      },
      {
        titulo: 'DISTINCT — tirar repetidos',
        html: `<code>DISTINCT</code> remove linhas repetidas do resultado. Útil para responder "quais valores diferentes existem".`,
        exemplo: `-- quais cidades diferentes há entre os clientes\nSELECT DISTINCT cidade FROM clientes;`,
        desafios: [
          { p: 'Liste as <b>categorias diferentes</b> de produto que existem.', r: 'SELECT DISTINCT categoria FROM produtos;', dica: 'SELECT DISTINCT categoria …' },
          { p: 'Liste as <b>cidades diferentes</b> onde a loja tem clientes.', r: 'SELECT DISTINCT cidade FROM clientes;', dica: 'SELECT DISTINCT cidade FROM clientes;' }
        ,
          { p: 'Liste os <b>status diferentes</b> que um pedido pode ter neste banco.', r: 'SELECT DISTINCT status FROM pedidos;', dica: 'SELECT DISTINCT status FROM pedidos;' }
        ,
          { p: 'Liste as <b>combinações diferentes de cidade e status</b> que aparecem nos clientes.', r: 'SELECT DISTINCT cidade, status_cliente FROM clientes;', dica: 'DISTINCT vale para o conjunto das colunas listadas.' }
        ,
          { p: 'Liste os <b>status diferentes</b> que um cliente pode ter.', r: 'SELECT DISTINCT status_cliente FROM clientes;', dica: 'DISTINCT status_cliente' }
        ,
          { p: 'Descubra <b>quantos clientes diferentes já fizeram pedido</b>.', r: 'SELECT COUNT(DISTINCT id_cliente) FROM pedidos;', dica: 'COUNT(DISTINCT id_cliente)' }
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
        ,
          { p: 'Mostre os produtos cujo nome <b>contém a palavra Neon</b>.', r: "SELECT nome FROM produtos WHERE nome LIKE '%Neon%';", dica: "LIKE '%Neon%'" }
        ,
          { p: 'Mostre nome e estoque dos produtos com <b>estoque entre 50 e 100</b>.', r: 'SELECT nome, estoque FROM produtos WHERE estoque BETWEEN 50 AND 100;', dica: 'BETWEEN 50 AND 100' }
        ,
          { p: 'Mostre o nome dos clientes cujo nome <b>começa com a letra M</b>.', r: "SELECT nome FROM clientes WHERE nome LIKE 'M%';", dica: "LIKE 'M%'" }
        ,
          { p: 'Mostre nome e preço dos produtos que <b>não</b> são de Papelaria, usando NOT IN.', r: "SELECT nome, preco FROM produtos WHERE categoria NOT IN ('Papelaria');", dica: "categoria NOT IN ('Papelaria')" }
        ,
          { p: 'Mostre os pedidos feitos <b>no segundo trimestre</b> (data entre 2026-04-01 e 2026-06-30), com id e data.', r: "SELECT id_pedido, data_pedido FROM pedidos WHERE data_pedido BETWEEN '2026-04-01' AND '2026-06-30';", dica: 'BETWEEN funciona com datas em texto AAAA-MM-DD' }
        ,
          { p: 'Mostre nome e cidade dos clientes que <b>não</b> moram em Vitoria nem em Serra.', r: "SELECT nome, cidade FROM clientes WHERE cidade NOT IN ('Vitoria','Serra');", dica: "NOT IN ('Vitoria','Serra')" }
        ]
      }
    ,
      {
        titulo: 'Funções de texto — arrumar o que aparece',
        html: `Dá para transformar o texto na própria consulta: <code>UPPER</code> e <code>LOWER</code> mudam a caixa, <code>LENGTH</code> conta os caracteres, <code>SUBSTR(texto, início, quantos)</code> recorta um pedaço. Para juntar dois textos, o SQLite usa <code>||</code> e o <b>MySQL usa <code>CONCAT(a, b)</code></b> — é uma das poucas diferenças que você vai encontrar entre os dois.`,
        exemplo: `-- nome em maiúsculas e o tamanho dele\nSELECT UPPER(nome) AS nome, LENGTH(nome) AS letras FROM clientes;\n\n-- juntando duas colunas num texto só\nSELECT nome || ' — ' || cidade AS ficha FROM clientes;\n\n-- os 4 primeiros caracteres da data são o ano\nSELECT SUBSTR(data_pedido, 1, 4) AS ano FROM pedidos;`,
        desafios: [
          { p: 'Mostre o <b>nome de todos os produtos em letras maiúsculas</b>.', r: 'SELECT UPPER(nome) FROM produtos;', dica: 'UPPER(nome)' },
          { p: 'Mostre o nome dos clientes e <b>quantas letras</b> cada nome tem.', r: 'SELECT nome, LENGTH(nome) FROM clientes;', dica: 'LENGTH(nome)' },
          { p: 'Monte uma coluna única no formato <b>nome - cidade</b> para cada cliente (com espaço, hífen, espaço).', r: "SELECT nome || ' - ' || cidade FROM clientes;", dica: "No SQLite: a || ' - ' || b. No MySQL seria CONCAT(a,' - ',b)." },
          { p: 'Mostre o <b>ano de cada pedido</b> junto com o id (use os 4 primeiros caracteres da data).', r: 'SELECT id_pedido, SUBSTR(data_pedido, 1, 4) FROM pedidos;', dica: 'SUBSTR(data_pedido, 1, 4)' },
          { p: 'Conte <b>quantos pedidos houve em cada mês</b> (use os 7 primeiros caracteres da data, tipo 2026-04), do mês mais movimentado para o menos.', r: 'SELECT SUBSTR(data_pedido,1,7) AS mes, COUNT(*) AS qtd FROM pedidos GROUP BY mes ORDER BY qtd DESC;', ordenado: true, dica: 'Agrupe por SUBSTR(data_pedido,1,7)' }
        ,
          { p: 'Mostre a <b>categoria em minúsculas</b> de cada produto, junto com o nome.', r: 'SELECT nome, LOWER(categoria) FROM produtos;', dica: 'LOWER(categoria)' }
        ,
          { p: 'Mostre o nome dos clientes cujo <b>nome tem mais de 12 letras</b>.', r: 'SELECT nome FROM clientes WHERE LENGTH(nome) > 12;', dica: 'WHERE LENGTH(nome) > 12' }
        ,
          { p: 'Monte uma coluna única no formato <b>nome (categoria)</b> para cada produto — o nome, e a categoria entre parênteses.', r: "SELECT nome || ' (' || categoria || ')' FROM produtos;", dica: 'Junte com || e não esqueça os parênteses dentro das aspas.' }
        ,
          { p: 'Mostre <b>quantos pedidos houve em cada ano</b> (use os 4 primeiros caracteres da data).', r: 'SELECT SUBSTR(data_pedido,1,4) AS ano, COUNT(*) FROM pedidos GROUP BY ano;', dica: 'GROUP BY SUBSTR(data_pedido,1,4)' }
        ]
      }
    ,
      {
        titulo: 'LIMIT com OFFSET — de dez em dez',
        html: `<code>LIMIT</code> corta o resultado, e o <code>OFFSET</code> diz quantas linhas <b>pular</b> antes de começar. É assim que um site monta a página 2 de uma lista. Sem <code>ORDER BY</code> a divisão não tem sentido, porque a ordem pode mudar.`,
        exemplo: `-- as 5 primeiras linhas (página 1)\nSELECT nome, preco FROM produtos ORDER BY nome LIMIT 5;\n\n-- as 5 seguintes (página 2): pula 5 e traz 5\nSELECT nome, preco FROM produtos ORDER BY nome LIMIT 5 OFFSET 5;`,
        desafios: [
          { p: 'Mostre o <b>nome</b> dos clientes da <b>segunda página</b>, em ordem alfabética, com 5 por página (ou seja: pule 5 e traga 5).', r: 'SELECT nome FROM clientes ORDER BY nome ASC LIMIT 5 OFFSET 5;', ordenado: true, dica: 'ORDER BY nome ASC LIMIT 5 OFFSET 5' },
          { p: 'Mostre o <b>nome e o preço</b> do <b>segundo produto mais caro</b> (só ele: pule o primeiro e traga um).', r: 'SELECT nome, preco FROM produtos ORDER BY preco DESC LIMIT 1 OFFSET 1;', ordenado: true, dica: 'ORDER BY preco DESC LIMIT 1 OFFSET 1' }
        ,
          { p: 'Mostre o <b>nome</b> dos produtos da <b>terceira página</b>, em ordem alfabética, com 4 por página.', r: 'SELECT nome FROM produtos ORDER BY nome ASC LIMIT 4 OFFSET 8;', ordenado: true, dica: 'ORDER BY nome ASC e, para a página 3 com 4 por página, LIMIT 4 OFFSET 8.' }
        ,
          { p: 'Mostre o <b>nome</b> do <b>terceiro ao quinto cliente</b>, em ordem alfabética.', r: 'SELECT nome FROM clientes ORDER BY nome ASC LIMIT 3 OFFSET 2;', ordenado: true, dica: 'ORDER BY nome ASC, depois LIMIT 3 OFFSET 2.' }
        ]
      }
    ]
  },
  {
    num: 'III', nome: 'Contar e agrupar', dur: 'Dia 3',
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
        ,
          { p: 'Descubra o <b>menor estoque</b> encontrado no catálogo.', r: 'SELECT MIN(estoque) FROM produtos;', dica: 'MIN(estoque)' }
        ,
          { p: 'Descubra <b>quantas unidades foram vendidas ao todo</b> (soma das quantidades de todos os itens).', r: 'SELECT SUM(quantidade) FROM itens_pedido;', dica: 'SUM(quantidade) na tabela de itens' }
        ,
          { p: 'Descubra a <b>média de itens por pedido</b>: conte as linhas de itens e divida pelo número de pedidos diferentes que aparecem lá.', r: 'SELECT COUNT(*) * 1.0 / COUNT(DISTINCT id_pedido) FROM itens_pedido;', dica: 'COUNT(*) * 1.0 / COUNT(DISTINCT id_pedido) — o 1.0 evita divisão inteira.' }
        ,
          { p: 'Descubra a <b>quantidade média por item vendido</b>, arredondada em 2 casas.', r: 'SELECT ROUND(AVG(quantidade), 2) FROM itens_pedido;', dica: 'ROUND(AVG(quantidade), 2)' }
        ,
          { p: 'Descubra <b>quantos produtos custam mais de 20</b>.', r: 'SELECT COUNT(*) FROM produtos WHERE preco > 20;', dica: 'COUNT(*) com WHERE' }
        ,
          { p: 'Descubra o <b>maior e o menor preço unitário</b> já praticado numa venda (duas colunas).', r: 'SELECT MAX(preco_unit), MIN(preco_unit) FROM itens_pedido;', dica: 'Dá para pedir MAX e MIN na mesma consulta.' }
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
          { p: 'Mostre <b>quantos pedidos cada cliente fez</b> (id do cliente e a contagem), do que mais pediu para o que menos pediu.', r: 'SELECT id_cliente, COUNT(*) AS pedidos FROM pedidos GROUP BY id_cliente ORDER BY pedidos DESC;', ordenado: true, dica: 'GROUP BY id_cliente' },
          { p: 'Mostre, <b>para cada cidade e cada status</b>, quantos clientes existem (cidade, status e a contagem).', r: 'SELECT cidade, status_cliente, COUNT(*) FROM clientes GROUP BY cidade, status_cliente;', dica: 'Dá para agrupar por duas colunas: GROUP BY cidade, status_cliente' }
        ,
          { p: 'Mostre <b>quantos itens diferentes cada pedido tem</b> (id do pedido e a contagem de linhas).', r: 'SELECT id_pedido, COUNT(*) AS itens FROM itens_pedido GROUP BY id_pedido;', dica: 'GROUP BY id_pedido' }
        ,
          { p: 'Mostre o <b>preço mais caro de cada categoria</b> (categoria e o maior preço).', r: 'SELECT categoria, MAX(preco) FROM produtos GROUP BY categoria;', dica: 'MAX(preco) com GROUP BY categoria' }
        ,
          { p: "Mostre <b>quantos pedidos houve em cada status, apenas a partir de julho</b> (data &gt;= '2026-07-01').", r: "SELECT status, COUNT(*) FROM pedidos WHERE data_pedido >= '2026-07-01' GROUP BY status;", dica: 'WHERE filtra antes; GROUP BY agrupa depois.' }
        ,
          { p: 'Mostre <b>quantos clientes há em cada status</b> (ativo e inativo).', r: 'SELECT status_cliente, COUNT(*) FROM clientes GROUP BY status_cliente;', dica: 'GROUP BY status_cliente' }
        ,
          { p: 'Mostre a <b>média de preço unitário por produto</b> vendido (id do produto e a média arredondada em 2 casas).', r: 'SELECT id_produto, ROUND(AVG(preco_unit), 2) FROM itens_pedido GROUP BY id_produto;', dica: 'AVG(preco_unit) com GROUP BY id_produto' }
        ,
          { p: 'Mostre <b>quanto cada pedido somou</b> em dinheiro (id do pedido e a soma de quantidade × preço unitário), do maior para o menor.', r: 'SELECT id_pedido, SUM(quantidade * preco_unit) AS total FROM itens_pedido GROUP BY id_pedido ORDER BY total DESC;', ordenado: true, dica: 'SUM(quantidade * preco_unit) agrupado por pedido' }
        ,
          { p: 'Mostre <b>quantos produtos diferentes cada categoria tem e o estoque médio</b> de cada uma (três colunas).', r: 'SELECT categoria, COUNT(*) AS itens, ROUND(AVG(estoque), 1) AS estoque_medio FROM produtos GROUP BY categoria;', dica: 'Dá para pedir várias agregações de uma vez.' }
        ]
      }
    ,
      {
        titulo: 'Contas na consulta e o ROUND',
        html: `A consulta também faz conta: <code>+</code>, <code>-</code>, <code>*</code> e <code>/</code> funcionam entre colunas e números. Como média e multiplicação costumam gerar um monte de casas decimais, o <code>ROUND(valor, casas)</code> arredonda. Dê sempre um apelido com <code>AS</code> à coluna calculada.`,
        exemplo: `-- quanto vale o estoque de cada produto\nSELECT nome, preco * estoque AS valor_parado FROM produtos;\n\n-- média com duas casas\nSELECT categoria, ROUND(AVG(preco), 2) AS media\nFROM produtos GROUP BY categoria;`,
        desafios: [
          { p: 'Mostre o nome e <b>quanto vale o estoque</b> de cada produto (preço × estoque), do mais valioso para o menos.', r: 'SELECT nome, preco * estoque AS valor FROM produtos ORDER BY valor DESC;', ordenado: true, dica: 'preco * estoque, com AS e ORDER BY' },
          { p: 'Mostre o <b>preço médio por categoria arredondado com 2 casas</b>.', r: 'SELECT categoria, ROUND(AVG(preco), 2) FROM produtos GROUP BY categoria;', dica: 'ROUND(AVG(preco), 2)' },
          { p: 'Simule uma <b>promoção de 10% de desconto</b>: mostre o nome, o preço atual e o preço com desconto arredondado em 2 casas.', r: 'SELECT nome, preco, ROUND(preco * 0.9, 2) AS promocional FROM produtos;', dica: 'preco * 0.9 dentro do ROUND' },
          { p: 'Mostre o <b>total de cada linha de item</b> vendida: id do pedido, id do produto e quantidade × preço unitário.', r: 'SELECT id_pedido, id_produto, quantidade * preco_unit AS total FROM itens_pedido;', dica: 'quantidade * preco_unit' }
        ,
          { p: 'Mostre o nome do produto e <b>quanto sobraria no caixa</b> se vendesse metade do estoque pelo preço atual (arredonde em 2 casas).', r: 'SELECT nome, ROUND(preco * estoque / 2.0, 2) AS metade FROM produtos;', dica: 'Use 2.0 para não fazer divisão inteira.' }
        ,
          { p: 'Mostre nome, preço e o <b>preço com 15% de aumento</b>, arredondado em 2 casas.', r: 'SELECT nome, preco, ROUND(preco * 1.15, 2) AS reajustado FROM produtos;', dica: 'preco * 1.15' }
        ]
      }
    ,
      {
        titulo: 'CASE WHEN — criar faixas e rótulos',
        html: `O <code>CASE</code> cria uma coluna nova a partir de uma regra, como um se/senão dentro da consulta. A forma é <code>CASE WHEN condição THEN valor ... ELSE outro END</code>. Serve para transformar número em faixa ('barato', 'caro') e para contar só o que interessa dentro de um <code>SUM</code>.`,
        exemplo: `-- classificando o preço em faixas\nSELECT nome, preco,\n  CASE WHEN preco < 10 THEN 'barato'\n       WHEN preco < 30 THEN 'medio'\n       ELSE 'caro' END AS faixa\nFROM produtos;`,
        desafios: [
          { p: "Classifique cada produto pelo estoque: <b>abaixo de 50</b> é 'pouco', <b>de 50 a 199</b> é 'medio', o resto é 'muito'. Mostre nome, estoque e a classificação.", r: "SELECT nome, estoque, CASE WHEN estoque < 50 THEN 'pouco' WHEN estoque < 200 THEN 'medio' ELSE 'muito' END AS classificacao FROM produtos;", dica: "CASE WHEN estoque < 50 THEN 'pouco' WHEN estoque < 200 THEN 'medio' ELSE 'muito' END" },
          { p: "Mostre o nome do cliente e uma coluna dizendo <b>'tem telefone'</b> ou <b>'sem telefone'</b>.", r: "SELECT nome, CASE WHEN telefone IS NULL THEN 'sem telefone' ELSE 'tem telefone' END AS contato FROM clientes;", dica: 'CASE WHEN telefone IS NULL THEN ... ELSE ... END' },
          { p: 'Conte, numa <b>linha só</b>, quantos pedidos estão pagos e quantos estão cancelados (duas colunas).', r: "SELECT SUM(CASE WHEN status = 'pago' THEN 1 ELSE 0 END) AS pagos, SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS cancelados FROM pedidos;", dica: 'SUM(CASE WHEN ... THEN 1 ELSE 0 END) — conta só o que bate' },
          { p: 'Para cada cidade, mostre <b>quantos clientes têm telefone</b> e quantos não têm (cidade e as duas contagens).', r: 'SELECT cidade, SUM(CASE WHEN telefone IS NOT NULL THEN 1 ELSE 0 END) AS com, SUM(CASE WHEN telefone IS NULL THEN 1 ELSE 0 END) AS sem FROM clientes GROUP BY cidade;', dica: 'Dois SUM(CASE ...) e um GROUP BY cidade' }
        ,
          { p: "Classifique cada pedido: 'fechado' quando o status for pago ou enviado, senão 'em aberto'. Mostre o id e a classificação.", r: "SELECT id_pedido, CASE WHEN status IN ('pago','enviado') THEN 'fechado' ELSE 'em aberto' END AS situacao FROM pedidos;", dica: "CASE WHEN status IN ('pago','enviado') THEN ... ELSE ... END" }
        ,
          { p: "Mostre o <b>nome e o estoque</b> de cada produto, com o rótulo <b>'em falta'</b> quando o estoque for menor que 20 e <b>'ok'</b> nos demais.", r: "SELECT nome, estoque, CASE WHEN estoque < 20 THEN 'em falta' ELSE 'ok' END AS aviso FROM produtos;", dica: "CASE WHEN estoque < 20 THEN 'em falta' ELSE 'ok' END" }
        ,
          { p: 'Conte <b>quantos produtos há em cada faixa de preço</b>: até 10, de 10 a 30, e acima de 30 (faixa e contagem).', r: "SELECT CASE WHEN preco <= 10 THEN 'ate 10' WHEN preco <= 30 THEN '10 a 30' ELSE 'acima de 30' END AS faixa, COUNT(*) FROM produtos GROUP BY faixa;", dica: 'Dá para agrupar pelo apelido da coluna criada com CASE.' }
        ]
      }
    ]
  },
  {
    num: 'IV', nome: 'Filtrar grupos e cruzar tabelas', dur: 'Dia 4',
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
        ,
          { p: 'Mostre os <b>pedidos que têm 3 itens ou mais</b> (id do pedido e a contagem).', r: 'SELECT id_pedido, COUNT(*) AS itens FROM itens_pedido GROUP BY id_pedido HAVING COUNT(*) >= 3;', dica: 'GROUP BY id_pedido HAVING COUNT(*) >= 3' }
        ,
          { p: 'Mostre as <b>categorias que têm mais de 2 produtos</b> (categoria e a contagem).', r: 'SELECT categoria, COUNT(*) FROM produtos GROUP BY categoria HAVING COUNT(*) > 2;', dica: 'HAVING COUNT(*) > 2' }
        ,
          { p: 'Mostre os <b>produtos que venderam mais de 20 unidades no total</b> (id do produto e a soma).', r: 'SELECT id_produto, SUM(quantidade) AS un FROM itens_pedido GROUP BY id_produto HAVING SUM(quantidade) > 20;', dica: 'GROUP BY id_produto HAVING SUM(quantidade) > 20' }
        ,
          { p: 'Mostre as <b>cidades onde o total de clientes sem telefone é 2 ou mais</b> (cidade e a contagem).', r: 'SELECT cidade, COUNT(*) FROM clientes WHERE telefone IS NULL GROUP BY cidade HAVING COUNT(*) >= 2;', dica: 'WHERE filtra as linhas sem telefone; HAVING filtra os grupos.' }
        ,
          { p: 'Mostre os <b>pedidos que somaram mais de 200 reais</b> (id do pedido e o total).', r: 'SELECT id_pedido, SUM(quantidade * preco_unit) AS total FROM itens_pedido GROUP BY id_pedido HAVING SUM(quantidade * preco_unit) > 200;', dica: 'HAVING SUM(quantidade * preco_unit) > 200' }
        ,
          { p: 'Mostre os <b>meses com mais de 5 pedidos</b> (mês no formato 2026-04 e a contagem).', r: 'SELECT SUBSTR(data_pedido,1,7) AS mes, COUNT(*) AS qtd FROM pedidos GROUP BY mes HAVING COUNT(*) > 5;', dica: 'Agrupe pelo mês e use HAVING COUNT(*) > 5' }
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
        ,
          { p: 'Mostre o <b>nome do produto e a quantidade</b> de cada linha de item vendida.', r: 'SELECT pr.nome, i.quantidade FROM itens_pedido i JOIN produtos pr ON pr.id_produto = i.id_produto;', dica: 'JOIN produtos pr ON pr.id_produto = i.id_produto' }
        ,
          { p: '<b>Três tabelas de uma vez:</b> mostre o nome do cliente, o nome do produto e a quantidade, ligando pedidos, clientes, itens e produtos.', r: 'SELECT c.nome, pr.nome, i.quantidade FROM pedidos p JOIN clientes c ON c.id_cliente = p.id_cliente JOIN itens_pedido i ON i.id_pedido = p.id_pedido JOIN produtos pr ON pr.id_produto = i.id_produto;', dica: 'Dá para encadear vários JOIN, um depois do outro.' }
        ,
          { p: 'Mostre <b>quanto cada cliente já gastou</b> ao todo: nome e a soma de quantidade × preço unitário, do que mais gastou para o que menos gastou.', r: 'SELECT c.nome, SUM(i.quantidade * i.preco_unit) AS gasto FROM clientes c JOIN pedidos p ON p.id_cliente = c.id_cliente JOIN itens_pedido i ON i.id_pedido = p.id_pedido GROUP BY c.id_cliente, c.nome ORDER BY gasto DESC;', ordenado: true, dica: 'JOIN das três tabelas, GROUP BY pelo cliente e ORDER BY a soma.' }
        ,
          { p: 'Mostre o <b>nome do cliente e a data</b> dos pedidos ainda em aberto.', r: "SELECT c.nome, p.data_pedido FROM pedidos p JOIN clientes c ON c.id_cliente = p.id_cliente WHERE p.status = 'aberto';", dica: "JOIN e depois WHERE p.status = 'aberto'" }
        ,
          { p: 'Mostre <b>quantos pedidos cada cidade fez</b> (cidade e a contagem), da que mais pediu para a que menos pediu.', r: 'SELECT c.cidade, COUNT(*) AS pedidos FROM pedidos p JOIN clientes c ON c.id_cliente = p.id_cliente GROUP BY c.cidade ORDER BY pedidos DESC;', ordenado: true, dica: 'JOIN e GROUP BY pela cidade do cliente' }
        ,
          { p: 'Mostre <b>quanto cada categoria faturou</b> (categoria e a soma de quantidade × preço unitário), do maior para o menor.', r: 'SELECT pr.categoria, SUM(i.quantidade * i.preco_unit) AS receita FROM itens_pedido i JOIN produtos pr ON pr.id_produto = i.id_produto GROUP BY pr.categoria ORDER BY receita DESC;', ordenado: true, dica: 'JOIN com produtos e GROUP BY pr.categoria' }
        ]
      }
    ,
      {
        titulo: 'LEFT JOIN — trazer também quem não tem par',
        html: `O <code>JOIN</code> comum só devolve as linhas que têm par nas duas tabelas. Quem não tem par <b>some</b> do resultado. O <code>LEFT JOIN</code> mantém tudo da tabela da esquerda e preenche com <code>NULL</code> o que faltar da direita. É assim que se acha <b>quem nunca comprou</b> ou <b>o que nunca vendeu</b>.`,
        exemplo: `-- todo cliente, tenha ele pedido ou não\nSELECT c.nome, p.id_pedido\nFROM clientes c\nLEFT JOIN pedidos p ON p.id_cliente = c.id_cliente;\n\n-- só os que nunca compraram: o par não existe, então é NULL\nSELECT c.nome\nFROM clientes c\nLEFT JOIN pedidos p ON p.id_cliente = c.id_cliente\nWHERE p.id_pedido IS NULL;`,
        desafios: [
          { p: 'Liste o nome dos <b>clientes que nunca fizeram pedido</b>.', r: 'SELECT c.nome FROM clientes c LEFT JOIN pedidos p ON p.id_cliente = c.id_cliente WHERE p.id_pedido IS NULL;', dica: 'LEFT JOIN e depois WHERE p.id_pedido IS NULL' },
          { p: 'Liste o nome dos <b>produtos que nunca foram vendidos</b>.', r: 'SELECT pr.nome FROM produtos pr LEFT JOIN itens_pedido i ON i.id_produto = pr.id_produto WHERE i.id_produto IS NULL;', dica: 'LEFT JOIN com itens_pedido e IS NULL' },
          { p: 'Mostre <b>todos os clientes</b> e quantos pedidos cada um fez — inclusive os que fizeram zero (nome e a contagem).', r: 'SELECT c.nome, COUNT(p.id_pedido) AS pedidos FROM clientes c LEFT JOIN pedidos p ON p.id_cliente = c.id_cliente GROUP BY c.id_cliente, c.nome;', dica: 'COUNT(p.id_pedido) conta só o que existe; COUNT(*) contaria a linha vazia também.' },
          { p: 'Mostre o <b>nome</b> de <b>todos os produtos</b> e o total de unidades vendidas de cada um, colocando <b>0</b> onde nunca vendeu.', r: 'SELECT pr.nome, COALESCE(SUM(i.quantidade), 0) AS vendidas FROM produtos pr LEFT JOIN itens_pedido i ON i.id_produto = pr.id_produto GROUP BY pr.id_produto, pr.nome;', dica: 'COALESCE(SUM(i.quantidade), 0)' }
        ,
          { p: 'Mostre <b>todos os clientes com o total que já gastaram</b>, colocando 0 em quem nunca comprou.', r: 'SELECT c.nome, COALESCE(SUM(i.quantidade * i.preco_unit), 0) AS gasto FROM clientes c LEFT JOIN pedidos p ON p.id_cliente = c.id_cliente LEFT JOIN itens_pedido i ON i.id_pedido = p.id_pedido GROUP BY c.id_cliente, c.nome;', dica: 'Dois LEFT JOIN encadeados e COALESCE na soma.' }
        ,
          { p: 'Conte <b>quantos clientes nunca fizeram pedido</b>.', r: 'SELECT COUNT(*) FROM clientes c LEFT JOIN pedidos p ON p.id_cliente = c.id_cliente WHERE p.id_pedido IS NULL;', dica: 'COUNT(*) sobre o LEFT JOIN com IS NULL' }
        ]
      }
    ,
      {
        titulo: 'Subconsulta — uma pergunta dentro da outra',
        html: `Quando a resposta depende de outra consulta, dá para colocar uma dentro da outra, entre parênteses. Ela pode devolver <b>um valor</b> (para comparar com <code>=</code>, <code>&gt;</code>), <b>uma lista</b> (para usar com <code>IN</code>) ou servir de teste com <code>EXISTS</code>. É o jeito de responder coisas como 'acima da média'.`,
        exemplo: `-- produtos mais caros que a média\nSELECT nome, preco FROM produtos\nWHERE preco > (SELECT AVG(preco) FROM produtos);\n\n-- clientes que têm ao menos um pedido cancelado\nSELECT nome FROM clientes\nWHERE id_cliente IN (SELECT id_cliente FROM pedidos WHERE status = 'cancelado');`,
        desafios: [
          { p: 'Mostre os produtos com <b>preço acima da média</b> do catálogo (nome e preço).', r: 'SELECT nome, preco FROM produtos WHERE preco > (SELECT AVG(preco) FROM produtos);', dica: 'WHERE preco > (SELECT AVG(preco) FROM produtos)' },
          { p: 'Mostre o nome dos <b>clientes que têm pelo menos um pedido pago</b>, usando uma subconsulta com IN.', r: "SELECT nome FROM clientes WHERE id_cliente IN (SELECT id_cliente FROM pedidos WHERE status = 'pago');", dica: "id_cliente IN (SELECT id_cliente FROM pedidos WHERE status='pago')" },
          { p: 'Mostre o nome dos <b>clientes que nunca fizeram pedido</b>, agora com <b>NOT IN</b> em vez de LEFT JOIN.', r: 'SELECT nome FROM clientes WHERE id_cliente NOT IN (SELECT id_cliente FROM pedidos);', dica: 'NOT IN (SELECT id_cliente FROM pedidos)' },
          { p: 'Mostre o produto <b>mais caro do catálogo</b> comparando com o preço máximo (nome e preço).', r: 'SELECT nome, preco FROM produtos WHERE preco = (SELECT MAX(preco) FROM produtos);', dica: 'WHERE preco = (SELECT MAX(preco) FROM produtos)' },
          { p: 'Mostre o nome dos clientes com <b>estoque de pedidos acima da média de pedidos por cliente</b>: primeiro conte os pedidos por cliente, depois compare com a média dessas contagens.', r: 'SELECT c.nome FROM clientes c WHERE (SELECT COUNT(*) FROM pedidos p WHERE p.id_cliente = c.id_cliente) > (SELECT COUNT(*) * 1.0 / COUNT(DISTINCT id_cliente) FROM pedidos);', dica: 'Uma subconsulta conta os pedidos do cliente; a outra calcula a média geral.' }
        ,
          { p: 'Mostre os produtos com <b>estoque abaixo da média</b> do catálogo (nome e estoque).', r: 'SELECT nome, estoque FROM produtos WHERE estoque < (SELECT AVG(estoque) FROM produtos);', dica: 'WHERE estoque < (SELECT AVG(estoque) FROM produtos)' }
        ,
          { p: 'Mostre o nome dos <b>clientes que nunca tiveram pedido cancelado</b>, usando NOT IN.', r: "SELECT nome FROM clientes WHERE id_cliente NOT IN (SELECT id_cliente FROM pedidos WHERE status = 'cancelado');", dica: 'NOT IN com a lista de quem teve cancelamento' }
        ,
          { p: 'Mostre nome e preço dos produtos que custam <b>mais que o produto mais caro da Papelaria</b>.', r: "SELECT nome, preco FROM produtos WHERE preco > (SELECT MAX(preco) FROM produtos WHERE categoria = 'Papelaria');", dica: 'A subconsulta acha o teto da Papelaria.' }
        ]
      }
    ,
      {
        titulo: 'UNION — empilhar dois resultados',
        html: `O <code>UNION</code> junta o resultado de duas consultas <b>uma embaixo da outra</b>. As duas precisam ter a mesma quantidade de colunas e tipos compatíveis. O <code>UNION</code> remove as linhas repetidas; o <code>UNION ALL</code> mantém todas.`,
        exemplo: `-- uma lista só com produtos muito baratos e muito caros\nSELECT nome, 'barato' AS faixa FROM produtos WHERE preco < 5\nUNION\nSELECT nome, 'caro' FROM produtos WHERE preco > 35;`,
        desafios: [
          { p: "Monte <b>uma lista só</b> com o nome dos produtos abaixo de 5 (marcados como 'barato') e acima de 35 (marcados como 'caro').", r: "SELECT nome, 'barato' AS faixa FROM produtos WHERE preco < 5 UNION SELECT nome, 'caro' FROM produtos WHERE preco > 35;", dica: 'Duas consultas com o mesmo número de colunas, ligadas por UNION' },
          { p: 'Monte uma <b>agenda única</b> com o nome e a cidade de todos os clientes de Serra e de Guarapari, usando UNION.', r: "SELECT nome, cidade FROM clientes WHERE cidade = 'Serra' UNION SELECT nome, cidade FROM clientes WHERE cidade = 'Guarapari';", dica: 'Duas consultas ligadas por UNION' }
        ,
          { p: "Monte uma lista única com o nome dos <b>clientes de Vitoria</b> marcados como 'capital' e os <b>de Vila Velha</b> marcados como 'vizinha'.", r: "SELECT nome, 'capital' AS origem FROM clientes WHERE cidade = 'Vitoria' UNION SELECT nome, 'vizinha' FROM clientes WHERE cidade = 'Vila Velha';", dica: 'Duas consultas com duas colunas cada, ligadas por UNION' }
        ]
      }
    ]
  }
];

/* ==========================================================================
   PROGRESSO — fica na ficha do aluno, no banco, e também no navegador.

   O navegador serve de rascunho rápido e de rede de segurança quando a
   internet cai; o banco é o que garante continuar em outra máquina.
   ========================================================================== */
const CHAVE = 'lab-aurora-v1';
let resolvidos = new Set();
let rascunhos = {};

function lerLocal() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return { feitos: [], rascunhos: {} };
    const e = JSON.parse(bruto);
    return { feitos: e.feitos || [], rascunhos: e.rascunhos || {} };
  } catch { return { feitos: [], rascunhos: {} }; }
}

function salvarLocal() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ feitos: [...resolvidos], rascunhos }));
  } catch { /* aba anônima ou cota cheia: segue só com o banco */ }
}

/** Junta o que veio do banco com o que estava neste navegador. */
async function carregarProgresso() {
  const local = lerLocal();
  resolvidos = new Set(local.feitos);
  rascunhos = { ...local.rascunhos };

  try {
    const { data } = await sb.from('lab_progresso')
      .select('feitos, rascunhos').eq('perfil_id', eu.id).maybeSingle();
    if (data) {
      (data.feitos || []).forEach(id => resolvidos.add(id));
      /* o rascunho do banco só entra onde este navegador não tem nada */
      for (const [id, txt] of Object.entries(data.rascunhos || {})) {
        if (!rascunhos[id]) rascunhos[id] = txt;
      }
    }
  } catch (e) {
    console.warn('Não consegui buscar o progresso guardado:', e.message || e);
  }
}

let esperaBanco;
function salvarEstado() {
  salvarLocal();
  clearTimeout(esperaBanco);
  esperaBanco = setTimeout(gravarNoBanco, 1200);   // não grava a cada tecla
}

/** Grava já, sem esperar o intervalo. */
function gravarAgora() {
  clearTimeout(esperaBanco);
  salvarLocal();
  return gravarNoBanco();
}

/* Fechar a aba, trocar de janela ou apagar a tela do celular grava na hora.
   Sem isto, o que foi respondido nos últimos segundos ficaria só no navegador
   — e é justamente aí que o aluno costuma perder trabalho. */
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') gravarAgora();
});
addEventListener('pagehide', gravarAgora);

async function gravarNoBanco() {
  if (!sb || !eu) return;
  const marca = $('#marcaSalvo');
  try {
    const { error } = await sb.from('lab_progresso').upsert({
      perfil_id: eu.id, feitos: [...resolvidos], rascunhos
    }, { onConflict: 'perfil_id' });
    if (error) throw error;
    if (marca) { marca.textContent = 'progresso guardado'; marca.className = 'marca-salvo bom'; }
  } catch (e) {
    if (marca) { marca.textContent = 'sem guardar — confira a internet'; marca.className = 'marca-salvo ruim'; }
    console.warn('Falhou ao guardar no banco:', e.message || e);
  }
}

/* ---------- render ---------- */
let totalDesafios = 0;

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
    const nCasos = mod.licoes.reduce((t, li) => t + li.desafios.length, 0);
    return `
      <section class="modulo">
        <div class="modulo-cab"><span class="m-num">${mod.num}</span><h2>${esc(mod.nome)}</h2><span class="dur">${esc(mod.dur)} · ${nCasos} casos</span></div>
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

async function recomecar() {
  if (!confirm('Isto apaga o seu progresso e as consultas que você escreveu, aqui e na sua ficha. Continuar?')) return;
  try { localStorage.removeItem(CHAVE); } catch {}
  resolvidos = new Set(); rascunhos = {};
  try { await gravarNoBanco(); } catch {}
  location.reload();
}

function atualizarProgresso() {
  $('#feitos').textContent = resolvidos.size;
  $('#barraLab').style.width = (resolvidos.size / totalDesafios * 100) + '%';
}

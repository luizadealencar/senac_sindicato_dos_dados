/* ==========================================================================
   O LABORATÓRIO II — A CONSTRUÇÃO
   Aqui o aluno não só pergunta ao banco: ele mexe no banco.
   CREATE, INSERT, UPDATE, DELETE, ALTER, DROP, índices, views e transações.

   A diferença para o Laboratório I está na correção. Lá bastava comparar o
   resultado de um SELECT. Aqui o comando muda o banco, então cada caso roda
   em duas cópias limpas — a do aluno e a do gabarito — e o que se compara é
   o ESTADO das duas depois. Assim ninguém estraga a prova do colega, e uma
   bagunça no console não atrapalha a conferência.
   ========================================================================== */

import { sb, configurado, sessao, esc } from './sindicato.js';

let SQL = null;          // a biblioteca
let sementeDoBanco = null;  // bytes do banco recém-criado, para repor quando quiser
let db = null;           // o banco de trabalho, onde o aluno faz o que quiser
let eu = null;

const $ = s => document.querySelector(s);

/* ---------- porta ---------- */
function barrar(titulo, texto, rotulo = 'Entrar') {
  const m = $('#motor'); if (m) m.remove();
  const porta = $('#portaLab');
  porta.hidden = false;
  porta.innerHTML = `
    <h2>${esc(titulo)}</h2>
    <p>${esc(texto)}</p>
    <div class="acoes">
      <a class="btn" href="entrar.html?vai=laboratorio2.html">${esc(rotulo)}</a>
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
  const demorou = setTimeout(() => {
    const m = $('#motor');
    if (m) m.innerHTML = 'Ainda baixando o banco de dados (são 640 KB). ' +
      'Em internet lenta pode levar um minuto — deixe a página aberta.';
  }, 8000);

  return initSqlJs({ locateFile: f => 'assets/sqljs/' + f })
    .then(async lib => {
      clearTimeout(demorou);
      SQL = lib;
      const inicial = new SQL.Database();
      inicial.run(window.AURORA_SQL);
      sementeDoBanco = inicial.export();   // guarda o banco intacto para repor depois
      inicial.close();
      db = new SQL.Database(sementeDoBanco);

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

/* ==========================================================================
   RODAR SQL
   ========================================================================== */

/** Roda no banco de trabalho e devolve o último resultado que tiver linhas. */
function exec(sql, banco = db) {
  const res = banco.exec(sql);
  return res.length ? res[res.length - 1] : { columns: [], values: [] };
}

function tabelaHTML(r, aviso) {
  if (!r.columns.length) {
    return `<p class="nlinhas">${esc(aviso || 'Comando executado. O banco foi alterado.')}</p>`;
  }
  const cab = r.columns.map(c => `<th>${esc(c)}</th>`).join('');
  const corpo = r.values.map(l =>
    '<tr>' + l.map(v => `<td>${v === null ? '<i style="color:#9a9a9a">NULL</i>' : esc(v)}</td>`).join('') + '</tr>'
  ).join('');
  return `<p class="nlinhas">${r.values.length} linha${r.values.length === 1 ? '' : 's'}</p>
          <table><thead><tr>${cab}</tr></thead><tbody>${corpo}</tbody></table>`;
}

function rodarNaSaida(sql, alvo) {
  try {
    const r = exec(sql);
    alvo.innerHTML = tabelaHTML(r);
    montarEsquema();                       // o banco pode ter mudado de forma
  } catch (e) {
    alvo.innerHTML = `<div class="erro">Erro: ${esc(e.message)}</div>`;
  }
}

function ligarConsole() {
  $('#btnRodar').addEventListener('click', () => rodarNaSaida($('#sqlLivre').value, $('#saidaLivre')));
  $('#btnLimpar').addEventListener('click', () => {
    $('#sqlLivre').value = ''; $('#saidaLivre').innerHTML = ''; $('#sqlLivre').focus();
  });
  $('#btnRestaurar').addEventListener('click', restaurarBanco);
  $('#btnRecomecar')?.addEventListener('click', recomecar);
  $('#sqlLivre').addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault(); rodarNaSaida($('#sqlLivre').value, $('#saidaLivre'));
    }
  });
}

/** Devolve o banco ao estado de fábrica. Aqui se apaga tabela, então é essencial. */
function restaurarBanco() {
  if (!confirm('Isto devolve o banco ao estado original. O que você criou ou apagou no console se perde. Continuar?')) return;
  db.close();
  db = new SQL.Database(sementeDoBanco);
  montarEsquema();
  $('#saidaLivre').innerHTML = '<p class="nlinhas">Banco restaurado. Está tudo como no começo.</p>';
}

/* ==========================================================================
   CONFERIR — roda em cópias limpas e compara o estado das duas
   ========================================================================== */

function estadoDe(banco, verificacoes) {
  return verificacoes.map(q => {
    try {
      const r = banco.exec(q);
      const u = r.length ? r[r.length - 1] : { columns: [], values: [] };
      return JSON.stringify({ c: u.columns, v: u.values });
    } catch (e) {
      return 'ERRO:' + e.message;      // a tabela pode nem existir: isso também é um estado
    }
  });
}

function conferir(sqlAluno, caso) {
  if (!sqlAluno.trim()) return { ok: false, msg: 'Escreva o comando antes de conferir.' };

  let esperado, obtido;

  const dbG = new SQL.Database(sementeDoBanco);
  try {
    dbG.run(caso.r);
    esperado = estadoDe(dbG, caso.v);
  } catch (e) {
    dbG.close();
    return { ok: false, msg: 'Gabarito com problema — avise a docente. (' + e.message + ')' };
  }
  dbG.close();

  const dbA = new SQL.Database(sementeDoBanco);
  try {
    dbA.run(sqlAluno);
  } catch (e) {
    dbA.close();
    return { ok: false, msg: 'O seu SQL deu erro: ' + e.message };
  }
  obtido = estadoDe(dbA, caso.v);
  dbA.close();

  if (obtido.every((x, i) => x === esperado[i])) return { ok: true };

  /* diz onde está a diferença, sem entregar a resposta */
  const i = obtido.findIndex((x, k) => x !== esperado[k]);
  if (String(obtido[i]).startsWith('ERRO:')) {
    return { ok: false, msg: 'O banco não ficou como o pedido: ' + obtido[i].slice(5) };
  }
  return { ok: false, msg: caso.pista || recadoPorTipo(caso.r) };
}

/* A dica do erro muda conforme o comando: falar em "filtro do WHERE" num
   CREATE TABLE só confunde quem está começando. */
function recadoPorTipo(sqlGabarito) {
  const c = sqlGabarito.trim().toUpperCase();
  if (c.startsWith('CREATE TABLE'))
    return 'O banco não ficou do jeito pedido. Confira o nome da tabela, o nome de cada coluna e as restrições (PRIMARY KEY, NOT NULL, UNIQUE, DEFAULT, CHECK).';
  if (c.startsWith('CREATE INDEX') || c.startsWith('CREATE UNIQUE'))
    return 'O banco não ficou do jeito pedido. Confira o nome do índice, a tabela e a coluna.';
  if (c.startsWith('CREATE VIEW'))
    return 'O banco não ficou do jeito pedido. Confira o nome da view e a consulta que ela guarda.';
  if (c.startsWith('ALTER TABLE'))
    return 'O banco não ficou do jeito pedido. Confira a tabela, o nome da coluna e qual forma de ALTER o caso pede.';
  if (c.startsWith('DROP'))
    return 'O banco não ficou do jeito pedido. Confira o que devia sumir e o que devia ficar de pé.';
  if (c.startsWith('INSERT'))
    return 'O banco não ficou do jeito pedido. Confira as colunas, os valores e a ordem entre eles.';
  if (c.startsWith('UPDATE'))
    return 'O banco não ficou do jeito pedido. Confira o SET e, principalmente, o WHERE: sem ele o comando muda a tabela inteira.';
  if (c.startsWith('DELETE'))
    return 'O banco não ficou do jeito pedido. Confira o WHERE: sem ele o comando apaga tudo.';
  if (c.startsWith('BEGIN'))
    return 'O banco não ficou do jeito pedido. Confira a ordem dos comandos e se a transação termina em COMMIT ou ROLLBACK, como o caso pede.';
  return 'O banco não ficou do jeito pedido. Confira nomes, colunas e as condições do comando.';
}

/* ==========================================================================
   PROGRESSO — mesma ficha do Laboratório I, com identificadores próprios
   ========================================================================== */
const CHAVE = 'lab2-aurora-v1';
let resolvidos = new Set();
let rascunhos = {};

function lerLocal() {
  try {
    const b = localStorage.getItem(CHAVE);
    if (!b) return { feitos: [], rascunhos: {} };
    const e = JSON.parse(b);
    return { feitos: e.feitos || [], rascunhos: e.rascunhos || {} };
  } catch { return { feitos: [], rascunhos: {} }; }
}
function salvarLocal() {
  try { localStorage.setItem(CHAVE, JSON.stringify({ feitos: [...resolvidos], rascunhos })); } catch {}
}

async function carregarProgresso() {
  const local = lerLocal();
  resolvidos = new Set(local.feitos);
  rascunhos = { ...local.rascunhos };
  try {
    const { data } = await sb.from('lab_progresso')
      .select('feitos, rascunhos').eq('perfil_id', eu.id).maybeSingle();
    if (data) {
      (data.feitos || []).filter(id => id.startsWith('b')).forEach(id => resolvidos.add(id));
      for (const [id, txt] of Object.entries(data.rascunhos || {})) {
        if (id.startsWith('b') && !rascunhos[id]) rascunhos[id] = txt;
      }
    }
  } catch (e) { console.warn('Não consegui buscar o progresso:', e.message || e); }
}

let esperaBanco;
function salvarEstado() {
  salvarLocal();
  clearTimeout(esperaBanco);
  esperaBanco = setTimeout(gravarNoBanco, 1200);
}
function gravarAgora() { clearTimeout(esperaBanco); salvarLocal(); return gravarNoBanco(); }
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') gravarAgora(); });
addEventListener('pagehide', gravarAgora);

/** Escreve sem apagar o que o Laboratório I guardou na mesma ficha. */
async function gravarNoBanco() {
  if (!sb || !eu) return;
  const marca = $('#marcaSalvo');
  try {
    const { data } = await sb.from('lab_progresso')
      .select('feitos, rascunhos').eq('perfil_id', eu.id).maybeSingle();

    const outros = (data?.feitos || []).filter(id => !id.startsWith('b'));
    const rascOutros = Object.fromEntries(
      Object.entries(data?.rascunhos || {}).filter(([id]) => !id.startsWith('b')));

    const { error } = await sb.from('lab_progresso').upsert({
      perfil_id: eu.id,
      feitos: [...outros, ...resolvidos],
      rascunhos: { ...rascOutros, ...rascunhos }
    }, { onConflict: 'perfil_id' });
    if (error) throw error;
    if (marca) { marca.textContent = 'progresso guardado'; marca.className = 'marca-salvo bom'; }
  } catch (e) {
    if (marca) { marca.textContent = 'sem guardar — confira a internet'; marca.className = 'marca-salvo ruim'; }
    console.warn('Falhou ao guardar:', e.message || e);
  }
}

async function recomecar() {
  if (!confirm('Isto apaga o seu progresso neste laboratório e as consultas que você escreveu. Continuar?')) return;
  try { localStorage.removeItem(CHAVE); } catch {}
  resolvidos = new Set(); rascunhos = {};
  try { await gravarNoBanco(); } catch {}
  location.reload();
}

/* ==========================================================================
   O BANCO NA TELA
   ========================================================================== */
function montarEsquema() {
  const alvo = $('#tabelas');
  if (!alvo || !db) return;
  let tabelas = [];
  try {
    tabelas = exec("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name;").values;
  } catch { return; }

  alvo.innerHTML = tabelas.map(([t, tipo]) => {
    let colunas, fks = new Set(), n = '?';
    try {
      colunas = exec(`PRAGMA table_info(${t});`);
      const r = exec(`PRAGMA foreign_key_list(${t});`);
      const iF = r.columns.indexOf('from');
      r.values.forEach(l => fks.add(l[iF]));
      n = exec(`SELECT COUNT(*) FROM "${t}";`).values[0][0];
    } catch { return ''; }
    const iN = colunas.columns.indexOf('name'), iP = colunas.columns.indexOf('pk');
    const itens = colunas.values.map(l => {
      const nome = l[iN];
      const cls = l[iP] ? 'pk' : (fks.has(nome) ? 'fk' : '');
      return `<li${cls ? ` class="${cls}"` : ''}>${esc(nome)}</li>`;
    }).join('');
    return `<div class="tabela${tipo === 'view' ? ' e-view' : ''}">
      <h4>${esc(t)} <small>${tipo === 'view' ? 'view' : n}</small></h4><ul>${itens}</ul></div>`;
  }).join('');

  const cab = $('#bancoCab');
  if (cab) cab.textContent = `O banco: ${tabelas.length} tabelas`;
}

const MODULOS = [
  {
    num: 'I', nome: "Criar e povoar", dur: "Terça, 8 de setembro",
    licoes: [
      {
        titulo: "CREATE TABLE — levantar a tabela",
        html: "O <code>CREATE TABLE</code> desenha a tabela antes de existir qualquer dado: o nome dela, o nome de cada coluna e o tipo de cada uma. Os tipos mais usados são <code>INTEGER</code> para número inteiro, <code>REAL</code> para número com casas decimais, e <code>TEXT</code> para texto. No MySQL você veria <code>INT</code>, <code>DECIMAL(10,2)</code> e <code>VARCHAR(255)</code> — o SQLite aceita esses nomes também, mas guarda tudo do mesmo jeito.",
        exemplo: "-- a forma geral\nCREATE TABLE nome_da_tabela (\n  coluna1 TIPO,\n  coluna2 TIPO\n);\n\n-- um exemplo de verdade\nCREATE TABLE setores (\n  id_setor INTEGER PRIMARY KEY,\n  nome TEXT NOT NULL\n);",
        desafios: [
          { p: "Crie a tabela <b>fornecedores</b> com as colunas <b>id_fornecedor</b> (inteiro, chave primária), <b>nome</b> (texto, obrigatório) e <b>cidade</b> (texto).", r: "CREATE TABLE fornecedores (id_fornecedor INTEGER PRIMARY KEY, nome TEXT NOT NULL, cidade TEXT);", v: ["SELECT name, \"notnull\", pk FROM pragma_table_info('fornecedores');"], dica: "CREATE TABLE nome (coluna TIPO, ...); a chave primária é PRIMARY KEY." },
          { p: "Crie a tabela <b>categorias</b> com <b>id_categoria</b> (inteiro, chave primária) e <b>descricao</b> (texto, obrigatório).", r: "CREATE TABLE categorias (id_categoria INTEGER PRIMARY KEY, descricao TEXT NOT NULL);", v: ["SELECT name, \"notnull\", pk FROM pragma_table_info('categorias');"], dica: "Duas colunas: a chave primária e a descrição com NOT NULL." },
          { p: "Crie a tabela <b>transportadoras</b> com <b>id_transportadora</b> (chave primária), <b>nome</b> (obrigatório), <b>frete_base</b> (número decimal) e <b>ativa</b> (inteiro).", r: "CREATE TABLE transportadoras (id_transportadora INTEGER PRIMARY KEY, nome TEXT NOT NULL, frete_base REAL, ativa INTEGER);", v: ["SELECT name, \"notnull\", pk FROM pragma_table_info('transportadoras');"], dica: "Quatro colunas. Número com casas decimais é REAL (no MySQL seria DECIMAL)." },
          { p: "Crie a tabela <b>cupons</b> com <b>codigo</b> (texto, chave primária) e <b>desconto</b> (número decimal, obrigatório).", r: "CREATE TABLE cupons (codigo TEXT PRIMARY KEY, desconto REAL NOT NULL);", v: ["SELECT name, \"notnull\", pk FROM pragma_table_info('cupons');"], dica: "A chave primária não precisa ser número: aqui é o próprio código do cupom." },
          { p: "Crie a tabela <b>avaliacoes</b> com <b>id_avaliacao</b> (chave primária), <b>id_produto</b> (inteiro), <b>nota</b> (inteiro, obrigatório) e <b>comentario</b> (texto).", r: "CREATE TABLE avaliacoes (id_avaliacao INTEGER PRIMARY KEY, id_produto INTEGER, nota INTEGER NOT NULL, comentario TEXT);", v: ["SELECT name, \"notnull\", pk FROM pragma_table_info('avaliacoes');"], dica: "Quatro colunas, só a nota é obrigatória além da chave." },
          { p: "Crie a tabela <b>enderecos</b> com <b>id_endereco</b> (chave primária), <b>id_cliente</b> (inteiro, obrigatório), <b>rua</b> (texto) e <b>cep</b> (texto).", r: "CREATE TABLE enderecos (id_endereco INTEGER PRIMARY KEY, id_cliente INTEGER NOT NULL, rua TEXT, cep TEXT);", v: ["SELECT name, \"notnull\", pk FROM pragma_table_info('enderecos');"], dica: "id_cliente é obrigatório: um endereço sem dono não serve para nada." }
        ]
      }
      ,
      {
        titulo: "As restrições — o que a tabela não aceita",
        html: "Restrição é a regra que a tabela cobra de quem tenta gravar. <code>PRIMARY KEY</code> identifica a linha e não se repete. <code>NOT NULL</code> exige preenchimento. <code>UNIQUE</code> proíbe valor repetido. <code>DEFAULT</code> dá um valor quando ninguém informa. <code>CHECK</code> impõe uma condição. Elas valem para sempre: é o banco defendendo o dado de quem digita errado.",
        exemplo: "CREATE TABLE promocoes (\n  id_promocao INTEGER PRIMARY KEY,\n  nome TEXT NOT NULL UNIQUE,\n  percentual REAL CHECK (percentual BETWEEN 1 AND 90),\n  ativa INTEGER DEFAULT 1\n);",
        desafios: [
          { p: "Crie a tabela <b>marcas</b> com <b>id_marca</b> (chave primária) e <b>nome</b> (texto, obrigatório e <b>único</b>).", r: "CREATE TABLE marcas (id_marca INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE);", v: ["SELECT name, \"notnull\", pk FROM pragma_table_info('marcas');", "SELECT COUNT(*) FROM pragma_index_list('marcas') WHERE origin='u';"], dica: "UNIQUE vai junto do NOT NULL, na mesma coluna." },
          { p: "Crie a tabela <b>assinaturas</b> com <b>id_assinatura</b> (chave primária), <b>id_cliente</b> (inteiro) e <b>plano</b> (texto) com valor padrão <b>'basico'</b>.", r: "CREATE TABLE assinaturas (id_assinatura INTEGER PRIMARY KEY, id_cliente INTEGER, plano TEXT DEFAULT 'basico');", v: ["SELECT name, dflt_value FROM pragma_table_info('assinaturas');"], dica: "DEFAULT 'basico' logo depois do tipo da coluna." },
          { p: "Crie a tabela <b>notas_fiscais</b> com <b>id_nota</b> (chave primária), <b>valor</b> (decimal, obrigatório) e uma regra que só aceite <b>valor maior que zero</b>.", r: "CREATE TABLE notas_fiscais (id_nota INTEGER PRIMARY KEY, valor REAL NOT NULL CHECK (valor > 0));", v: ["SELECT sql FROM sqlite_master WHERE name='notas_fiscais';"], dica: "CHECK (valor > 0) depois da coluna." },
          { p: "Crie a tabela <b>funcionarios</b> com <b>id_funcionario</b> (chave primária), <b>nome</b> (obrigatório) e <b>salario</b> (decimal) com padrão <b>1500</b>.", r: "CREATE TABLE funcionarios (id_funcionario INTEGER PRIMARY KEY, nome TEXT NOT NULL, salario REAL DEFAULT 1500);", v: ["SELECT name, \"notnull\", dflt_value FROM pragma_table_info('funcionarios');"], dica: "DEFAULT 1500, sem aspas por ser número." },
          { p: "Crie a tabela <b>status_pedido</b> com <b>sigla</b> (texto, chave primária) e <b>descricao</b> (texto, obrigatório e único).", r: "CREATE TABLE status_pedido (sigla TEXT PRIMARY KEY, descricao TEXT NOT NULL UNIQUE);", v: ["SELECT name, \"notnull\", pk FROM pragma_table_info('status_pedido');", "SELECT COUNT(*) FROM pragma_index_list('status_pedido') WHERE origin='u';"], dica: "Chave primária de texto e a descrição com NOT NULL UNIQUE." },
          { p: "Crie a tabela <b>metas</b> com <b>id_meta</b> (chave primária), <b>mes</b> (texto) e <b>quantidade</b> (inteiro) que só aceite valores <b>de 0 a 1000</b>.", r: "CREATE TABLE metas (id_meta INTEGER PRIMARY KEY, mes TEXT, quantidade INTEGER CHECK (quantidade BETWEEN 0 AND 1000));", v: ["SELECT sql FROM sqlite_master WHERE name='metas';"], dica: "CHECK (quantidade BETWEEN 0 AND 1000)." },
          { p: "Crie a tabela <b>brindes</b> com <b>id_brinde</b> (chave primária), <b>nome</b> (obrigatório) e <b>estoque</b> (inteiro) com padrão <b>0</b>.", r: "CREATE TABLE brindes (id_brinde INTEGER PRIMARY KEY, nome TEXT NOT NULL, estoque INTEGER DEFAULT 0);", v: ["SELECT name, \"notnull\", dflt_value FROM pragma_table_info('brindes');"], dica: "DEFAULT 0 evita estoque em branco." },
          { p: "Crie a tabela <b>promocoes</b> com <b>id_promocao</b> (chave primária), <b>nome</b> (obrigatório e único), <b>percentual</b> (decimal) que só aceite <b>entre 1 e 90</b>, e <b>ativa</b> (inteiro) com padrão <b>1</b>.", r: "CREATE TABLE promocoes (id_promocao INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE, percentual REAL CHECK (percentual BETWEEN 1 AND 90), ativa INTEGER DEFAULT 1);", v: ["SELECT sql FROM sqlite_master WHERE name='promocoes';"], dica: "Junte tudo: NOT NULL, UNIQUE, CHECK e DEFAULT na mesma tabela." }
        ]
      }
      ,
      {
        titulo: "A chave estrangeira — amarrar duas tabelas",
        html: "A chave estrangeira diz que uma coluna aponta para a chave primária de outra tabela. É o que impede pedido de cliente que não existe. Escreve-se <code>FOREIGN KEY (coluna) REFERENCES outra_tabela(coluna)</code>, normalmente no fim do CREATE TABLE.",
        exemplo: "CREATE TABLE telefones (\n  id_telefone INTEGER PRIMARY KEY,\n  id_cliente INTEGER,\n  numero TEXT,\n  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)\n);",
        desafios: [
          { p: "Crie a tabela <b>telefones</b> com <b>id_telefone</b> (chave primária), <b>id_cliente</b> (inteiro) apontando para <b>clientes(id_cliente)</b>, e <b>numero</b> (texto).", r: "CREATE TABLE telefones (id_telefone INTEGER PRIMARY KEY, id_cliente INTEGER, numero TEXT, FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente));", v: ["SELECT \"table\", \"from\", \"to\" FROM pragma_foreign_key_list('telefones');", "SELECT name FROM pragma_table_info('telefones');"], dica: "FOREIGN KEY (coluna) REFERENCES outra_tabela(coluna), no fim da tabela." },
          { p: "Crie <b>itens_devolvidos</b> com <b>id_devolucao</b> (chave primária), <b>id_pedido</b> apontando para <b>pedidos(id_pedido)</b> e <b>motivo</b> (texto).", r: "CREATE TABLE itens_devolvidos (id_devolucao INTEGER PRIMARY KEY, id_pedido INTEGER, motivo TEXT, FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido));", v: ["SELECT \"table\", \"from\", \"to\" FROM pragma_foreign_key_list('itens_devolvidos');", "SELECT name FROM pragma_table_info('itens_devolvidos');"], dica: "A chave estrangeira aponta para pedidos(id_pedido)." },
          { p: "Crie <b>estoque_minimo</b> com <b>id_produto</b> (chave primária) que também aponta para <b>produtos(id_produto)</b>, e <b>minimo</b> (inteiro).", r: "CREATE TABLE estoque_minimo (id_produto INTEGER PRIMARY KEY, minimo INTEGER, FOREIGN KEY (id_produto) REFERENCES produtos(id_produto));", v: ["SELECT \"table\", \"from\", \"to\" FROM pragma_foreign_key_list('estoque_minimo');", "SELECT name, pk FROM pragma_table_info('estoque_minimo');"], dica: "A mesma coluna pode ser chave primária e estrangeira ao mesmo tempo." },
          { p: "Crie <b>favoritos</b> com <b>id_cliente</b> e <b>id_produto</b>, os dois apontando para as tabelas de origem, e com a <b>chave primária formada pelas duas colunas juntas</b>.", r: "CREATE TABLE favoritos (id_cliente INTEGER, id_produto INTEGER, PRIMARY KEY (id_cliente, id_produto), FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente), FOREIGN KEY (id_produto) REFERENCES produtos(id_produto));", v: ["SELECT name, pk FROM pragma_table_info('favoritos');", "SELECT COUNT(*) FROM pragma_foreign_key_list('favoritos');"], dica: "PRIMARY KEY (col1, col2) no fim faz a chave composta." },
          { p: "Crie <b>historico_precos</b> com <b>id_historico</b> (chave primária), <b>id_produto</b> apontando para produtos, <b>preco_antigo</b> e <b>preco_novo</b> (decimais).", r: "CREATE TABLE historico_precos (id_historico INTEGER PRIMARY KEY, id_produto INTEGER, preco_antigo REAL, preco_novo REAL, FOREIGN KEY (id_produto) REFERENCES produtos(id_produto));", v: ["SELECT \"table\", \"from\" FROM pragma_foreign_key_list('historico_precos');", "SELECT name FROM pragma_table_info('historico_precos');"], dica: "Quatro colunas mais a FOREIGN KEY no fim." }
        ]
      }
      ,
      {
        titulo: "INSERT — pôr dados dentro",
        html: "O <code>INSERT</code> grava linhas. A forma segura é dizer as colunas e, depois, os valores na mesma ordem. Texto e data vão entre aspas simples; número vai sem. Para gravar várias linhas de uma vez, basta repetir os parênteses depois do <code>VALUES</code>.",
        exemplo: "-- uma linha\nINSERT INTO setores (id_setor, nome) VALUES (1, 'Vendas');\n\n-- várias de uma vez\nINSERT INTO setores (id_setor, nome) VALUES\n  (2, 'Estoque'),\n  (3, 'Entrega');",
        desafios: [
          { p: "Insira em <b>produtos</b> o item <b>Borracha Branca</b>, categoria <b>Papelaria</b>, preço <b>2.50</b>, estoque <b>200</b>, com id <b>15</b>.", r: "INSERT INTO produtos (id_produto, nome, categoria, preco, estoque) VALUES (15, 'Borracha Branca', 'Papelaria', 2.50, 200);", v: ["SELECT * FROM produtos ORDER BY id_produto;"], dica: "INSERT INTO tabela (colunas) VALUES (valores);" },
          { p: "Insira o cliente de id <b>24</b>: nome <b>Yara Monteiro</b>, e-mail <b>yara.monteiro@email.com</b>, cidade <b>Vitoria</b>, status <b>ativo</b>, cadastro em <b>2026-09-20</b>, telefone <b>27 99610-2024</b>.", r: "INSERT INTO clientes (id_cliente, nome, email, cidade, status_cliente, data_cadastro, telefone) VALUES (24, 'Yara Monteiro', 'yara.monteiro@email.com', 'Vitoria', 'ativo', '2026-09-20', '27 99610-2024');", v: ["SELECT * FROM clientes ORDER BY id_cliente;"], dica: "Sete colunas, sete valores, na mesma ordem." },
          { p: "Insira <b>de uma vez só</b> dois produtos: id <b>16</b>, <b>Cola Bastão</b>, Papelaria, 6.90, estoque 120; e id <b>17</b>, <b>Tesoura Escolar</b>, Papelaria, 12.00, estoque 80.", r: "INSERT INTO produtos (id_produto, nome, categoria, preco, estoque) VALUES (16, 'Cola Bastão', 'Papelaria', 6.90, 120), (17, 'Tesoura Escolar', 'Papelaria', 12.00, 80);", v: ["SELECT * FROM produtos ORDER BY id_produto;"], dica: "Depois do VALUES dá para pôr vários grupos de parênteses, separados por vírgula." },
          { p: "Insira um pedido: id <b>41</b>, cliente <b>3</b>, data <b>2026-09-25</b>, status <b>aberto</b>.", r: "INSERT INTO pedidos (id_pedido, id_cliente, data_pedido, status) VALUES (41, 3, '2026-09-25', 'aberto');", v: ["SELECT * FROM pedidos ORDER BY id_pedido;"], dica: "Data é texto: vai entre aspas." },
          { p: "Insira em <b>itens_pedido</b> a linha: pedido <b>41</b>, produto <b>2</b>, quantidade <b>3</b>, preço unitário <b>18.00</b>.", r: "INSERT INTO itens_pedido (id_pedido, id_produto, quantidade, preco_unit) VALUES (41, 2, 3, 18.00);", v: ["SELECT * FROM itens_pedido ORDER BY id_pedido, id_produto;"], dica: "Esta tabela não tem chave primária própria: são as duas colunas de ligação." },
          { p: "Insira três clientes de uma vez, com ids <b>25, 26 e 27</b>, nomes <b>Zeca Prado</b>, <b>Alice Ferraz</b> e <b>Breno Sales</b>, todos de <b>Serra</b>, status <b>ativo</b>, cadastro <b>2026-09-21</b> e sem telefone (NULL).", r: "INSERT INTO clientes (id_cliente, nome, email, cidade, status_cliente, data_cadastro, telefone) VALUES (25, 'Zeca Prado', 'zeca.prado@email.com', 'Serra', 'ativo', '2026-09-21', NULL), (26, 'Alice Ferraz', 'alice.ferraz@email.com', 'Serra', 'ativo', '2026-09-21', NULL), (27, 'Breno Sales', 'breno.sales@email.com', 'Serra', 'ativo', '2026-09-21', NULL);", v: ["SELECT id_cliente, nome, cidade, status_cliente, data_cadastro, telefone FROM clientes ORDER BY id_cliente;"], dica: "NULL vai sem aspas — é ausência de valor, não a palavra “NULL”." },
          { p: "Insira um produto informando <b>só as colunas necessárias</b>: id <b>18</b>, nome <b>Clips Colorido</b>, categoria <b>Papelaria</b>, preço <b>4.00</b> e estoque <b>0</b>.", r: "INSERT INTO produtos (id_produto, nome, categoria, preco, estoque) VALUES (18, 'Clips Colorido', 'Papelaria', 4.00, 0);", v: ["SELECT * FROM produtos ORDER BY id_produto;"], dica: "Estoque zero é um valor: escreva 0, não deixe de fora." },
          { p: "Insira o pedido <b>42</b> do cliente <b>7</b>, data <b>2026-09-26</b>, status <b>pago</b>; e em seguida o item desse pedido: produto <b>5</b>, quantidade <b>2</b>, preço unitário <b>9.50</b>.", r: "INSERT INTO pedidos (id_pedido, id_cliente, data_pedido, status) VALUES (42, 7, '2026-09-26', 'pago');\nINSERT INTO itens_pedido (id_pedido, id_produto, quantidade, preco_unit) VALUES (42, 5, 2, 9.50);", v: ["SELECT * FROM pedidos ORDER BY id_pedido;", "SELECT * FROM itens_pedido ORDER BY id_pedido, id_produto;"], dica: "São dois comandos, um por linha, cada um terminando com ponto e vírgula." },
          { p: "Insira uma avaliação numa tabela nova: primeiro crie <b>avaliacoes_rapidas</b> com <b>id</b> (chave primária) e <b>nota</b> (inteiro), depois insira a nota <b>5</b> com id <b>1</b>.", r: "CREATE TABLE avaliacoes_rapidas (id INTEGER PRIMARY KEY, nota INTEGER);\nINSERT INTO avaliacoes_rapidas (id, nota) VALUES (1, 5);", v: ["SELECT * FROM avaliacoes_rapidas;"], dica: "Criar e povoar na sequência: dois comandos." }
        ]
      }
      ,
      {
        titulo: "INSERT ... SELECT — copiar de uma tabela para outra",
        html: "No lugar do <code>VALUES</code> pode entrar um <code>SELECT</code>: o banco pega o que a consulta devolveu e grava na outra tabela. É assim que se faz cópia de segurança antes de apagar, e é assim que se guarda um relatório já calculado.",
        exemplo: "CREATE TABLE clientes_vitoria (id_cliente INTEGER, nome TEXT);\n\nINSERT INTO clientes_vitoria (id_cliente, nome)\nSELECT id_cliente, nome FROM clientes WHERE cidade = 'Vitoria';",
        desafios: [
          { p: "Crie a tabela <b>clientes_vitoria</b> com <b>id_cliente</b> e <b>nome</b>, e copie para ela <b>todos os clientes de Vitoria</b>.", r: "CREATE TABLE clientes_vitoria (id_cliente INTEGER, nome TEXT);\nINSERT INTO clientes_vitoria (id_cliente, nome) SELECT id_cliente, nome FROM clientes WHERE cidade = 'Vitoria';", v: ["SELECT * FROM clientes_vitoria ORDER BY id_cliente;"], dica: "No lugar do VALUES entra um SELECT — sem parênteses." },
          { p: "Crie <b>produtos_caros</b> com <b>nome</b> e <b>preco</b>, e copie para ela os produtos com <b>preço acima de 20</b>.", r: "CREATE TABLE produtos_caros (nome TEXT, preco REAL);\nINSERT INTO produtos_caros (nome, preco) SELECT nome, preco FROM produtos WHERE preco > 20;", v: ["SELECT * FROM produtos_caros ORDER BY nome;"], dica: "INSERT INTO destino (colunas) SELECT colunas FROM origem WHERE ..." },
          { p: "Crie <b>resumo_categorias</b> com <b>categoria</b> e <b>total</b>, e grave nela <b>quantos produtos há em cada categoria</b>.", r: "CREATE TABLE resumo_categorias (categoria TEXT, total INTEGER);\nINSERT INTO resumo_categorias (categoria, total) SELECT categoria, COUNT(*) FROM produtos GROUP BY categoria;", v: ["SELECT * FROM resumo_categorias ORDER BY categoria;"], dica: "O SELECT pode ser agrupado: dá para guardar um relatório pronto." },
          { p: "Crie <b>backup_pedidos_cancelados</b> com as colunas <b>id_pedido</b>, <b>id_cliente</b> e <b>data_pedido</b>, e copie para ela os pedidos <b>cancelados</b>.", r: "CREATE TABLE backup_pedidos_cancelados (id_pedido INTEGER, id_cliente INTEGER, data_pedido TEXT);\nINSERT INTO backup_pedidos_cancelados (id_pedido, id_cliente, data_pedido) SELECT id_pedido, id_cliente, data_pedido FROM pedidos WHERE status = 'cancelado';", v: ["SELECT * FROM backup_pedidos_cancelados ORDER BY id_pedido;"], dica: "É assim que se guarda uma cópia antes de apagar alguma coisa." }
        ]
      }
      ,
      {
        titulo: "ALTER TABLE — mudar a tabela depois de pronta",
        html: "Tabela em uso também muda. O <code>ALTER TABLE</code> acrescenta coluna (<code>ADD COLUMN</code>), renomeia a tabela (<code>RENAME TO</code>), renomeia coluna (<code>RENAME COLUMN</code>) e apaga coluna (<code>DROP COLUMN</code>). O MySQL tem ainda o <code>MODIFY COLUMN</code> para trocar o tipo, que o SQLite não tem — lá se cria a tabela nova, copia e derruba a velha.",
        exemplo: "ALTER TABLE clientes ADD COLUMN observacao TEXT;\nALTER TABLE clientes RENAME COLUMN status_cliente TO situacao;\nALTER TABLE itens_pedido RENAME TO itens_do_pedido;",
        desafios: [
          { p: "Acrescente à tabela <b>clientes</b> a coluna <b>observacao</b>, do tipo texto.", r: "ALTER TABLE clientes ADD COLUMN observacao TEXT;", v: ["SELECT name FROM pragma_table_info('clientes');"], dica: "ALTER TABLE tabela ADD COLUMN nome TIPO;" },
          { p: "Acrescente a <b>produtos</b> a coluna <b>peso_gramas</b>, inteiro, com valor padrão <b>0</b>.", r: "ALTER TABLE produtos ADD COLUMN peso_gramas INTEGER DEFAULT 0;", v: ["SELECT name, dflt_value FROM pragma_table_info('produtos');", "SELECT id_produto, peso_gramas FROM produtos ORDER BY id_produto;"], dica: "O DEFAULT vale para as linhas que já existem." },
          { p: "Acrescente a <b>pedidos</b> a coluna <b>observacao</b> (texto) e a coluna <b>frete</b> (decimal, padrão 0).", r: "ALTER TABLE pedidos ADD COLUMN observacao TEXT;\nALTER TABLE pedidos ADD COLUMN frete REAL DEFAULT 0;", v: ["SELECT name, dflt_value FROM pragma_table_info('pedidos');"], dica: "Uma coluna por comando: são dois ALTER." },
          { p: "Renomeie a tabela <b>itens_pedido</b> para <b>itens_do_pedido</b>.", r: "ALTER TABLE itens_pedido RENAME TO itens_do_pedido;", v: ["SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"], dica: "ALTER TABLE atual RENAME TO novo; (no MySQL também vale RENAME TABLE a TO b)" },
          { p: "Renomeie, na tabela <b>clientes</b>, a coluna <b>status_cliente</b> para <b>situacao</b>.", r: "ALTER TABLE clientes RENAME COLUMN status_cliente TO situacao;", v: ["SELECT name FROM pragma_table_info('clientes');", "SELECT id_cliente, situacao FROM clientes ORDER BY id_cliente;"], dica: "ALTER TABLE tabela RENAME COLUMN antiga TO nova;" },
          { p: "Crie a tabela <b>ficha_teste</b> com as colunas <b>a</b> (inteiro), <b>b</b> (texto) e <b>c</b> (texto); depois <b>apague a coluna b</b>.", r: "CREATE TABLE ficha_teste (a INTEGER, b TEXT, c TEXT);\nALTER TABLE ficha_teste DROP COLUMN b;", v: ["SELECT name FROM pragma_table_info('ficha_teste');"], dica: "ALTER TABLE tabela DROP COLUMN coluna; — existe no SQLite desde 2021 e no MySQL há muito tempo." },
          { p: "Crie a tabela <b>rascunho</b> com uma coluna <b>a</b> (inteiro), depois acrescente a coluna <b>b</b> (texto) e renomeie a tabela para <b>rascunho_final</b>.", r: "CREATE TABLE rascunho (a INTEGER);\nALTER TABLE rascunho ADD COLUMN b TEXT;\nALTER TABLE rascunho RENAME TO rascunho_final;", v: ["SELECT name FROM pragma_table_info('rascunho_final');", "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('rascunho','rascunho_final');"], dica: "Três comandos em sequência." },
          { p: "Acrescente a <b>clientes</b> a coluna <b>pontos</b> (inteiro, padrão 0) e confira que todos os clientes já nascem com zero.", r: "ALTER TABLE clientes ADD COLUMN pontos INTEGER DEFAULT 0;", v: ["SELECT name, dflt_value FROM pragma_table_info('clientes');", "SELECT COUNT(*) FROM clientes WHERE pontos = 0;"], dica: "ADD COLUMN pontos INTEGER DEFAULT 0" }
        ]
      }
      ,
      {
        titulo: "DROP TABLE — derrubar a tabela",
        html: "O <code>DROP TABLE</code> apaga a tabela inteira: estrutura e dados, sem perguntar nada e sem lixeira. O <code>IF EXISTS</code> evita o erro quando a tabela não está lá. Antes de derrubar qualquer coisa em produção, copie: <code>CREATE TABLE backup ... INSERT ... SELECT</code>.",
        exemplo: "DROP TABLE temporaria;\n\n-- não dá erro nem se a tabela não existir\nDROP TABLE IF EXISTS fantasma;",
        desafios: [
          { p: "Crie as tabelas <b>rascunho_a</b> e <b>rascunho_b</b> (cada uma com uma coluna <b>x</b> inteira) e depois <b>apague só a rascunho_a</b>.", r: "CREATE TABLE rascunho_a (x INTEGER);\nCREATE TABLE rascunho_b (x INTEGER);\nDROP TABLE rascunho_a;", v: ["SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"], dica: "DROP TABLE nome; apaga estrutura e dados de uma vez, sem pedir confirmação." },
          { p: "Apague a tabela <b>itens_pedido</b> do banco.", r: "DROP TABLE itens_pedido;", v: ["SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"], dica: "Um comando só. Repare no aviso: os dados vão junto." },
          { p: "Num comando só para cada uma, apague <b>se existir</b> a tabela <b>fantasma</b> (que não existe) e <b>se existir</b> a tabela <b>itens_pedido</b> (que existe). Nenhum dos dois pode dar erro.", r: "DROP TABLE IF EXISTS fantasma;\nDROP TABLE IF EXISTS itens_pedido;", v: ["SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"], dica: "IF EXISTS evita o erro quando a tabela não está lá — e não atrapalha quando está." },
          { p: "Crie <b>lixo1</b>, <b>lixo2</b> e <b>lixo3</b> (cada uma com uma coluna <b>x</b> inteira) e depois apague <b>lixo1 e lixo2</b>, deixando só a lixo3.", r: "CREATE TABLE lixo1 (x INTEGER);\nCREATE TABLE lixo2 (x INTEGER);\nCREATE TABLE lixo3 (x INTEGER);\nDROP TABLE lixo1;\nDROP TABLE lixo2;", v: ["SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"], dica: "Cinco comandos: três para criar, dois para apagar." },
          { p: "Faça uma cópia de segurança antes de destruir: crie <b>copia_itens</b> com <b>id_pedido</b>, <b>id_produto</b> e <b>quantidade</b>, copie para ela tudo de <b>itens_pedido</b>, e só então apague a tabela <b>itens_pedido</b>.", r: "CREATE TABLE copia_itens (id_pedido INTEGER, id_produto INTEGER, quantidade INTEGER);\nINSERT INTO copia_itens (id_pedido, id_produto, quantidade) SELECT id_pedido, id_produto, quantidade FROM itens_pedido;\nDROP TABLE itens_pedido;", v: ["SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;", "SELECT COUNT(*) FROM copia_itens;"], dica: "Copiar antes de apagar é o hábito que salva emprego. Três comandos." }
        ]
      }
      ,
      {
        titulo: "Índices — deixar a busca rápida",
        html: "O índice é o dedo no dicionário: sem ele o banco lê a tabela inteira para achar uma linha. Crie índice na coluna que você mais filtra ou ordena. <code>UNIQUE INDEX</code> ainda impede valores repetidos. O preço é que toda gravação fica um pouco mais lenta — por isso não se indexa tudo.",
        exemplo: "CREATE INDEX idx_clientes_cidade ON clientes (cidade);\nCREATE UNIQUE INDEX idx_clientes_email ON clientes (email);\nDROP INDEX idx_clientes_cidade;",
        desafios: [
          { p: "Crie um índice chamado <b>idx_clientes_cidade</b> sobre a coluna <b>cidade</b> da tabela <b>clientes</b>.", r: "CREATE INDEX idx_clientes_cidade ON clientes (cidade);", v: ["SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name;"], dica: "CREATE INDEX nome ON tabela (coluna);" },
          { p: "Crie o índice <b>idx_produtos_categoria</b> sobre a coluna <b>categoria</b> de <b>produtos</b>.", r: "CREATE INDEX idx_produtos_categoria ON produtos (categoria);", v: ["SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name;"], dica: "O nome do índice é escolha sua; use idx_ para reconhecer depois." },
          { p: "Crie um índice <b>único</b> chamado <b>idx_clientes_email</b> sobre <b>email</b> em <b>clientes</b>.", r: "CREATE UNIQUE INDEX idx_clientes_email ON clientes (email);", v: ["SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name;", "SELECT sql FROM sqlite_master WHERE name='idx_clientes_email';"], dica: "CREATE UNIQUE INDEX impede dois valores iguais na coluna." },
          { p: "Crie o índice <b>idx_pedidos_cliente_data</b> sobre <b>duas colunas</b> de pedidos: <b>id_cliente</b> e <b>data_pedido</b>, nessa ordem.", r: "CREATE INDEX idx_pedidos_cliente_data ON pedidos (id_cliente, data_pedido);", v: ["SELECT sql FROM sqlite_master WHERE name='idx_pedidos_cliente_data';"], dica: "As colunas vão dentro dos parênteses, separadas por vírgula." },
          { p: "Crie os índices <b>idx_temp</b> (sobre <b>status</b> em pedidos) e <b>idx_fica</b> (sobre <b>data_pedido</b> em pedidos), e depois <b>apague só o idx_temp</b>.", r: "CREATE INDEX idx_temp ON pedidos (status);\nCREATE INDEX idx_fica ON pedidos (data_pedido);\nDROP INDEX idx_temp;", v: ["SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name;"], dica: "DROP INDEX nome; — no MySQL seria DROP INDEX nome ON tabela." }
        ]
      }
    ]
  },
  {
    num: 'II', nome: "Mexer e proteger", dur: "Quarta, 9 de setembro",
    licoes: [
      {
        titulo: "UPDATE — corrigir o que já está lá",
        html: "O <code>UPDATE</code> muda o que já está gravado. A parte que assusta é o <code>WHERE</code>: sem ele, o comando muda <b>todas as linhas da tabela</b>, e não há como desfazer sem transação. Escreva o WHERE primeiro, confira com um SELECT, e só então troque o SELECT pelo UPDATE.",
        exemplo: "-- confira antes\nSELECT * FROM produtos WHERE id_produto = 1;\n\n-- depois mude\nUPDATE produtos SET preco = 29.90 WHERE id_produto = 1;\n\n-- duas colunas de uma vez\nUPDATE clientes SET cidade = 'Serra', status_cliente = 'inativo'\nWHERE id_cliente = 4;",
        desafios: [
          { p: "O produto de id <b>1</b> mudou de preço: passe o <b>preco</b> dele para <b>29.90</b>.", r: "UPDATE produtos SET preco = 29.90 WHERE id_produto = 1;", v: ["SELECT id_produto, preco FROM produtos ORDER BY id_produto;"], dica: "UPDATE tabela SET coluna = valor WHERE condição;" },
          { p: "O cliente de id <b>2</b> mudou de cidade: passe a <b>cidade</b> dele para <b>Guarapari</b>.", r: "UPDATE clientes SET cidade = 'Guarapari' WHERE id_cliente = 2;", v: ["SELECT id_cliente, cidade FROM clientes ORDER BY id_cliente;"], dica: "Texto entre aspas simples no SET." },
          { p: "Passe o pedido de id <b>5</b> para o status <b>enviado</b>.", r: "UPDATE pedidos SET status = 'enviado' WHERE id_pedido = 5;", v: ["SELECT id_pedido, status FROM pedidos ORDER BY id_pedido;"], dica: "WHERE id_pedido = 5 — sem ele, todos os pedidos mudariam." },
          { p: "No cliente de id <b>4</b>, mude <b>de uma vez</b> a cidade para <b>Serra</b> e o status para <b>inativo</b>.", r: "UPDATE clientes SET cidade = 'Serra', status_cliente = 'inativo' WHERE id_cliente = 4;", v: ["SELECT id_cliente, cidade, status_cliente FROM clientes ORDER BY id_cliente;"], dica: "Duas colunas no mesmo SET, separadas por vírgula." },
          { p: "Marque como <b>inativo</b> todos os clientes da cidade de <b>Cariacica</b>.", r: "UPDATE clientes SET status_cliente = 'inativo' WHERE cidade = 'Cariacica';", v: ["SELECT id_cliente, cidade, status_cliente FROM clientes ORDER BY id_cliente;"], dica: "O WHERE pode pegar várias linhas de uma vez." },
          { p: "Todos os produtos com <b>estoque abaixo de 20</b> devem passar a ter estoque <b>50</b>.", r: "UPDATE produtos SET estoque = 50 WHERE estoque < 20;", v: ["SELECT id_produto, estoque FROM produtos ORDER BY id_produto;"], dica: "WHERE estoque < 20" },
          { p: "Preencha o telefone com o texto <b>sem telefone</b> em <b>todos os clientes que estão sem telefone</b>.", r: "UPDATE clientes SET telefone = 'sem telefone' WHERE telefone IS NULL;", v: ["SELECT id_cliente, telefone FROM clientes ORDER BY id_cliente;"], dica: "Para achar o vazio use IS NULL, nunca = NULL." },
          { p: "Passe para <b>cancelado</b> todos os pedidos que ainda estão <b>abertos</b> e foram feitos <b>antes de 2026-05-01</b>.", r: "UPDATE pedidos SET status = 'cancelado' WHERE status = 'aberto' AND data_pedido < '2026-05-01';", v: ["SELECT id_pedido, status FROM pedidos ORDER BY id_pedido;"], dica: "Duas condições ligadas por AND no WHERE." }
        ]
      }
      ,
      {
        titulo: "UPDATE com conta — mexer no valor que já existe",
        html: "A coluna pode aparecer dos dois lados do igual: <code>preco = preco * 1.1</code> lê o valor atual e grava o novo. Assim se dá aumento, desconto e baixa de estoque sem saber o valor de cada linha. O <code>WHERE</code> também aceita subconsulta, para atingir só quem aparece em outra tabela.",
        exemplo: "UPDATE produtos SET preco = preco * 1.1 WHERE categoria = 'Papelaria';\n\nUPDATE produtos SET estoque = estoque - 1\nWHERE id_produto IN (SELECT id_produto FROM itens_pedido);",
        desafios: [
          { p: "Dê um <b>aumento de 10%</b> no preço de <b>todos os produtos</b> da categoria <b>Papelaria</b>.", r: "UPDATE produtos SET preco = preco * 1.1 WHERE categoria = 'Papelaria';", v: ["SELECT id_produto, ROUND(preco,4) FROM produtos ORDER BY id_produto;"], dica: "A coluna pode aparecer dos dois lados: preco = preco * 1.1" },
          { p: "Some <b>50 unidades</b> ao estoque de todos os produtos de <b>Decoracao</b>.", r: "UPDATE produtos SET estoque = estoque + 50 WHERE categoria = 'Decoracao';", v: ["SELECT id_produto, estoque FROM produtos ORDER BY id_produto;"], dica: "estoque = estoque + 50" },
          { p: "Dê <b>10% de desconto</b> nos produtos com preço <b>acima de 30</b>, arredondando para 2 casas.", r: "UPDATE produtos SET preco = ROUND(preco * 0.9, 2) WHERE preco > 30;", v: ["SELECT id_produto, preco FROM produtos ORDER BY id_produto;"], dica: "Dá para usar ROUND dentro do SET." },
          { p: "Baixe <b>1 unidade</b> do estoque de <b>todos os produtos que já foram vendidos alguma vez</b> (use uma subconsulta com IN).", r: "UPDATE produtos SET estoque = estoque - 1 WHERE id_produto IN (SELECT id_produto FROM itens_pedido);", v: ["SELECT id_produto, estoque FROM produtos ORDER BY id_produto;"], dica: "WHERE id_produto IN (SELECT id_produto FROM itens_pedido)" },
          { p: "Marque como <b>ativo</b> todos os clientes que <b>já fizeram algum pedido</b>, usando uma subconsulta.", r: "UPDATE clientes SET status_cliente = 'ativo' WHERE id_cliente IN (SELECT id_cliente FROM pedidos);", v: ["SELECT id_cliente, status_cliente FROM clientes ORDER BY id_cliente;"], dica: "IN (SELECT id_cliente FROM pedidos)" },
          { p: "Zere o estoque dos produtos que <b>nunca</b> foram vendidos (subconsulta com NOT IN).", r: "UPDATE produtos SET estoque = 0 WHERE id_produto NOT IN (SELECT id_produto FROM itens_pedido);", v: ["SELECT id_produto, estoque FROM produtos ORDER BY id_produto;"], dica: "NOT IN (SELECT id_produto FROM itens_pedido)" }
        ]
      }
      ,
      {
        titulo: "DELETE — apagar linhas",
        html: "O <code>DELETE</code> apaga linhas e mantém a tabela de pé. Vale o mesmo aviso do UPDATE, em dobro: <code>DELETE FROM pedidos;</code> sem WHERE esvazia a tabela inteira. No MySQL existe o <code>TRUNCATE TABLE</code>, mais rápido para esvaziar tudo; no SQLite se usa o DELETE sem WHERE.",
        exemplo: "DELETE FROM pedidos WHERE id_pedido = 40;\n\n-- apaga tudo, a tabela continua existindo\nDELETE FROM itens_pedido;",
        desafios: [
          { p: "Apague o pedido de id <b>40</b>.", r: "DELETE FROM pedidos WHERE id_pedido = 40;", v: ["SELECT id_pedido FROM pedidos ORDER BY id_pedido;"], dica: "DELETE FROM tabela WHERE condição;" },
          { p: "Apague <b>todos os pedidos cancelados</b>.", r: "DELETE FROM pedidos WHERE status = 'cancelado';", v: ["SELECT id_pedido, status FROM pedidos ORDER BY id_pedido;"], dica: "WHERE status = 'cancelado'" },
          { p: "Apague os clientes que estão <b>inativos e sem telefone</b>.", r: "DELETE FROM clientes WHERE status_cliente = 'inativo' AND telefone IS NULL;", v: ["SELECT id_cliente, status_cliente, telefone FROM clientes ORDER BY id_cliente;"], dica: "Duas condições com AND; o vazio se testa com IS NULL." },
          { p: "Apague os itens de pedido com <b>quantidade menor que 2</b>.", r: "DELETE FROM itens_pedido WHERE quantidade < 2;", v: ["SELECT id_pedido, id_produto, quantidade FROM itens_pedido ORDER BY id_pedido, id_produto;"], dica: "WHERE quantidade < 2" },
          { p: "Apague os pedidos feitos <b>antes de 2026-04-01</b>.", r: "DELETE FROM pedidos WHERE data_pedido < '2026-04-01';", v: ["SELECT id_pedido, data_pedido FROM pedidos ORDER BY id_pedido;"], dica: "Data em texto, entre aspas." },
          { p: "Apague <b>todas as linhas</b> da tabela <b>itens_pedido</b>, mas <b>deixe a tabela de pé</b>.", r: "DELETE FROM itens_pedido;", v: ["SELECT COUNT(*) FROM itens_pedido;", "SELECT name FROM sqlite_master WHERE name='itens_pedido';"], dica: "DELETE sem WHERE apaga tudo — e a tabela continua existindo. Cuidado com esse comando na vida real." },
          { p: "Apague os clientes que <b>nunca fizeram pedido</b>, usando uma subconsulta com NOT IN.", r: "DELETE FROM clientes WHERE id_cliente NOT IN (SELECT id_cliente FROM pedidos);", v: ["SELECT id_cliente FROM clientes ORDER BY id_cliente;"], dica: "NOT IN (SELECT id_cliente FROM pedidos)" }
        ]
      }
      ,
      {
        titulo: "Transações — poder voltar atrás",
        html: "Transação é o comando com botão de desfazer. Depois do <code>BEGIN</code>, nada fica valendo de verdade até o <code>COMMIT</code>; o <code>ROLLBACK</code> devolve o banco ao ponto de partida. O <code>SAVEPOINT</code> marca um meio do caminho para onde se pode voltar. É o que se usa quando duas gravações só fazem sentido juntas.",
        exemplo: "BEGIN;\nDELETE FROM pedidos;\nROLLBACK;          -- nada aconteceu\n\nBEGIN;\nUPDATE pedidos SET status = 'enviado' WHERE id_pedido = 1;\nCOMMIT;            -- agora vale",
        desafios: [
          { p: "Abra uma transação, apague <b>todos os pedidos</b>, <b>desfaça</b> tudo com ROLLBACK e, já fora da transação, apague <b>apenas o pedido 40</b>. No fim só o 40 pode ter sumido.", r: "BEGIN;\nDELETE FROM pedidos;\nROLLBACK;\nDELETE FROM pedidos WHERE id_pedido = 40;", v: ["SELECT id_pedido FROM pedidos ORDER BY id_pedido;"], dica: "BEGIN; comando; ROLLBACK; devolve tudo ao ponto de partida. O que vem depois do ROLLBACK vale." },
          { p: "Abra uma transação, mude o status do pedido <b>1</b> para <b>enviado</b> e <b>confirme</b> com COMMIT.", r: "BEGIN;\nUPDATE pedidos SET status = 'enviado' WHERE id_pedido = 1;\nCOMMIT;", v: ["SELECT id_pedido, status FROM pedidos ORDER BY id_pedido;"], dica: "Com o COMMIT a mudança fica valendo de vez." },
          { p: "Numa transação: apague o cliente <b>1</b>, depois desfaça com ROLLBACK, e então apague de verdade o cliente <b>20</b> (fora da transação).", r: "BEGIN;\nDELETE FROM clientes WHERE id_cliente = 1;\nROLLBACK;\nDELETE FROM clientes WHERE id_cliente = 20;", v: ["SELECT id_cliente FROM clientes ORDER BY id_cliente;"], dica: "O ROLLBACK só desfaz o que está dentro da transação." },
          { p: "Numa transação, insira o produto id <b>19</b> (<b>Apontador Duplo</b>, Papelaria, 7.50, estoque 60) e confirme com COMMIT.", r: "BEGIN;\nINSERT INTO produtos (id_produto, nome, categoria, preco, estoque) VALUES (19, 'Apontador Duplo', 'Papelaria', 7.50, 60);\nCOMMIT;", v: ["SELECT * FROM produtos ORDER BY id_produto;"], dica: "BEGIN, o INSERT, e COMMIT." },
          { p: "Numa transação, dê <b>20% de aumento</b> em todos os produtos e desfaça com ROLLBACK. Depois, já fora da transação, aumente <b>10% somente no produto 1</b>.", r: "BEGIN;\nUPDATE produtos SET preco = preco * 1.2;\nROLLBACK;\nUPDATE produtos SET preco = preco * 1.1 WHERE id_produto = 1;", v: ["SELECT id_produto, ROUND(preco,4) FROM produtos ORDER BY id_produto;"], dica: "É o ensaio antes da estreia: testa, desfaz, e então faz o que era para valer." },
          { p: "Use um <b>SAVEPOINT</b>: abra a transação, apague os pedidos abertos, marque um ponto chamado <b>meio</b>, apague os pedidos pagos, volte até o ponto <b>meio</b> e confirme. No fim, os abertos somem e os pagos ficam.", r: "BEGIN;\nDELETE FROM pedidos WHERE status = 'aberto';\nSAVEPOINT meio;\nDELETE FROM pedidos WHERE status = 'pago';\nROLLBACK TO meio;\nCOMMIT;", v: ["SELECT id_pedido, status FROM pedidos ORDER BY id_pedido;"], dica: "SAVEPOINT nome; … ROLLBACK TO nome; volta só até ali." },
          { p: "Numa transação, insira o cliente id <b>28</b> (<b>Caio Vidal</b>, caio.vidal@email.com, Vitoria, ativo, 2026-09-28, sem telefone) e o pedido id <b>43</b> desse cliente (data 2026-09-28, status aberto). Confirme no fim.", r: "BEGIN;\nINSERT INTO clientes (id_cliente, nome, email, cidade, status_cliente, data_cadastro, telefone) VALUES (28, 'Caio Vidal', 'caio.vidal@email.com', 'Vitoria', 'ativo', '2026-09-28', NULL);\nINSERT INTO pedidos (id_pedido, id_cliente, data_pedido, status) VALUES (43, 28, '2026-09-28', 'aberto');\nCOMMIT;", v: ["SELECT id_cliente, nome FROM clientes ORDER BY id_cliente;", "SELECT id_pedido, id_cliente FROM pedidos ORDER BY id_pedido;"], dica: "Duas inserções que só valem juntas: ou entram as duas, ou nenhuma." },
          { p: "Numa transação, apague <b>todos os itens</b> e <b>todos os pedidos</b>, desfaça tudo com ROLLBACK e, em seguida, apague de verdade <b>somente o pedido 39</b>.", r: "BEGIN;\nDELETE FROM itens_pedido;\nDELETE FROM pedidos;\nROLLBACK;\nDELETE FROM pedidos WHERE id_pedido = 39;", v: ["SELECT COUNT(*) FROM itens_pedido;", "SELECT id_pedido FROM pedidos ORDER BY id_pedido;"], dica: "Um ROLLBACK desfaz todos os comandos da transação, não só o último." }
        ]
      }
      ,
      {
        titulo: "VIEW — dar nome a uma consulta",
        html: "A view guarda uma consulta com nome, e passa a ser usada como se fosse tabela. Ela não guarda cópia dos dados: sempre mostra o que está lá agora. Serve para esconder um JOIN complicado atrás de um nome simples e para dar a alguém só o pedaço que interessa.",
        exemplo: "CREATE VIEW vw_clientes_ativos AS\nSELECT id_cliente, nome FROM clientes WHERE status_cliente = 'ativo';\n\nSELECT * FROM vw_clientes_ativos;\n\nDROP VIEW vw_clientes_ativos;",
        desafios: [
          { p: "Crie a view <b>vw_clientes_ativos</b> mostrando <b>id_cliente</b> e <b>nome</b> dos clientes com status ativo.", r: "CREATE VIEW vw_clientes_ativos AS SELECT id_cliente, nome FROM clientes WHERE status_cliente = 'ativo';", v: ["SELECT name FROM sqlite_master WHERE type='view' ORDER BY name;", "SELECT * FROM vw_clientes_ativos ORDER BY id_cliente;"], dica: "CREATE VIEW nome AS SELECT ...;" },
          { p: "Crie a view <b>vw_produtos_caros</b> com <b>nome</b> e <b>preco</b> dos produtos acima de 20.", r: "CREATE VIEW vw_produtos_caros AS SELECT nome, preco FROM produtos WHERE preco > 20;", v: ["SELECT * FROM vw_produtos_caros ORDER BY nome;"], dica: "A view guarda a consulta, não os dados: ela sempre mostra o dado atual." },
          { p: "Crie a view <b>vw_pedidos_por_cliente</b> com <b>id_cliente</b> e a <b>contagem de pedidos</b> (chame a coluna de <b>total</b>).", r: "CREATE VIEW vw_pedidos_por_cliente AS SELECT id_cliente, COUNT(*) AS total FROM pedidos GROUP BY id_cliente;", v: ["SELECT * FROM vw_pedidos_por_cliente ORDER BY id_cliente;"], dica: "Uma view pode guardar uma consulta agrupada." },
          { p: "Crie a view <b>vw_temp</b> com o nome dos clientes, e depois <b>apague</b> essa view. Deixe também criada a view <b>vw_fica</b> com o nome dos produtos.", r: "CREATE VIEW vw_temp AS SELECT nome FROM clientes;\nCREATE VIEW vw_fica AS SELECT nome FROM produtos;\nDROP VIEW vw_temp;", v: ["SELECT name FROM sqlite_master WHERE type='view' ORDER BY name;"], dica: "DROP VIEW nome; — apaga só a consulta guardada, nunca os dados." },
          { p: "Crie a view <b>vw_faturamento_categoria</b> com <b>categoria</b> e a <b>soma de quantidade × preço unitário</b> (coluna <b>receita</b>), juntando itens e produtos.", r: "CREATE VIEW vw_faturamento_categoria AS SELECT pr.categoria, SUM(i.quantidade * i.preco_unit) AS receita FROM itens_pedido i JOIN produtos pr ON pr.id_produto = i.id_produto GROUP BY pr.categoria;", v: ["SELECT * FROM vw_faturamento_categoria ORDER BY categoria;"], dica: "Dá para guardar até um JOIN com agrupamento." },
          { p: "Crie a view <b>vw_sem_telefone</b> com <b>id_cliente</b> e <b>nome</b> de quem está sem telefone, e depois <b>consulte</b> a view apagando o cliente 22 antes — a view deve refletir a mudança.", r: "CREATE VIEW vw_sem_telefone AS SELECT id_cliente, nome FROM clientes WHERE telefone IS NULL;\nDELETE FROM clientes WHERE id_cliente = 22;", v: ["SELECT * FROM vw_sem_telefone ORDER BY id_cliente;"], dica: "A view não guarda cópia: ao apagar o cliente, ele some da view também." }
        ]
      }
      ,
      {
        titulo: "Quando a linha já existe — REPLACE e ON CONFLICT",
        html: "Gravar algo que talvez já exista é rotina. <code>INSERT OR IGNORE</code> engole o conflito e segue. <code>INSERT OR REPLACE</code> troca a linha inteira. <code>ON CONFLICT ... DO UPDATE</code> é o mais fino: insere se não houver, atualiza só o que você mandar se houver. No MySQL o equivalente é <code>ON DUPLICATE KEY UPDATE</code>.",
        exemplo: "INSERT OR IGNORE INTO produtos (id_produto, nome, categoria, preco, estoque)\nVALUES (2, 'Ignorado', 'Papelaria', 1, 1);\n\nINSERT INTO produtos (id_produto, nome, categoria, preco, estoque)\nVALUES (20, 'Fita Crepe', 'Papelaria', 8.00, 30)\nON CONFLICT(id_produto) DO UPDATE SET preco = excluded.preco;",
        desafios: [
          { p: "Use <b>INSERT OR REPLACE</b> para gravar o produto de id <b>1</b> como <b>Caderno Aurora A5</b>, Papelaria, preço <b>27.00</b>, estoque <b>44</b>.", r: "INSERT OR REPLACE INTO produtos (id_produto, nome, categoria, preco, estoque) VALUES (1, 'Caderno Aurora A5', 'Papelaria', 27.00, 44);", v: ["SELECT * FROM produtos ORDER BY id_produto;"], dica: "INSERT OR REPLACE troca a linha inteira quando a chave já existe." },
          { p: "Insira o produto id <b>20</b> (<b>Fita Crepe</b>, Papelaria, 8.00, estoque 30) e, <b>se o id já existir</b>, apenas atualize o preço. Use ON CONFLICT.", r: "INSERT INTO produtos (id_produto, nome, categoria, preco, estoque) VALUES (20, 'Fita Crepe', 'Papelaria', 8.00, 30) ON CONFLICT(id_produto) DO UPDATE SET preco = excluded.preco;", v: ["SELECT * FROM produtos ORDER BY id_produto;"], dica: "ON CONFLICT(coluna) DO UPDATE SET ... — o excluded traz o valor que você tentou inserir." },
          { p: "Com <b>INSERT OR IGNORE</b>, tente inserir dois produtos de uma vez: o id <b>2</b> (que já existe e deve ser ignorado, sem erro) e o id <b>22</b> (<b>Régua 30cm</b>, Papelaria, 6.00, estoque 70), que deve entrar.", r: "INSERT OR IGNORE INTO produtos (id_produto, nome, categoria, preco, estoque) VALUES (2, 'Nome Qualquer', 'Papelaria', 1.00, 1), (22, 'Régua 30cm', 'Papelaria', 6.00, 70);", v: ["SELECT * FROM produtos ORDER BY id_produto;"], dica: "INSERT OR IGNORE engole o conflito da linha repetida e insere as demais." },
          { p: "Use ON CONFLICT para <b>somar 100 ao estoque</b> do produto <b>3</b> caso ele já exista (tente inserir com estoque 5).", r: "INSERT INTO produtos (id_produto, nome, categoria, preco, estoque) VALUES (3, 'Post-it Colorido', 'Papelaria', 11.50, 5) ON CONFLICT(id_produto) DO UPDATE SET estoque = produtos.estoque + 100;", v: ["SELECT id_produto, estoque FROM produtos ORDER BY id_produto;"], dica: "Dentro do DO UPDATE, produtos.estoque é o valor que já estava lá." },
          { p: "Grave o cliente id <b>1</b> com INSERT OR REPLACE: nome <b>Ana Souza</b>, ana.souza@email.com, cidade <b>Serra</b>, ativo, cadastro <b>2026-03-01</b>, telefone <b>27 99610-1001</b>.", r: "INSERT OR REPLACE INTO clientes (id_cliente, nome, email, cidade, status_cliente, data_cadastro, telefone) VALUES (1, 'Ana Souza', 'ana.souza@email.com', 'Serra', 'ativo', '2026-03-01', '27 99610-1001');", v: ["SELECT id_cliente, nome, cidade, telefone FROM clientes ORDER BY id_cliente;"], dica: "Cuidado: o REPLACE troca a linha inteira, então informe todas as colunas." },
          { p: "Insira o produto id <b>21</b> (<b>Grampos 26/6</b>, Papelaria, 5.00, estoque 90) e, se já existir, <b>não faça nada</b> — usando ON CONFLICT DO NOTHING.", r: "INSERT INTO produtos (id_produto, nome, categoria, preco, estoque) VALUES (21, 'Grampos 26/6', 'Papelaria', 5.00, 90) ON CONFLICT(id_produto) DO NOTHING;", v: ["SELECT * FROM produtos ORDER BY id_produto;"], dica: "ON CONFLICT(id_produto) DO NOTHING" }
        ]
      }
      ,
      {
        titulo: "O que muda para o MySQL",
        html: "Quase tudo que você viu vale igual nos dois bancos. As diferenças que importam: <code>TRUNCATE TABLE</code> só no MySQL; <code>AUTO_INCREMENT</code> no MySQL virou <code>INTEGER PRIMARY KEY</code> aqui; <code>ALTER TABLE ... MODIFY COLUMN</code> não existe no SQLite; <code>RENAME TABLE a TO b</code> vira <code>ALTER TABLE a RENAME TO b</code>; e <code>GRANT</code>/<code>REVOKE</code>, que controlam quem pode o quê, não existem aqui porque o SQLite não tem usuários.",
        exemplo: "-- MySQL                        -- SQLite\n-- TRUNCATE TABLE t;            DELETE FROM t;\n-- id INT AUTO_INCREMENT        id INTEGER PRIMARY KEY\n-- ALTER TABLE t MODIFY c INT;  (cria nova, copia, derruba)\n-- RENAME TABLE a TO b;         ALTER TABLE a RENAME TO b;",
        desafios: [
          { p: "O MySQL tem <b>TRUNCATE TABLE</b> para esvaziar uma tabela de uma vez. Aqui no SQLite ele não existe: esvazie a tabela <b>itens_pedido</b> do jeito que funciona nos dois bancos.", r: "DELETE FROM itens_pedido;", v: ["SELECT COUNT(*) FROM itens_pedido;", "SELECT name FROM sqlite_master WHERE name='itens_pedido';"], dica: "DELETE FROM tabela; faz o mesmo efeito. No MySQL, TRUNCATE TABLE itens_pedido; seria mais rápido e zeraria o AUTO_INCREMENT." },
          { p: "No MySQL a coluna que se numera sozinha usa <b>AUTO_INCREMENT</b>; no SQLite, uma <b>INTEGER PRIMARY KEY</b> já faz isso. Crie <b>protocolos</b> com <b>id</b> numerando sozinho e <b>assunto</b> (texto), e insira dois assuntos (<b>Reclamação</b> e <b>Elogio</b>) <b>sem informar o id</b>.", r: "CREATE TABLE protocolos (id INTEGER PRIMARY KEY, assunto TEXT);\nINSERT INTO protocolos (assunto) VALUES ('Reclamação');\nINSERT INTO protocolos (assunto) VALUES ('Elogio');", v: ["SELECT * FROM protocolos ORDER BY id;"], dica: "Deixe o id de fora do INSERT e o banco numera. No MySQL seria id INT AUTO_INCREMENT PRIMARY KEY." },
          { p: "No MySQL, <b>ALTER TABLE ... MODIFY COLUMN</b> muda o tipo de uma coluna — o SQLite não tem esse comando. Faça o contorno: crie <b>clientes_novo</b> com <b>id_cliente</b> (chave primária) e <b>nome</b> (texto), copie os dados de clientes e apague a tabela <b>clientes</b>.", r: "CREATE TABLE clientes_novo (id_cliente INTEGER PRIMARY KEY, nome TEXT);\nINSERT INTO clientes_novo (id_cliente, nome) SELECT id_cliente, nome FROM clientes;\nDROP TABLE clientes;", v: ["SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;", "SELECT COUNT(*) FROM clientes_novo;"], dica: "Criar a nova, copiar e derrubar a velha: é assim que se muda um tipo no SQLite." },
          { p: "O MySQL controla quem pode o quê com <b>GRANT</b> e <b>REVOKE</b>; o SQLite não tem usuários, então esses comandos não existem aqui. Como treino do que dá para fazer nos dois, crie a tabela <b>log_acesso</b> com <b>id</b> (chave primária), <b>usuario</b> (texto) e <b>acao</b> (texto).", r: "CREATE TABLE log_acesso (id INTEGER PRIMARY KEY, usuario TEXT, acao TEXT);", v: ["SELECT name FROM pragma_table_info('log_acesso');"], dica: "Guarde a diferença: GRANT SELECT ON tabela TO 'usuario'@'localhost'; é MySQL, não roda aqui." },
          { p: "No MySQL se renomeia tabela com <b>RENAME TABLE a TO b</b>; aqui é ALTER TABLE. Renomeie <b>produtos</b> para <b>catalogo</b> do jeito que funciona no SQLite.", r: "ALTER TABLE produtos RENAME TO catalogo;", v: ["SELECT name FROM sqlite_master WHERE type='table' AND name IN ('produtos','catalogo');"], dica: "ALTER TABLE produtos RENAME TO catalogo;" }
        ]
      }
      ,
      {
        titulo: "A obra completa",
        html: "Agora é juntar. Um serviço de verdade quase nunca é um comando só: cria-se a tabela, povoa-se, ajusta-se a estrutura, e o conjunto vai dentro de uma transação para não sobrar meio caminho feito se algo falhar.",
        exemplo: "BEGIN;\nCREATE TABLE arquivo (id INTEGER PRIMARY KEY, nome TEXT);\nINSERT INTO arquivo (id, nome) SELECT id_produto, nome FROM produtos WHERE estoque = 0;\nDELETE FROM produtos WHERE estoque = 0;\nCOMMIT;",
        desafios: [
          { p: "Monte o cadastro de <b>setores</b>: crie a tabela com <b>id_setor</b> (chave primária) e <b>nome</b> (texto, obrigatório e único); insira <b>Vendas</b> e <b>Estoque</b> com ids 1 e 2; e crie o índice <b>idx_setores_nome</b> sobre o nome.", r: "CREATE TABLE setores (id_setor INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE);\nINSERT INTO setores (id_setor, nome) VALUES (1, 'Vendas'), (2, 'Estoque');\nCREATE INDEX idx_setores_nome ON setores (nome);", v: ["SELECT * FROM setores ORDER BY id_setor;", "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_setores_nome';"], dica: "Três comandos: criar, povoar e indexar." },
          { p: "Faça a limpeza de fim de semestre, tudo numa transação que termina em COMMIT: apague os itens dos pedidos cancelados, depois apague os pedidos cancelados.", r: "BEGIN;\nDELETE FROM itens_pedido WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE status = 'cancelado');\nDELETE FROM pedidos WHERE status = 'cancelado';\nCOMMIT;", v: ["SELECT COUNT(*) FROM pedidos WHERE status = 'cancelado';", "SELECT id_pedido, id_produto FROM itens_pedido ORDER BY id_pedido, id_produto;"], dica: "Apague primeiro o filho (itens) e depois o pai (pedido), senão sobra item órfão." },
          { p: "Crie a tabela <b>relatorio_cidades</b> com <b>cidade</b> e <b>clientes</b>, grave nela quantos clientes há em cada cidade, e acrescente depois a coluna <b>gerado_em</b> (texto) com padrão <b>'2026-09-09'</b>.", r: "CREATE TABLE relatorio_cidades (cidade TEXT, clientes INTEGER);\nINSERT INTO relatorio_cidades (cidade, clientes) SELECT cidade, COUNT(*) FROM clientes GROUP BY cidade;\nALTER TABLE relatorio_cidades ADD COLUMN gerado_em TEXT DEFAULT '2026-09-09';", v: ["SELECT * FROM relatorio_cidades ORDER BY cidade;", "SELECT name, dflt_value FROM pragma_table_info('relatorio_cidades');"], dica: "Criar, povoar com INSERT ... SELECT e alterar. Três comandos." },
          { p: "<b>Caso final.</b> Crie <b>produtos_arquivados</b> com as mesmas colunas de produtos (id_produto chave primária, nome, categoria, preco, estoque); mova para lá os produtos <b>com estoque zero</b> (copie e depois apague da tabela original); e faça tudo dentro de uma transação confirmada.", r: "BEGIN;\nCREATE TABLE produtos_arquivados (id_produto INTEGER PRIMARY KEY, nome TEXT, categoria TEXT, preco REAL, estoque INTEGER);\nINSERT INTO produtos_arquivados SELECT id_produto, nome, categoria, preco, estoque FROM produtos WHERE estoque = 0;\nDELETE FROM produtos WHERE estoque = 0;\nCOMMIT;", v: ["SELECT * FROM produtos_arquivados ORDER BY id_produto;", "SELECT id_produto FROM produtos ORDER BY id_produto;"], dica: "Copiar, apagar e confirmar — o arquivo morto de um sistema de verdade." }
        ]
      }
    ]
  }
];

/* ==========================================================================
   MONTAGEM DA PÁGINA
   ========================================================================== */
let totalDesafios = 0;
const gabaritos = {};

function pintarSQL(sql) {
  return esc(sql).replace(/(--[^\n]*)/g, '<span class="cm">$1</span>');
}

function montarConteudo() {
  const alvo = $('#conteudo');
  let n = 0;
  alvo.innerHTML = MODULOS.map(mod => {
    const nCasos = mod.licoes.reduce((t, li) => t + li.desafios.length, 0);
    const licoes = mod.licoes.map(li => {
      const casos = li.desafios.map(d => {
        const id = 'b' + (n++);
        gabaritos[id] = d;
        return `
          <div class="desafio" id="${id}">
            <div class="desafio-cab"><span>Caso</span><span>+10 XP</span></div>
            <div class="desafio-corpo">
              <p>${d.p}</p>
              <textarea spellcheck="false" placeholder="Escreva o seu comando aqui…"></textarea>
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
          ${casos}
        </div>`;
    }).join('');
    return `
      <section class="modulo">
        <div class="modulo-cab"><span class="m-num">${mod.num}</span><h2>${esc(mod.nome)}</h2><span class="dur">${esc(mod.dur)} · ${nCasos} casos</span></div>
        ${licoes}
      </section>`;
  }).join('');

  totalDesafios = n;
  $('#total').textContent = n;

  for (const [id, texto] of Object.entries(rascunhos)) {
    const ta = document.querySelector('#' + id + ' textarea');
    if (ta) ta.value = texto;
  }
  for (const id of [...resolvidos]) {
    const cx = document.getElementById(id);
    if (!cx) { resolvidos.delete(id); continue; }
    cx.classList.add('resolvido');
    const v = cx.querySelector('[data-vered]');
    if (v) { v.className = 'veredicto bom'; v.textContent = 'Resolvido numa sessão anterior.'; }
  }

  ligarInteracoes();
  atualizarProgresso();
}

function ligarInteracoes() {
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
      /* roda numa cópia, para o teste do aluno não bagunçar o banco de trabalho */
      const ta = $('#' + idR + ' textarea');
      const saida = document.querySelector(`[data-saida="${idR}"]`);
      const copia = new SQL.Database(db.export());
      try {
        const r = exec(ta.value, copia);
        saida.innerHTML = tabelaHTML(r, 'Comando executado numa cópia do banco — o banco de trabalho não mudou.');
      } catch (err) {
        saida.innerHTML = `<div class="erro">Erro: ${esc(err.message)}</div>`;
      }
      copia.close();
      return;
    }

    const idD = alvo.dataset.dica;
    if (idD) { document.querySelector(`[data-dicatxt="${idD}"]`).style.display = 'block'; return; }

    const idC = alvo.dataset.conferir;
    if (idC) {
      const ta = $('#' + idC + ' textarea');
      const vered = document.querySelector(`[data-vered="${idC}"]`);
      const r = conferir(ta.value, gabaritos[idC]);
      if (r.ok) {
        vered.className = 'veredicto bom';
        vered.textContent = 'Certo! O banco ficou como o pedido. +10 XP';
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

function atualizarProgresso() {
  $('#feitos').textContent = resolvidos.size;
  $('#barraLab').style.width = (totalDesafios ? resolvidos.size / totalDesafios * 100 : 0) + '%';
}

abrir();

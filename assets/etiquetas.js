/* ==========================================================================
   ETIQUETAS DO CASO — mostram, ao lado de cada exercício, quais comandos
   ele cobra. Saem do próprio gabarito, então nunca desencontram do conteúdo
   e não precisam ser escritas à mão em 240 casos.

   A ideia é a do pedido dos alunos: ter a matéria por perto na hora de
   responder, sem precisar rolar a página até a lição.
   ========================================================================== */

/* ordem importa: o mais específico vem antes, para "LEFT JOIN" não virar "JOIN"
   e "NOT IN" não virar "IN". */
const MARCAS = [
  // --- consultas ---
  [/\bLEFT\s+JOIN\b/i,            'LEFT JOIN'],
  [/\bJOIN\b/i,                   'JOIN'],
  [/\bGROUP\s+BY\b/i,             'GROUP BY'],
  [/\bHAVING\b/i,                 'HAVING'],
  [/\bORDER\s+BY\b/i,             'ORDER BY'],
  [/\bOFFSET\b/i,                 'OFFSET'],
  [/\bLIMIT\b/i,                  'LIMIT'],
  [/\bDISTINCT\b/i,               'DISTINCT'],
  [/\bUNION\b/i,                  'UNION'],
  [/\bCASE\s+WHEN\b/i,            'CASE WHEN'],
  [/\bIS\s+NOT\s+NULL\b/i,        'IS NOT NULL'],
  [/\bIS\s+NULL\b/i,              'IS NULL'],
  [/\bCOALESCE\s*\(/i,            'COALESCE'],
  [/\bNOT\s+IN\s*\(/i,            'NOT IN'],
  [/\bIN\s*\(\s*SELECT/i,         'subconsulta'],
  [/\bIN\s*\(/i,                  'IN'],
  [/\bNOT\s+BETWEEN\b|\bBETWEEN\b/i, 'BETWEEN'],
  [/\bLIKE\b/i,                   'LIKE'],
  [/\bCOUNT\s*\(/i,               'COUNT'],
  [/\bSUM\s*\(/i,                 'SUM'],
  [/\bAVG\s*\(/i,                 'AVG'],
  [/\bMAX\s*\(/i,                 'MAX'],
  [/\bMIN\s*\(/i,                 'MIN'],
  [/\bROUND\s*\(/i,               'ROUND'],
  [/\bUPPER\s*\(/i,               'UPPER'],
  [/\bLOWER\s*\(/i,               'LOWER'],
  [/\bLENGTH\s*\(/i,              'LENGTH'],
  [/\bSUBSTR\s*\(/i,              'SUBSTR'],
  [/\|\|/,                        'juntar texto (||)'],

  // --- construção ---
  [/\bCREATE\s+UNIQUE\s+INDEX\b/i, 'CREATE UNIQUE INDEX'],
  [/\bCREATE\s+INDEX\b/i,          'CREATE INDEX'],
  [/\bDROP\s+INDEX\b/i,            'DROP INDEX'],
  [/\bCREATE\s+VIEW\b/i,           'CREATE VIEW'],
  [/\bDROP\s+VIEW\b/i,             'DROP VIEW'],
  [/\bCREATE\s+TABLE\b/i,          'CREATE TABLE'],
  [/\bDROP\s+TABLE\s+IF\s+EXISTS\b/i, 'DROP TABLE IF EXISTS'],
  [/\bDROP\s+TABLE\b/i,            'DROP TABLE'],
  [/\bALTER\s+TABLE\b/i,           'ALTER TABLE'],
  [/\bADD\s+COLUMN\b/i,            'ADD COLUMN'],
  [/\bDROP\s+COLUMN\b/i,           'DROP COLUMN'],
  [/\bRENAME\s+COLUMN\b/i,         'RENAME COLUMN'],
  [/\bRENAME\s+TO\b/i,             'RENAME TO'],
  [/\bPRIMARY\s+KEY\b/i,           'PRIMARY KEY'],
  [/\bFOREIGN\s+KEY\b/i,           'FOREIGN KEY'],
  [/\bNOT\s+NULL\b/i,              'NOT NULL'],
  [/\bUNIQUE\b/i,                  'UNIQUE'],
  [/\bDEFAULT\b/i,                 'DEFAULT'],
  [/\bCHECK\s*\(/i,                'CHECK'],
  [/\bON\s+CONFLICT\b/i,           'ON CONFLICT'],
  [/\bINSERT\s+OR\s+IGNORE\b/i,    'INSERT OR IGNORE'],
  [/\bINSERT\s+OR\s+REPLACE\b/i,   'INSERT OR REPLACE'],
  [/\bINSERT\b[\s\S]*\bSELECT\b/i, 'INSERT ... SELECT'],
  [/\bINSERT\b/i,                  'INSERT'],
  [/\bUPDATE\b/i,                  'UPDATE'],
  [/\bDELETE\b/i,                  'DELETE'],
  [/\bSAVEPOINT\b/i,               'SAVEPOINT'],
  [/\bROLLBACK\b/i,                'ROLLBACK'],
  [/\bCOMMIT\b/i,                  'COMMIT'],
  [/\bBEGIN\b/i,                   'BEGIN'],

  // --- o básico, no fim, para não roubar a vez dos específicos ---
  [/\bWHERE\b/i,                   'WHERE'],
  [/\bSELECT\b/i,                  'SELECT'],
];

/** Quais comandos este gabarito usa. No máximo seis, para não virar sopa. */
export function etiquetasDe(sql, limite = 6) {
  const achadas = [];
  for (const [re, nome] of MARCAS) {
    if (re.test(sql) && !achadas.includes(nome)) achadas.push(nome);
    if (achadas.length >= limite) break;
  }
  /* JOIN sozinho quando já há LEFT JOIN é ruído */
  if (achadas.includes('LEFT JOIN')) {
    const i = achadas.indexOf('JOIN');
    if (i >= 0) achadas.splice(i, 1);
  }
  return achadas;
}

/** O HTML das etiquetas, pronto para entrar no cabeçalho do caso. */
export function htmlEtiquetas(sql) {
  const lista = etiquetasDe(sql);
  if (!lista.length) return '';
  return `<span class="usa">${lista.map(t => `<code>${t}</code>`).join('')}</span>`;
}

/* --------------------------------------------------------------------------
   O texto puro de um trecho de HTML, para virar resumo.
   Tags de bloco viram espaço (senão palavras se colam); tags de linha, como
   <code> e <b>, somem sem deixar espaço (senão sai "NULL ," e "tabela ."),
   e as entidades voltam a ser &gt; → >.
   -------------------------------------------------------------------------- */
export function textoDe(html) {
  const semBloco = String(html)
    .replace(/<\/(p|li|h[1-6]|div|tr)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '');
  const cx = document.createElement('textarea');
  cx.innerHTML = semBloco;
  return cx.value.replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
}

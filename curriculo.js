/* ==========================================================================
   CURRÍCULO — fonte única dos 27 dias do curso.
   As duas páginas (index e caderno) leem daqui. Edite AQUI e vale nos dois.

   Fio condutor: cada célula (grupo) inventa uma empresa e constrói o banco
   de dados dela ao longo do curso. A missão de cada dia faz esse banco andar.

   Campos de cada dia:
     d       número da operação (1 a 27)
     ato     ato a que pertence (I a VI)
     titulo  nome da operação
     vemos   o que é apresentado nas 3h30 de aula
     ref     âncora da Consulta rápida no caderno (onde revisar o conteúdo)
     missao  a ÚNICA entrega do dia, feita nos últimos 30 min e enviada no site
   ========================================================================== */
window.CURRICULO = {
  /* Troque para "seu-usuario/seu-repositorio". Usado no botão de entrega. */
  repo: "seu-usuario/sindicato-dos-dados",

  /* Calendário: conta segunda a sexta a partir de inicio, pulando os feriados. */
  inicio: "2026-08-17",
  feriados: ["2026-09-07"],

  atos: {
    I:   "O reconhecimento",
    II:  "A planta",
    III: "O cofre",
    IV:  "A ponte",
    V:   "A lei",
    VI:  "O dossiê"
  },

  dias: [
    { d:1, ato:"I", titulo:"O recrutamento", ref:"#ref-banco",
      vemos:"No data show: como o site e as aulas funcionam, e o projeto que atravessa o curso — cada grupo vai inventar uma empresa e construir o banco de dados dela. Formação das células.",
      missao:"Sem celular e sem PC hoje. Dividam-se em grupos, escolham o nome da célula e inventem a empresa que vocês vão modelar (nome e o que ela faz). O nome da célula entra no site." },
    { d:2, ato:"I", titulo:"O que a gente guarda", ref:"#ref-banco",
      vemos:"O que é um banco de dados. Tabelas, registros e atributos. Nomenclatura: minúsculas, snake_case, nomes descritivos, prefixos.",
      missao:"Descrevam a empresa de vocês em um parágrafo e listem tudo que ela precisa guardar (clientes, produtos, pedidos…). É o rascunho das futuras tabelas e colunas." },
    { d:3, ato:"I", titulo:"Sete cofres", ref:"#ref-banco",
      vemos:"Os sete tipos de banco: relacional, NoSQL, hierárquico, em rede, orientado a objetos, em memória e distribuído. ACID contra consistência eventual.",
      missao:"Escolham o tipo de banco para a empresa de vocês e justifiquem em três linhas por que ele serve melhor que os outros ao negócio." },
    { d:4, ato:"I", titulo:"O porteiro", ref:"#ref-banco",
      vemos:"O que faz um SGBD: armazenamento, transações, concorrência, segurança, backup e indexação. Preparação do ambiente (SGBD instalado ou online).",
      missao:"Escolham o SGBD, deixem o ambiente pronto (ou abram um ambiente online) e entreguem um print com ele rodando." },
    { d:5, ato:"I", titulo:"Relatório de inteligência", ref:"#ref-banco",
      vemos:"Fechamento do Ato I. Amarrando tipo de banco, SGBD e as necessidades da empresa num argumento único.",
      missao:"Resenha crítica: recomendem um tipo de banco e um SGBD para a empresa de vocês, com justificativa de negócio. É a entrega que fecha o Ato I." },
    { d:6, ato:"II", titulo:"Entidades e atributos", ref:"#ref-modelagem",
      vemos:"MER (Modelo Entidade-Relacionamento): o que vira entidade e o que vira atributo.",
      missao:"Listem as entidades e os atributos da empresa de vocês. Este é o primeiro rascunho do modelo." },
    { d:7, ato:"II", titulo:"Quem se liga a quem", ref:"#ref-modelagem",
      vemos:"Relacionamentos e cardinalidade: 1:1, 1:N e N:M.",
      missao:"Definam os relacionamentos entre as entidades da empresa e a cardinalidade de cada um. Entreguem a lista." },
    { d:8, ato:"II", titulo:"A planta no papel", ref:"#ref-modelagem",
      vemos:"DER e seus símbolos. Modelagem no brModelo ou no dbdiagram.io, que já gera o SQL a partir do desenho.",
      missao:"Desenhem o DER da empresa no brModelo ou dbdiagram.io e entreguem a imagem do diagrama." },
    { d:9, ato:"II", titulo:"A tabela imunda", ref:"#ref-modelagem",
      vemos:"Normalização até a 3ª forma normal: recortar uma planilha caótica em tabelas limpas.",
      missao:"Peguem uma tabela bagunçada da empresa de vocês e normalizem até a 3FN. Entreguem o antes e o depois." },
    { d:10, ato:"II", titulo:"As chaves da casa", ref:"#ref-modelagem",
      vemos:"Chave primária, chave estrangeira e integridade referencial. Por que um pedido órfão quebra o sistema.",
      missao:"Marquem no modelo as chaves primárias e estrangeiras de cada tabela e mostrem onde a integridade referencial protege os dados." },
    { d:11, ato:"II", titulo:"Boss: a planta do zero", ref:"#ref-modelagem",
      vemos:"Dia de entrega do Ato II. Cada célula defende o modelo diante da turma.",
      missao:"Entreguem o DER final da empresa: completo, normalizado e pronto para virar tabelas. É a entrega que fecha o Ato II." },
    { d:12, ato:"III", titulo:"Abrindo o cofre — DDL", ref:"#ref-sql",
      vemos:"CREATE DATABASE, CREATE TABLE e os tipos de dados (INTEGER, VARCHAR, DATE, DECIMAL). Traduzir o DER em código.",
      missao:"Escrevam o script CREATE TABLE de todas as tabelas do modelo de vocês e entreguem o SQL." },
    { d:13, ato:"III", titulo:"Regras da casa", ref:"#ref-sql",
      vemos:"ALTER e DROP. Restrições NOT NULL, UNIQUE, CHECK, DEFAULT, AUTO_INCREMENT. Índices e por que a consulta fica rápida.",
      missao:"Adicionem restrições às tabelas (NOT NULL, UNIQUE, CHECK, DEFAULT) e pelo menos um índice. Entreguem o script atualizado." },
    { d:14, ato:"III", titulo:"Movimentando — DML", ref:"#ref-sql",
      vemos:"INSERT, UPDATE e DELETE. O perigo do DELETE sem WHERE, demonstrado ao vivo.",
      missao:"Populem o banco da empresa com dados de verdade: no mínimo cinco linhas por tabela, com INSERT. Entreguem o SQL." },
    { d:15, ato:"III", titulo:"Perguntando — DQL", ref:"#ref-sql",
      vemos:"SELECT, WHERE, operadores lógicos, LIKE, BETWEEN, IN.",
      missao:"Escrevam cinco consultas SELECT que respondam perguntas úteis para a empresa de vocês. Entreguem as queries e os resultados." },
    { d:16, ato:"III", titulo:"Organizando a resposta", ref:"#ref-sql",
      vemos:"ORDER BY, LIMIT, DISTINCT, COUNT, SUM, AVG, MAX, MIN e GROUP BY com HAVING.",
      missao:"Montem um pequeno relatório da empresa com agregações e agrupamento (ex.: total de vendas por categoria). Entreguem as queries." },
    { d:17, ato:"III", titulo:"Costurando tabelas — JOIN", ref:"#ref-sql",
      vemos:"INNER JOIN e LEFT JOIN. Consultar duas e três tabelas de uma vez. O dia mais difícil do ato.",
      missao:"Escrevam três consultas que cruzam duas ou mais tabelas com JOIN. Entreguem as queries e o resultado." },
    { d:18, ato:"III", titulo:"Cofre e cadeado — TCL e DCL", ref:"#ref-sql",
      vemos:"START TRANSACTION, COMMIT, ROLLBACK. CREATE USER, GRANT e REVOKE. Quem pode ver o quê.",
      missao:"Façam uma transação com COMMIT/ROLLBACK e criem um usuário só de consulta com GRANT. Entreguem o SQL." },
    { d:19, ato:"III", titulo:"Boss: caso de assassinato", ref:"#ref-sql",
      vemos:"SQL Murder Mystery cronometrado, em célula. Só se resolve com SELECT, WHERE e JOIN.",
      missao:"Resolvam o SQL Murder Mystery em célula. Entreguem a query final e o nome do culpado. Quem entrega certo leva a patente." },
    { d:20, ato:"IV", titulo:"A ponte", ref:"#ref-crud",
      vemos:"Conectar uma aplicação ao SGBD: driver, string de conexão, o primeiro SELECT vindo do código.",
      missao:"Conectem uma aplicação ao banco da empresa e tragam o primeiro SELECT rodando pelo código. Entreguem o print." },
    { d:21, ato:"IV", titulo:"CRUD completo", ref:"#ref-crud",
      vemos:"Create, Read, Update e Delete funcionando pela interface da aplicação, com tratamento de erro.",
      missao:"Deixem o CRUD funcionando pela aplicação. Entreguem prints das quatro operações (criar, ler, atualizar, excluir)." },
    { d:22, ato:"IV", titulo:"Auditoria cruzada", ref:"#ref-crud",
      vemos:"Cada célula revisa o banco de outra por Pull Request, seguindo checklist de nomenclatura, chaves, normalização e restrições.",
      missao:"Revisem o banco de outra célula pelo checklist e entreguem o parecer: o que está bom e o que precisa corrigir." },
    { d:23, ato:"V", titulo:"A lei chega", ref:"#ref-lgpd",
      vemos:"LGPD: dado pessoal e sensível, titular, tratamento, princípios, direitos do titular, controlador, operador, DPO, ANPD e penalidades.",
      missao:"Apontem no banco da empresa de vocês quais dados são pessoais e quais são sensíveis, e o que a LGPD exige para cada um." },
    { d:24, ato:"V", titulo:"Tribunal", ref:"#ref-lgpd",
      vemos:"Júri simulado sobre um vazamento, com a turma dividida entre acusação e defesa.",
      missao:"Preparem a peça do júri (acusação ou defesa, conforme o sorteio) sobre um vazamento na empresa. Entreguem o texto." },
    { d:25, ato:"V", titulo:"Mudança de cofre", ref:"#ref-banco",
      vemos:"Conversão de banco: análise, mapeamento, extração, transformação, carga, validação e otimização.",
      missao:"Migrem um arquivo sujo (planilha/CSV) para dentro do banco da empresa. Entreguem o antes, o script e o depois." },
    { d:26, ato:"VI", titulo:"Fechando o dossiê", ref:"#ref-crud",
      vemos:"Montagem final, README documentando o modelo, script de criação versionado, últimos ajustes de desempenho.",
      missao:"Escrevam o README do banco da empresa (modelo, tabelas, como rodar) e versionem o script de criação. Entreguem o link." },
    { d:27, ato:"VI", titulo:"A última entrega", ref:"#ref-crud",
      vemos:"Apresentação do banco com a aplicação rodando ao vivo. Dez minutos por célula, mais arguição da turma e da docente.",
      missao:"Apresentem o banco da empresa com a aplicação rodando ao vivo. Entreguem o link do repositório e o README final." }
  ],

  /* ----- utilidades de calendário (usadas pelas duas páginas) ----- */
  _iso: function(d){ return d.toISOString().slice(0,10); },

  dataDoDia: function(n){
    var feriados = new Set(this.feriados || []);
    var d = new Date(this.inicio + "T00:00:00");
    var cont = 0;
    while (true){
      var dow = d.getDay();
      if (dow !== 0 && dow !== 6 && !feriados.has(this._iso(d))){
        cont++;
        if (cont === n) return new Date(d);
      }
      d.setDate(d.getDate() + 1);
      if (cont === 0 && d > new Date(this.inicio + "T00:00:00").setFullYear(2100)) return null;
    }
  },

  diaDeHoje: function(hoje){
    var total = this.dias.length;
    var feriados = new Set(this.feriados || []);
    var ini = new Date(this.inicio + "T00:00:00");
    hoje = hoje || new Date();
    var ref = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    if (ref < ini) return 1;
    var n = 0;
    for (var d = new Date(ini); d <= ref; d.setDate(d.getDate()+1)){
      var dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      if (feriados.has(this._iso(d))) continue;
      n++;
      if (n >= total) return total;
    }
    return Math.max(1, Math.min(n, total));
  },

  /* dd/mm formatado, ou "" se não der */
  dataBR: function(n){
    var d = this.dataDoDia(n);
    if (!d || isNaN(d)) return "";
    return String(d.getDate()).padStart(2,"0") + "/" + String(d.getMonth()+1).padStart(2,"0");
  }
};

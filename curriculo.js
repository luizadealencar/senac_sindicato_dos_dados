/* ==========================================================================
   O SINDICATO DOS DADOS — currículo (fonte única para index.html e caderno.html)
   UC5 · Desenvolver banco de dados · 72h · 4h/dia · seg a sex.
   A parte da docente são 13 dias (52h), de 24/08 a 10/09/2026 (o curso começou
   em 17/08 com outro professor; aqui recomeça do zero). Feriado: 07/09.
   ========================================================================== */
window.CURRICULO = {
  repo: "SEU-USUARIO/senac_sindicato_dos_dados",

  /* Calendário: conta segunda a sexta a partir de inicio, pulando os feriados. */
  inicio: "2026-08-24",
  feriados: ["2026-09-07"],

  atos: {
    I:   "Fundação e modelagem",
    II:  "Erguer e povoar",
    III: "Interrogar o banco",
    IV:  "Proteger e fechar"
  },

  dias: [
    { d:1,  ato:"I", titulo:"O recrutamento", ref:"#ref-banco",
      vemos:"Sem correria: o que é um banco de dados, o que faz um SGBD e os tipos de dados. Formem a célula e inventem a empresa que vão modelar o curso inteiro." },
    { d:2,  ato:"I", titulo:"Levantar o que a empresa guarda", ref:"#ref-modelagem",
      vemos:"Modelagem conceitual: levantamento de dados, dicionário de dados, e as primeiras entidades e atributos da empresa." },
    { d:3,  ato:"I", titulo:"Quem se liga a quem", ref:"#ref-modelagem",
      vemos:"Relacionamentos e cardinalidade (1:1, 1:N, N:M). Chaves candidata, primária e estrangeira. Integridade referencial." },
    { d:4,  ato:"I", titulo:"A planta e a faxina", ref:"#ref-modelagem",
      vemos:"Fecha o DER no brModelo ou dbdiagram e normaliza até a 3ª forma normal — recortar a planilha caótica em tabelas limpas." },
    { d:5,  ato:"II", titulo:"Erguer o banco", ref:"#ref-sql",
      vemos:"Instalar e configurar o SGBD. DDL: CREATE TABLE, tipos de dados e restrições (NOT NULL, UNIQUE, CHECK, DEFAULT, PK, FK)." },
    { d:6,  ato:"II", titulo:"Dar vida ao banco", ref:"#ref-crud",
      vemos:"DML: INSERT para povoar, UPDATE para corrigir, DELETE para remover — sempre com WHERE. O banco sai do papel." },
    { d:7,  ato:"III", titulo:"As primeiras consultas", ref:"#ref-sql",
      vemos:"DQL: SELECT, WHERE, ORDER BY, e os filtros LIKE, BETWEEN e IN. Fazer o banco responder perguntas." },
    { d:8,  ato:"III", titulo:"Contar e agrupar", ref:"#ref-sql",
      vemos:"Agregações: COUNT, SUM, AVG, MIN, MAX. GROUP BY para agrupar e HAVING para filtrar grupos." },
    { d:9,  ato:"III", titulo:"Cruzar as tabelas", ref:"#ref-join",
      vemos:"JOIN (junção) entre tabelas, união e interseção de resultados, e subconsultas. O poder de verdade do SQL." },
    { d:10, ato:"III", titulo:"Boss: O Desafio", ref:"#ref-sql",
      vemos:"O Boss do Ato III: o quiz de SQL do Sindicato (aba O Desafio), em célula. Depois, revisão geral de consultas." },
    { d:11, ato:"IV", titulo:"Entra e sai de dados", ref:"#ref-crud",
      vemos:"Importação e exportação de dados (CSV) conforme o SGBD. Views para atalhos de consulta e índices para acelerar." },
    { d:12, ato:"IV", titulo:"Trancar o cofre", ref:"#ref-seguranca",
      vemos:"Segurança: controle de acesso com GRANT e REVOKE, ideia de criptografia e autenticação, ameaças e falhas — e backup e restore da base." },
    { d:13, ato:"IV", titulo:"Fechar o dossiê", ref:"#ref-banco",
      vemos:"Reta final: documentação do projeto (README e dicionário de dados), organização dos arquivos e apresentação da empresa com o banco rodando." }
  ],

  /* Missões do projeto. Cada uma pode durar vários dias; a entrega vale para o
     intervalo [ini, fim]. O XP NÃO sai daqui — quem lança é a docente. */
  missoes: [
    { ini:1,  fim:1,  titulo:"Fundar a célula",
      texto:"Sem dispositivos hoje. Formem o grupo, escolham o nome da célula e inventem a empresa que vão modelar o curso inteiro: nome, ramo e o que ela faz. O nome da célula entra no site." },
    { ini:2,  fim:4,  titulo:"O modelo completo",
      texto:"Construam o modelo do banco da empresa: dicionário de dados, entidades e atributos, relacionamentos com cardinalidade, chaves primárias e estrangeiras, DER desenhado e tudo normalizado até a 3FN. Entreguem o DER (imagem) e a lista de tabelas com suas chaves." },
    { ini:5,  fim:6,  titulo:"Erguer e povoar o banco",
      texto:"Tirem o modelo do papel: script CREATE TABLE de todas as tabelas, com restrições e ao menos um índice, e populem cada tabela com dados reais (mínimo cinco linhas por tabela). Entreguem o SQL completo, rodando sem erro." },
    { ini:7,  fim:9,  titulo:"Interrogar o banco",
      texto:"Escrevam consultas que respondam perguntas de negócio: filtros (WHERE, LIKE, BETWEEN, IN), ordenação e agregações (GROUP BY, HAVING, COUNT/SUM/AVG), pelo menos três JOINs e uma subconsulta. Entreguem as queries e os resultados." },
    { ini:10, fim:10, titulo:"Boss: O Desafio",
      texto:"Enfrentem o Boss do Ato III: o quiz de SQL do Sindicato (na aba O Desafio), respondido em célula. São 10 perguntas de SELECT, WHERE, GROUP BY e JOIN. O resultado conta XP para a célula." },
    { ini:11, fim:12, titulo:"Importar, proteger e salvar",
      texto:"Importem um arquivo CSV para o banco, criem uma view e um índice úteis, e apliquem segurança: um usuário só de leitura com GRANT, e um backup da base com o plano de restore. Entreguem os scripts e o print do backup." },
    { ini:13, fim:13, titulo:"Fechar o dossiê",
      texto:"Reta final: escrevam o README documentando o modelo e como rodar, o dicionário de dados, versionem tudo e apresentem a empresa com o banco rodando ao vivo. Entreguem o link do repositório ou o pacote final." }
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

  missaoDoDia: function(n){
    return (this.missoes || []).find(function(m){ return n >= m.ini && n <= m.fim; }) || null;
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

  dataBR: function(n){
    var d = this.dataDoDia(n);
    if (!d || isNaN(d)) return "";
    return String(d.getDate()).padStart(2,"0") + "/" + String(d.getMonth()+1).padStart(2,"0");
  }
};

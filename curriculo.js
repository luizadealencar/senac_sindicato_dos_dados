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
  /* =========================================================================
     ENTREGA SEM GITHUB — via Google Forms (o aluno não precisa de conta GitHub).
     Crie dois formulários no Google Forms e cole os links "para enviar" aqui:
       1) FILIAÇÃO: pergunte Nome e Nome do time (célula).
       2) ENTREGA: pergunte Nome do time, Nº da missão e deixe um campo de
          texto longo + um campo "enviar arquivo" (para prints/imagens).
     Enquanto estiver com COLE_AQUI, os botões avisam em vez de abrir. */
  formFiliacao: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTb17yUu9DmRqvOOuRrPy1ebRvMVRPvkZ71VFJOqZNkoHquUvf_4e3e7a-Z4k5Fa4CWWCST6sDWjI8m/pub?gid=1573232710&single=true&output=csv",
  formEntrega:  "COLE_AQUI_o_link_do_formulario_de_entrega",

  /* OPCIONAL, mas recomendado: publique a planilha de respostas da filiação como
     CSV (na planilha: Arquivo › Compartilhar › Publicar na web › escolha a aba e
     "Valores separados por vírgula (.csv)") e cole o link aqui. Use colunas com
     cabeçalho: nome, github, celula, xp. Se preencher, o Quadro de Filiados e o
     Placar se montam sozinhos a partir das respostas — sem editar arquivo nenhum.
     (O github é opcional; serve só para puxar o avatar.) */
  planilhaCSV: "",

  /* Caminho alternativo por GitHub (Pull Request), para quem tiver conta.
     Se você não for usar GitHub, pode deixar como está. */
  repo: "SEU-USUARIO/senac_sindicato_dos_dados",

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
      vemos:"No data show: como o site e as aulas funcionam, e o projeto que atravessa o curso — cada grupo vai inventar uma empresa e construir o banco de dados dela. Formação das células." },
    { d:2, ato:"I", titulo:"O que a gente guarda", ref:"#ref-banco",
      vemos:"O que é um banco de dados. Tabelas, registros e atributos. Nomenclatura: minúsculas, snake_case, nomes descritivos, prefixos." },
    { d:3, ato:"I", titulo:"Sete cofres", ref:"#ref-banco",
      vemos:"Os sete tipos de banco: relacional, NoSQL, hierárquico, em rede, orientado a objetos, em memória e distribuído. ACID contra consistência eventual." },
    { d:4, ato:"I", titulo:"O porteiro", ref:"#ref-banco",
      vemos:"O que faz um SGBD: armazenamento, transações, concorrência, segurança, backup e indexação. Preparação do ambiente (SGBD instalado ou online)." },
    { d:5, ato:"I", titulo:"Relatório de inteligência", ref:"#ref-banco",
      vemos:"Fechamento do Ato I. Amarrando tipo de banco, SGBD e as necessidades da empresa num argumento único." },
    { d:6, ato:"II", titulo:"Entidades e atributos", ref:"#ref-modelagem",
      vemos:"MER (Modelo Entidade-Relacionamento): o que vira entidade e o que vira atributo." },
    { d:7, ato:"II", titulo:"Quem se liga a quem", ref:"#ref-modelagem",
      vemos:"Relacionamentos e cardinalidade: 1:1, 1:N e N:M." },
    { d:8, ato:"II", titulo:"A planta no papel", ref:"#ref-modelagem",
      vemos:"DER e seus símbolos. Modelagem no brModelo ou no dbdiagram.io, que já gera o SQL a partir do desenho." },
    { d:9, ato:"II", titulo:"A tabela imunda", ref:"#ref-modelagem",
      vemos:"Normalização até a 3ª forma normal: recortar uma planilha caótica em tabelas limpas." },
    { d:10, ato:"II", titulo:"As chaves da casa", ref:"#ref-modelagem",
      vemos:"Chave primária, chave estrangeira e integridade referencial. Por que um pedido órfão quebra o sistema." },
    { d:11, ato:"II", titulo:"Boss: a planta do zero", ref:"#ref-modelagem",
      vemos:"Dia de entrega do Ato II. Cada célula defende o modelo diante da turma." },
    { d:12, ato:"III", titulo:"Abrindo o cofre — DDL", ref:"#ref-sql",
      vemos:"CREATE DATABASE, CREATE TABLE e os tipos de dados (INTEGER, VARCHAR, DATE, DECIMAL). Traduzir o DER em código." },
    { d:13, ato:"III", titulo:"Regras da casa", ref:"#ref-sql",
      vemos:"ALTER e DROP. Restrições NOT NULL, UNIQUE, CHECK, DEFAULT, AUTO_INCREMENT. Índices e por que a consulta fica rápida." },
    { d:14, ato:"III", titulo:"Movimentando — DML", ref:"#ref-sql",
      vemos:"INSERT, UPDATE e DELETE. O perigo do DELETE sem WHERE, demonstrado ao vivo." },
    { d:15, ato:"III", titulo:"Perguntando — DQL", ref:"#ref-sql",
      vemos:"SELECT, WHERE, operadores lógicos, LIKE, BETWEEN, IN." },
    { d:16, ato:"III", titulo:"Organizando a resposta", ref:"#ref-sql",
      vemos:"ORDER BY, LIMIT, DISTINCT, COUNT, SUM, AVG, MAX, MIN e GROUP BY com HAVING." },
    { d:17, ato:"III", titulo:"Costurando tabelas — JOIN", ref:"#ref-sql",
      vemos:"INNER JOIN e LEFT JOIN. Consultar duas e três tabelas de uma vez. O dia mais difícil do ato." },
    { d:18, ato:"III", titulo:"Cofre e cadeado — TCL e DCL", ref:"#ref-sql",
      vemos:"START TRANSACTION, COMMIT, ROLLBACK. CREATE USER, GRANT e REVOKE. Quem pode ver o quê." },
    { d:19, ato:"III", titulo:"Boss: caso de assassinato", ref:"#ref-sql",
      vemos:"SQL Murder Mystery cronometrado, em célula. Só se resolve com SELECT, WHERE e JOIN." },
    { d:20, ato:"IV", titulo:"A ponte", ref:"#ref-crud",
      vemos:"Conectar uma aplicação ao SGBD: driver, string de conexão, o primeiro SELECT vindo do código." },
    { d:21, ato:"IV", titulo:"CRUD completo", ref:"#ref-crud",
      vemos:"Create, Read, Update e Delete funcionando pela interface da aplicação, com tratamento de erro." },
    { d:22, ato:"IV", titulo:"Auditoria cruzada", ref:"#ref-crud",
      vemos:"Cada célula revisa o banco de outra por Pull Request, seguindo checklist de nomenclatura, chaves, normalização e restrições." },
    { d:23, ato:"V", titulo:"A lei chega", ref:"#ref-lgpd",
      vemos:"LGPD: dado pessoal e sensível, titular, tratamento, princípios, direitos do titular, controlador, operador, DPO, ANPD e penalidades." },
    { d:24, ato:"V", titulo:"Tribunal", ref:"#ref-lgpd",
      vemos:"Júri simulado sobre um vazamento, com a turma dividida entre acusação e defesa." },
    { d:25, ato:"V", titulo:"Mudança de cofre", ref:"#ref-banco",
      vemos:"Conversão de banco: análise, mapeamento, extração, transformação, carga, validação e otimização." },
    { d:26, ato:"VI", titulo:"Fechando o dossiê", ref:"#ref-crud",
      vemos:"Montagem final, README documentando o modelo, script de criação versionado, últimos ajustes de desempenho." },
    { d:27, ato:"VI", titulo:"A última entrega", ref:"#ref-crud",
      vemos:"Apresentação do banco com a aplicação rodando ao vivo. Dez minutos por célula, mais arguição da turma e da docente." }
  ],

  /* Missões do projeto. Cada uma pode durar vários dias; a entrega vale para o
     intervalo [ini, fim]. O XP NÃO sai daqui — quem lança o XP é a docente, no
     placar.json. A missão é só o que a célula produz e entrega no site. */
  missoes: [
    { ini:1,  fim:1,  titulo:"Fundar a célula",
      texto:"Sem dispositivos hoje. Formem o grupo, escolham o nome da célula e inventem a empresa que vão modelar o curso inteiro: nome, ramo e o que ela faz. O nome da célula entra no site." },
    { ini:2,  fim:5,  titulo:"Documento de visão",
      texto:"Escrevam o documento de visão da empresa: o que ela faz, tudo que precisa guardar (candidatos a tabelas e campos), o tipo de banco escolhido e o SGBD — cada escolha justificada pelo negócio. Entreguem em texto; podem anexar imagens." },
    { ini:6,  fim:11, titulo:"O modelo completo",
      texto:"Construam o modelo do banco: entidades e atributos, relacionamentos com cardinalidade, DER desenhado no brModelo ou no dbdiagram, normalizado até a 3FN, com chaves primárias e estrangeiras definidas. Entreguem o DER (imagem) e a lista de tabelas com suas chaves." },
    { ini:12, fim:14, titulo:"Erguer o banco",
      texto:"Tirem o modelo do papel: script CREATE TABLE de todas as tabelas, com restrições (NOT NULL, UNIQUE, CHECK, DEFAULT) e ao menos um índice, e populem cada tabela com dados reais da empresa (mínimo cinco linhas). Entreguem o SQL completo." },
    { ini:15, fim:18, titulo:"Interrogar o banco",
      texto:"Escrevam consultas que respondam perguntas de negócio da empresa: filtros (WHERE, LIKE, BETWEEN), ordenação e agregações (GROUP BY, HAVING, COUNT/SUM/AVG), pelo menos três JOINs entre tabelas, uma transação com COMMIT/ROLLBACK e um usuário só de leitura com GRANT. Entreguem as queries e os resultados." },
    { ini:19, fim:19, titulo:"Boss: caso de assassinato",
      texto:"Resolvam o SQL Murder Mystery em célula, cronometrado. Entreguem a query final e o nome do culpado." },
    { ini:20, fim:22, titulo:"A ponte e a auditoria",
      texto:"Conectem uma aplicação ao banco e deixem o CRUD (criar, ler, atualizar, excluir) funcionando pela interface, com tratamento de erro. Depois revisem o banco de outra célula por checklist. Entreguem prints do CRUD e o parecer da auditoria." },
    { ini:23, fim:24, titulo:"A empresa sob a LGPD",
      texto:"Apliquem a LGPD ao banco da empresa: apontem os dados pessoais e sensíveis, o que a lei exige para cada um, e preparem a peça do júri (acusação ou defesa) sobre um vazamento. Entreguem o mapeamento e o texto do júri." },
    { ini:25, fim:27, titulo:"Fechar o dossiê",
      texto:"Reta final: migrem um arquivo sujo (CSV/planilha) para o banco, escrevam o README documentando o modelo e como rodar, versionem tudo no GitHub e apresentem a empresa com a aplicação rodando ao vivo. Entreguem o link do repositório." }
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

  configurado: function(v){ return !!v && !/COLE_AQUI/i.test(v); },

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

  /* dd/mm formatado, ou "" se não der */
  dataBR: function(n){
    var d = this.dataDoDia(n);
    if (!d || isNaN(d)) return "";
    return String(d.getDate()).padStart(2,"0") + "/" + String(d.getMonth()+1).padStart(2,"0");
  }
};

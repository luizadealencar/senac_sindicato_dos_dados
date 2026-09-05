#!/usr/bin/env python3
"""
Gera o gabarito da docente a partir de assets/laboratorio.js.

Lê as lições e os casos, roda cada resposta contra o banco da Loja Aurora e
escreve gabarito-docente.html, com o resultado esperado de cada consulta.

    python3 ferramentas/gerar-gabarito.py

Rode de novo sempre que mexer nos casos: o documento se refaz sozinho.
"""
import json, re, sqlite3, html, io, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANCO = os.path.join(RAIZ, 'assets', 'aurora-db.sql.js')

# qual laboratório gerar: 1 (consultas) ou 2 (construção)
QUAL = sys.argv[1] if len(sys.argv) > 1 else '1'
if QUAL == '2':
    LAB   = os.path.join(RAIZ, 'assets', 'laboratorio2.js')
    SAIDA = os.path.join(RAIZ, 'gabarito-docente-lab2.html')
    TITULO = 'Gabarito da docente — Laboratório II · A Construção'
    SUB = 'UC5 · Desenvolver Banco de Dados · CREATE, INSERT, UPDATE, DELETE, ALTER, DROP'
else:
    LAB   = os.path.join(RAIZ, 'assets', 'laboratorio.js')
    SAIDA = os.path.join(RAIZ, 'gabarito-docente.html')
    TITULO = 'Gabarito da docente — Laboratório I · As Consultas'
    SUB = 'UC5 · Desenvolver Banco de Dados · banco da Loja Aurora' 


def carregar_banco():
    s = io.open(BANCO, encoding='utf-8').read().strip()
    sql = json.loads(re.search(r'window\.AURORA_SQL\s*=\s*(".*")\s*;?\s*$', s, re.S).group(1))
    con = sqlite3.connect(':memory:')
    con.executescript(sql)
    return con


def _fim_array(txt, i):
    n = 0; asp = None
    while i < len(txt):
        c = txt[i]
        if asp:
            if c == '\\': i += 2; continue
            if c == asp: asp = None
        elif c in "'\"`": asp = c
        elif c == '[': n += 1
        elif c == ']':
            n -= 1
            if n == 0: return i
        i += 1
    raise ValueError('array sem fechamento')


def _campo(bloco, nome):
    """Lê campo: 'texto' | "texto" | `texto` respeitando escapes."""
    m = re.search(rf"\b{nome}:\s*(['\"`])", bloco)
    if not m: return ''
    asp = m.group(1); i = m.end(); out = []
    while i < len(bloco):
        c = bloco[i]
        if c == '\\':
            prox = bloco[i+1]
            out.append({'n': '\n', 't': '\t'}.get(prox, prox)); i += 2; continue
        if c == asp: break
        out.append(c); i += 1
    return ''.join(out)


def ler_modulos():
    s = io.open(LAB, encoding='utf-8').read()
    ini = s.find('const MODULOS')
    corpo = s[ini:_fim_array(s, s.find('[', ini)) + 1]

    modulos = []
    # aceita aspas simples ou duplas: os dois laboratorios foram escritos de jeitos diferentes
    padrao = (r"num:\s*['\"]([IVX]+)['\"],\s*"
              r"nome:\s*['\"]([^'\"]+)['\"],\s*"
              r"dur:\s*['\"]([^'\"]+)['\"]")
    cabs = list(re.finditer(padrao, corpo))
    for idx, cab in enumerate(cabs):
        fim_mod = cabs[idx + 1].start() if idx + 1 < len(cabs) else len(corpo)
        trecho = corpo[cab.start():fim_mod]

        licoes = []
        tits = list(re.finditer(r"\btitulo: (['\"])", trecho))
        for k, t in enumerate(tits):
            fim_li = tits[k + 1].start() if k + 1 < len(tits) else len(trecho)
            bloco = trecho[t.start():fim_li]
            casos = []
            for d in re.finditer(r"\{ p: ", bloco):
                fim_caso = bloco.find('}', d.start())
                b = bloco[d.start():fim_caso + 1]
                mv = re.search(r"\bv:\s*(\[.*?\])\s*,\s*dica:", b, re.S)
                verifs = []
                if mv:
                    try: verifs = json.loads(mv.group(1))
                    except Exception: verifs = []
                casos.append({
                    'p': _campo(b, 'p'), 'r': _campo(b, 'r'),
                    'dica': _campo(b, 'dica'), 'v': verifs
                })
            licoes.append({
                'titulo': _campo(bloco, 'titulo'),
                'html':   _campo(bloco, 'html'),
                'exemplo': _campo(bloco, 'exemplo'),
                'casos': casos
            })
        modulos.append({'num': cab.group(1), 'nome': cab.group(2),
                        'dia': cab.group(3), 'licoes': licoes})
    return modulos


def amostra(con, sql, limite=4):
    """Roda a resposta e devolve (colunas, primeiras linhas, total)."""
    cur = con.execute(sql)
    cols = [c[0] for c in cur.description] if cur.description else []
    linhas = cur.fetchall()
    return cols, linhas[:limite], len(linhas)


def estado_apos(sql_texto, verificacoes, limite=4):
    """Laboratório II: roda o comando num banco limpo e mostra como o banco ficou."""
    con = carregar_banco()
    con.executescript(sql_texto)
    partes = []
    for q in verificacoes:
        try:
            cur = con.execute(q)
            cols = [c[0] for c in cur.description] if cur.description else []
            linhas = cur.fetchall()
            partes.append(f'<p class="conferencia">{html.escape(q)}</p>' +
                          tabela_html(cols, linhas[:limite], len(linhas), limite))
        except Exception as e:
            partes.append(f'<p class="alerta">A conferência deu erro: {html.escape(str(e))}</p>')
    con.close()
    return ''.join(partes)


def tabela_html(cols, linhas, total, limite=4):
    if not cols: return '<p class="obs">Sem colunas.</p>'
    cab = ''.join(f'<th>{html.escape(str(c))}</th>' for c in cols)
    corpo = ''.join(
        '<tr>' + ''.join(
            f'<td>{"<i>NULL</i>" if v is None else html.escape(str(v))}</td>' for v in l
        ) + '</tr>' for l in linhas)
    resto = f'<p class="obs">… e mais {total - limite} linha(s). Total: <b>{total}</b>.</p>' if total > limite else \
            f'<p class="obs">Total: <b>{total}</b> linha(s).</p>'
    return f'<table><thead><tr>{cab}</tr></thead><tbody>{corpo}</tbody></table>{resto}'


def gerar():
    con = carregar_banco()
    modulos = ler_modulos()
    total_casos = sum(len(li['casos']) for m in modulos for li in m['licoes'])

    partes = []
    n = 0
    for m in modulos:
        ncasos = sum(len(li['casos']) for li in m['licoes'])
        partes.append(f'<section class="modulo"><h2><span>{m["num"]}</span> {html.escape(m["nome"])}'
                      f'<small>{html.escape(m["dia"])} · {ncasos} casos</small></h2>')
        for li in m['licoes']:
            partes.append(f'<div class="licao"><h3>{html.escape(li["titulo"])}</h3>')
            if li['html']:
                partes.append(f'<p class="expl">{li["html"]}</p>')
            if li['exemplo']:
                partes.append(f'<pre class="exemplo">{html.escape(li["exemplo"])}</pre>')
            for c in li['casos']:
                n += 1
                try:
                    if c.get('v'):
                        saida = estado_apos(c['r'], c['v'])
                        aviso = ''
                    else:
                        cols, linhas, tot = amostra(con, c['r'])
                        saida = tabela_html(cols, linhas, tot)
                        aviso = '' if tot else '<p class="alerta">Atenção: esta resposta não devolve nenhuma linha.</p>'
                except Exception as e:
                    saida = f'<p class="alerta">A resposta deu erro: {html.escape(str(e))}</p>'; aviso = ''
                partes.append(f'''<div class="caso">
  <div class="caso-cab"><b>Caso {n}</b></div>
  <p class="pergunta">{c["p"]}</p>
  <pre class="resposta">{html.escape(c["r"])}</pre>
  <p class="dica"><b>Dica dada ao aluno:</b> {html.escape(c["dica"])}</p>
  <div class="esperado"><b>Resultado esperado</b>{saida}{aviso}</div>
</div>''')
            partes.append('</div>')
        partes.append('</section>')

    doc = f'''<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gabarito da docente — O Laboratório</title>
<style>
:root{{--papel:#fff;--tinta:#191E1B;--fraca:#4a554a;--carimbo:#8E2323;--linha:#d7ded1;--barra:#f2f5ef}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:Georgia,'Times New Roman',serif;color:var(--tinta);background:var(--papel);
     font-size:15.5px;line-height:1.6;padding:34px 26px 60px;max-width:940px;margin:0 auto}}
h1{{font-size:31px;letter-spacing:-.01em;margin-bottom:4px}}
.sub{{color:var(--fraca);margin-bottom:6px}}
.aviso{{border-left:4px solid var(--carimbo);background:var(--barra);padding:11px 15px;margin:20px 0 30px;font-size:14.5px}}
.modulo{{margin-top:38px;page-break-before:always}}
.modulo:first-of-type{{page-break-before:avoid}}
.modulo>h2{{font-size:24px;border-bottom:3px solid var(--tinta);padding-bottom:7px;margin-bottom:6px}}
.modulo>h2 span{{color:var(--carimbo);margin-right:8px}}
.modulo>h2 small{{float:right;font-size:13px;color:var(--fraca);font-weight:400;padding-top:9px}}
.licao{{margin-top:26px}}
.licao h3{{font-size:19px;margin-bottom:7px;color:var(--carimbo)}}
.expl{{font-size:14.5px;color:var(--fraca);margin-bottom:9px}}
code{{background:var(--barra);border:1px solid var(--linha);padding:0 4px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em}}
pre{{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.5;
    white-space:pre-wrap;word-break:break-word;padding:9px 12px;border:1px solid var(--linha)}}
.exemplo{{background:var(--barra);color:var(--fraca);margin-bottom:12px}}
.caso{{border:1px solid var(--linha);border-left:4px solid var(--tinta);padding:12px 15px;margin:12px 0;page-break-inside:avoid}}
.caso-cab b{{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;letter-spacing:.1em;
             text-transform:uppercase;color:var(--carimbo)}}
.pergunta{{margin:4px 0 9px}}
.resposta{{background:#12160f;color:#d6e4cd;border-color:#12160f}}
.dica{{font-size:13.5px;color:var(--fraca);margin-top:8px}}
.esperado{{margin-top:11px;font-size:13px}}
.esperado>b{{display:block;font-size:11.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--fraca);margin-bottom:5px}}
table{{border-collapse:collapse;width:100%;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}}
th,td{{border:1px solid var(--linha);padding:3px 7px;text-align:left}}
th{{background:var(--barra)}}
.obs{{font-size:12px;color:var(--fraca);margin-top:4px}}
.alerta{{color:var(--carimbo);font-weight:bold;margin-top:5px}}
@media print{{body{{padding:0;font-size:11pt}} .caso{{border-left-width:3px}}}}
</style></head><body>

<h1>{TITULO}</h1>
<p class="sub">{SUB}</p>
<p class="sub"><b>{total_casos} casos</b> em {len(modulos)} dias.</p>

<div class="aviso">
  <b>Só para a docente.</b> Traz a resposta de cada caso e o resultado que ela
  devolve no banco. Para virar PDF: <b>Ctrl+P</b> (ou Cmd+P) e salvar como PDF.
  <br><br>
  O motor do laboratório é <b>SQLite</b>. Quase tudo é igual ao MySQL; onde muda,
  está avisado na lição — como a junção de texto, que no SQLite é
  <code>a || b</code> e no MySQL é <code>CONCAT(a, b)</code>.
</div>

{''.join(partes)}

</body></html>'''

    io.open(SAIDA, 'w', encoding='utf-8').write(doc)
    return total_casos, len(modulos), SAIDA


if __name__ == '__main__':
    casos, dias, caminho = gerar()
    print(f'gabarito gerado: {casos} casos, {dias} dias -> {caminho}')

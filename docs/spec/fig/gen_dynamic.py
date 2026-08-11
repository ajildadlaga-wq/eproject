"""Object, communication and state diagrams — the set the requirements-analysis
course expects, drawn for E-Project."""
import subprocess

F = 'DejaVu Sans'
BLUE, NAVY, GREEN, AMBER, RED = '#1268EB', '#0A3576', '#22A15C', '#B8860B', '#B23A3A'
FILL = '#EAF2FE'

def dot(name, src, dpi=150):
    p = f'/tmp/{name}.dot'
    open(p, 'w', encoding='utf-8').write(src)
    subprocess.run(['dot', '-Tpng', f'-Gdpi={dpi}', p, '-o', f'fig/{name}.png'], check=True)
    print('ok', name)

HDR = f'''graph [fontname="{F}", bgcolor="white"];
node  [fontname="{F}", fontsize=11];
edge  [fontname="{F}", fontsize=10];'''

# ---------------------------------------------------------------- object
# UML objects are underlined "name : Class" with concrete attribute values.
def obj(label, rows, color=BLUE, fill=FILL):
    r = '<BR ALIGN="LEFT"/>'.join(rows)
    return f'''<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5">
    <TR><TD BGCOLOR="{color}"><FONT COLOR="white" POINT-SIZE="14"><B><U>{label}</U></B></FONT></TD></TR>
    <TR><TD ALIGN="LEFT" BALIGN="LEFT" BGCOLOR="{fill}"><FONT POINT-SIZE="12">{r}</FONT></TD></TR>
    </TABLE>>'''

dot('f_object', f'''digraph G {{
{HDR}
rankdir=TB; nodesep=.3; ranksep=.55;
node [shape=plaintext];

pat [label={obj('pat : Profile', [
  'fullName = "П. Мөнх-Учрал"', 'role = PROJECT_MANAGER'])}];
eddie [label={obj('eddie : Profile', [
  'fullName = "Б. Энхжаргал"', 'role = TEAM_MEMBER'])}];

apollo [label={obj('apollo : Project', [
  'name = "Apollo Billing Platform"',
  'phase = DEVELOPMENT',
  'endDate = 2026-08-20'])}];

t3 [label={obj('t3 : Task', [
  'name = "Core development"',
  'status = UNDER_REVIEW',
  'priority = HIGH',
  'percentComplete = 100',
  'submittedAt = 2026-08-03'], color=AMBER, fill='#FFF4E0')}];

t4 [label={obj('t4 : Task', [
  'name = "Payment gateway integration"',
  'status = REJECTED',
  'priority = HIGH',
  'reviewNote = "Sandbox credentials only"'], color=RED, fill='#FDE9E9')}];

t1 [label={obj('t1 : Task', [
  'name = "Requirements gathering"',
  'status = APPROVED',
  'priority = MEDIUM'], color=GREEN, fill='#E6F6EA')}];

m [label={obj('m1 : ProjectMember', ['memberRole = TEAM_MEMBER'])}];

edge [fontsize=9, color="#64748B", arrowhead=none];
pat -> apollo [label=" удирдана"];
apollo -> t1; apollo -> t3; apollo -> t4;
eddie -> t3 [label=" хариуцна", style=dashed];
eddie -> t4 [label=" хариуцна", style=dashed];
apollo -> m; eddie -> m;
t1 -> t3 [style=invis]; t3 -> t4 [style=invis];
{{rank=same; pat; eddie;}}
}}''')

# ---------------------------------------------------------------- state 2
dot('f_state_project', f'''digraph G {{
rankdir=TB; {HDR}
node [shape=box, style="rounded,filled", fillcolor="{FILL}", color="{BLUE}", penwidth=1.6, height=.55, width=2.9, margin="0.16,0.10", fontsize=13];
start [shape=circle, label="", width=.2, style=filled, fillcolor="#334155", color="#334155"];
S1 [label="REQUIREMENTS\\nШаардлага тодорхойлох"];
S2 [label="DEVELOPMENT\\nХөгжүүлэлт"];
S3 [label="UAT\\nХэрэглэгчийн туршилт"];
S4 [label="SYSTEM_TESTING\\nСистемийн туршилт"];
S5 [label="STAGING\\nТуршилтын орчин"];
S6 [label="DEPLOYMENT\\nНэвтрүүлэлт", fillcolor="#E6F6EA", color="{GREEN}", penwidth=2];
end [shape=doublecircle, label="", width=.2, style=filled, fillcolor="#334155", color="#334155"];
start -> S1;
S1 -> S2 [label=" шаардлага батлагдав"];
S2 -> S3 [label=" код бэлэн"];
S3 -> S4 [label=" хэрэглэгч хүлээв"];
S4 -> S5 [label=" тест тэнцэв"];
S5 -> S6 [label=" зөвшөөрөл авав"];
S6 -> end;
S3 -> S2 [label=" алдаа илэрсэн", constraint=false, style=dashed, color="{RED}", fontcolor="{RED}"];
S4 -> S2 [label=" алдаа илэрсэн", constraint=false, style=dashed, color="{RED}", fontcolor="{RED}"];
}}''')

# ---------------------------------------------------------------- communication
# Numbered messages along undirected links — the UML communication view.
def comm(name, nodes, links, layout_pos):
    ns = '\n'.join(
        f'{k} [label="{v}", pos="{layout_pos[k]}!"];' for k, v in nodes.items())
    es = '\n'.join(
        f'{a} -> {b} [label="{lbl}"];' for a, b, lbl in links)
    dot(name, f'''digraph G {{
{HDR}
layout=neato; overlap=false; splines=false;
node [shape=box, style="rounded,filled", fillcolor="{FILL}", color="{BLUE}",
      penwidth=1.4, width=1.7, height=.62, margin="0.10,0.08", fontsize=10.5];
edge [arrowhead=none, color="#64748B", fontsize=9.5, fontcolor="#1E293B"];
{ns}
{es}
}}''')

comm('f_comm_approve',
  {'PM': 'Төслийн менежер\\n:Actor',
   'UI': ':TaskList\\n(интерфэйс)',
   'SVC': ':ApprovalService\\n(approve_task)',
   'T':  't3 :Task',
   'A':  ':AuditLog'},
  [('PM', 'UI',  '1: approve(t3)'),
   ('UI', 'SVC', '2: approveTask(id, note)'),
   ('SVC', 'T',  '3: checkManager()\\l4: setStatus(APPROVED)\\l'),
   ('SVC', 'A',  '5: write(TASK_APPROVED)'),
   ('T', 'UI',   '6: updated')],
  {'PM': '0,2.4', 'UI': '4.8,2.4', 'SVC': '4.8,0', 'T': '9.6,0', 'A': '4.8,-2.4'})

comm('f_comm_progress',
  {'TM': 'Багийн гишүүн\\n:Actor',
   'UI': ':ProgressDialog\\n(интерфэйс)',
   'SVC': ':TaskService\\n(update_task_progress)',
   'T':  't3 :Task',
   'U':  ':TaskUpdate'},
  [('TM', 'UI',  '1: update(60%)'),
   ('UI', 'SVC', '2: updateProgress(id, 60, юу, яагаад)'),
   ('SVC', 'T',  '3: clampTo99()\\l4: setPercent(60)\\l'),
   ('SVC', 'U',  '5: create(60, тайлбар)'),
   ('T', 'UI',   '6: saved')],
  {'TM': '0,2.4', 'UI': '5.4,2.4', 'SVC': '5.4,0', 'T': '10.6,0', 'U': '5.4,-2.4'})

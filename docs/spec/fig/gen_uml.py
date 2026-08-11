"""Diagrams for the design chapters. Graphviz for structure, hand-built SVG
for the sequence diagram, which graphviz models badly."""
import subprocess

F = 'DejaVu Sans'
BLUE, NAVY, GREEN, AMBER, RED = '#1268EB', '#0A3576', '#22A15C', '#B8860B', '#B23A3A'
FILL, LIGHT = '#EAF2FE', '#F5F8FD'

def dot(name, src, dpi=150):
    p = f'/tmp/{name}.dot'
    open(p, 'w', encoding='utf-8').write(src)
    subprocess.run(['dot', '-Tpng', f'-Gdpi={dpi}', p, '-o', f'fig/{name}.png'], check=True)
    print('ok', name)

HDR = f'''graph [fontname="{F}", bgcolor="white"];
node  [fontname="{F}", fontsize=11];
edge  [fontname="{F}", fontsize=10];'''

# ---------------------------------------------------------------- use case
dot('f_usecase', f'''digraph G {{
{HDR}
rankdir=LR; nodesep=.22; ranksep=1.5;
node [shape=ellipse, style=filled, fillcolor="{FILL}", color="{BLUE}", height=.42, width=2.5];

subgraph cluster_sys {{
  label="E-PROJECT"; labelloc=t; fontsize=13; fontcolor="{NAVY}";
  style="rounded"; color="{BLUE}"; penwidth=1.6; margin=18;
  UC1  [label="UC-01 Нэвтрэх"];
  UC2  [label="UC-02 Хэрэглэгч удирдах"];
  UC3  [label="UC-03 Эрх олгох"];
  UC4  [label="UC-04 Төсөл үүсгэх"];
  UC5  [label="UC-05 Гишүүн нэмэх"];
  UC6  [label="UC-06 Ажил үүсгэх, хуваарилах"];
  UC7  [label="UC-07 Ажлын явц шинэчлэх"];
  UC8  [label="UC-08 Хянуулахаар илгээх"];
  UC9  [label="UC-09 Ажил батлах", fillcolor="#E6F6EA", color="{GREEN}", penwidth=1.8];
  UC10 [label="UC-10 Ажил буцаах", fillcolor="#FDE9E9", color="{RED}"];
  UC11 [label="UC-11 Явц хянах"];
  UC12 [label="UC-12 Аудитын бүртгэл үзэх"];
}}

node [shape=box, style="rounded,filled", fillcolor="#F3F4F6", color="#6B7280", width=1.5, height=.5];
ADM [label="Системийн\\nадмин"];
PM  [label="Төслийн\\nменежер"];
TM  [label="Багийн\\nгишүүн"];
VW  [label="Ажиглагч"];

edge [arrowhead=none, color="#94A3B8"];
ADM -> UC1; ADM -> UC2; ADM -> UC3; ADM -> UC11; ADM -> UC12;
PM -> UC1; PM -> UC4; PM -> UC5; PM -> UC6; PM -> UC11;
PM -> UC9 [color="{GREEN}", penwidth=1.6];
PM -> UC10 [color="{RED}", penwidth=1.4];
TM -> UC1; TM -> UC7; TM -> UC8; TM -> UC11;
VW -> UC1; VW -> UC11;
}}''')

# ---------------------------------------------------------------- class
def cls(name, attrs, ops, color=BLUE, fill=FILL):
    a = '<BR ALIGN="LEFT"/>'.join(attrs)
    o = '<BR ALIGN="LEFT"/>'.join(ops)
    body = f'''<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5">
    <TR><TD BGCOLOR="{color}"><FONT COLOR="white" POINT-SIZE="14.5"><B>{name}</B></FONT></TD></TR>
    <TR><TD ALIGN="LEFT" BALIGN="LEFT" BGCOLOR="white"><FONT POINT-SIZE="12">{a}</FONT></TD></TR>'''
    if ops:
        body += f'<TR><TD ALIGN="LEFT" BALIGN="LEFT" BGCOLOR="{fill}"><FONT POINT-SIZE="12">{o}</FONT></TD></TR>'
    return body + '</TABLE>>'

dot('f_class', f'''digraph G {{
{HDR}
rankdir=TB; nodesep=.5; ranksep=.8; splines=polyline;
node [shape=plaintext];

Profile [label={cls('Profile', [
  '- id : UUID',
  '- fullName : String',
  '- role : Role',
], ['+ canApprove() : Boolean', '+ canWrite() : Boolean'])}];

Project [label={cls('Project', [
  '- id : UUID',
  '- name : String',
  '- description : String',
  '- phase : SdlcPhase',
  '- startDate : Date',
  '- endDate : Date',
], ['+ progress() : Integer', '+ isOverdue() : Boolean'])}];

Task [label={cls('Task', [
  '- id : UUID',
  '- name : String',
  '- status : TaskStatus',
  '- priority : Priority',
  '- percentComplete : Integer',
  '- plannedStart / plannedEnd : Date',
  '- submittedAt / reviewedAt : DateTime',
  '- reviewNote : String',
], ['+ submit() : void', '+ approve(note) : void',
    '+ reject(reason) : void', '+ countsToProgress() : Boolean'], color=GREEN, fill='#E6F6EA')}];

Member [label={cls('ProjectMember', [
  '- memberRole : MemberRole',
  '- createdAt : DateTime',
], [])}];

Update [label={cls('TaskUpdate', [
  '- progressBefore : Integer',
  '- progressAfter : Integer',
  '- whatHappened : String',
  '- whyChanged : String',
  '- createdAt : DateTime',
], [])}];

Audit [label={cls('AuditEntry', [
  '- action : String',
  '- entity : String',
  '- summary : String',
  '- occurredAt : DateTime',
], [], color=NAVY)}];

Req [label={cls('Requirement', ['- title : String', '- type : ReqType', '- status : ReqStatus'], [])}];
Risk [label={cls('Risk', ['- title : String', '- probability : Integer',
                          '- impact : Integer', '- priority : Priority'],
                 ['+ computePriority() : Priority'])}];

edge [fontsize=9, color="#64748B"];
Profile -> Project [taillabel="1", headlabel="0..*", label=" удирдана", arrowhead=none];
Project -> Task    [taillabel="1", headlabel="0..*", arrowhead=none];
Project -> Member  [taillabel="1", headlabel="0..*", arrowhead=none];
Profile -> Member  [taillabel="1", headlabel="0..*", arrowhead=none];
Profile -> Task    [taillabel="1", headlabel="0..*", label=" гүйцэтгэнэ", arrowhead=none, style=dashed];
Task -> Update     [taillabel="1", headlabel="0..*", arrowhead=none];
Task -> Audit      [taillabel="1", headlabel="0..*", arrowhead=none, style=dashed];
Project -> Req     [taillabel="1", headlabel="0..*", arrowhead=none];
Project -> Risk    [taillabel="1", headlabel="0..*", arrowhead=none];
Task -> Task       [taillabel="0..*", headlabel="0..*", label=" хамаарна", arrowhead=none, style=dashed];
}}''')

# ---------------------------------------------------------------- ERD
def tbl(name, rows):
    body = f'''<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4">
    <TR><TD COLSPAN="2" BGCOLOR="{NAVY}"><FONT COLOR="white" POINT-SIZE="14"><B>{name}</B></FONT></TD></TR>'''
    for key, col in rows:
        bg = FILL if key else 'white'
        # Graphviz rejects an empty <B></B>, so non-key rows get a space.
        k = f'<B>{key}</B>' if key else ' '
        body += (f'<TR><TD ALIGN="LEFT" BGCOLOR="{bg}">'
                 f'<FONT POINT-SIZE="12">{k}</FONT></TD>'
                 f'<TD ALIGN="LEFT" BGCOLOR="{bg}"><FONT POINT-SIZE="12">{col}</FONT></TD></TR>')
    return body + '</TABLE>>'

dot('f_erd', f'''digraph G {{
{HDR}
rankdir=TB; nodesep=.35; ranksep=.85; splines=spline;
node [shape=plaintext];

profiles [label={tbl('profiles', [
  ('PK', 'id  uuid'), ('', 'full_name  text'), ('', 'role  app_role')])}];

projects [label={tbl('projects', [
  ('PK', 'id  uuid'), ('', 'name  text'), ('', 'description  text'),
  ('', 'sdlc_phase  sdlc_phase'), ('', 'start_date  date'), ('', 'end_date  date'),
  ('FK', 'manager_id  uuid')])}];

members [label={tbl('project_members', [
  ('PK,FK', 'project_id  uuid'), ('PK,FK', 'user_id  uuid'),
  ('', 'member_role  member_role')])}];

tasks [label={tbl('tasks', [
  ('PK', 'id  uuid'), ('FK', 'project_id  uuid'), ('', 'name  text'),
  ('', 'status  task_status'), ('', 'priority  priority_level'),
  ('', 'percent_complete  int'), ('', 'planned_start / end  date'),
  ('FK', 'assignee_id  uuid'), ('', 'depends_on  uuid[]'),
  ('', 'submitted_at  timestamptz'), ('FK', 'reviewed_by  uuid'),
  ('', 'reviewed_at  timestamptz'), ('', 'review_note  text')])}];

updates [label={tbl('task_updates', [
  ('PK', 'id  uuid'), ('FK', 'task_id  uuid'), ('FK', 'project_id  uuid'),
  ('FK', 'user_id  uuid'), ('', 'progress_before / after  int'),
  ('', 'what_happened  text'), ('', 'why_changed  text')])}];

audit [label={tbl('audit_log', [
  ('PK', 'id  bigserial'), ('FK', 'actor_id  uuid'), ('', 'action  text'),
  ('', 'entity  text'), ('FK', 'project_id  uuid'), ('', 'summary  text'),
  ('', 'detail  jsonb'), ('', 'occurred_at  timestamptz')])}];

reqs [label={tbl('requirements', [
  ('PK', 'id  uuid'), ('FK', 'project_id  uuid'), ('', 'title  text'),
  ('', 'type  requirement_type'), ('', 'status  requirement_status'),
  ('', 'baseline_version  int')])}];

risks [label={tbl('risks', [
  ('PK', 'id  uuid'), ('FK', 'project_id  uuid'), ('', 'title  text'),
  ('', 'category  risk_category'), ('', 'probability  int'),
  ('', 'impact  int'), ('', 'priority  priority_level')])}];

edge [color="#64748B", fontsize=9, arrowhead=crow, arrowtail=none, dir=both];
profiles -> projects [label=" 1:N  удирдана"];
profiles -> members  [label=" 1:N"];
projects -> members  [label=" 1:N"];
projects -> tasks    [label=" 1:N"];
profiles -> tasks    [label=" 1:N  хариуцна"];
tasks    -> updates  [label=" 1:N"];
projects -> reqs     [label=" 1:N"];
projects -> risks    [label=" 1:N"];
profiles -> audit    [label=" 1:N"];
}}''')

# ---------------------------------------------------------------- activity
dot('f_activity', f'''digraph G {{
{HDR}
rankdir=TB; nodesep=.35; ranksep=.42;
node [shape=box, style="rounded,filled", fillcolor="{FILL}", color="{BLUE}", height=.45, width=2.6, margin="0.14,0.08"];
start [shape=circle, label="", width=.22, style=filled, fillcolor="#334155", color="#334155"];
A [label="Гишүүн ажлаа хийнэ"];
B [label="Явцаа шинэчилнэ (≤ 99%)"];
C [label="«Хянуулах» дарна"];
D [label="Статус → UNDER_REVIEW", fillcolor="#FFF4E0", color="{AMBER}"];
E [label="Менежер ажлыг биечлэн шалгана", fillcolor="#F3F4F6", color="#6B7280"];
Q [shape=diamond, label="Хангалттай\\nюу?", fillcolor="white", color="#334155", width=1.5, height=.9];
OK [label="Статус → APPROVED\\nЯвцад тооцогдоно", fillcolor="#E6F6EA", color="{GREEN}", penwidth=1.8];
NO [label="Шалтгаан бичнэ\\nСтатус → REJECTED", fillcolor="#FDE9E9", color="{RED}"];
LOG [label="Audit Log-д бичигдэнэ", fillcolor="#EEF3FA", color="{NAVY}"];
end [shape=doublecircle, label="", width=.22, style=filled, fillcolor="#334155", color="#334155"];
start -> A -> B -> C -> D -> E -> Q;
Q -> OK [label=" тийм"];
Q -> NO [label=" үгүй"];
OK -> LOG; NO -> LOG [style=dashed];
LOG -> end;
NO -> A [label=" дахин ажиллана", constraint=false, style=dashed, color="{RED}", fontcolor="{RED}"];
}}''')

# ---------------------------------------------------------------- sequence
# Graphviz has no notion of a lifeline, so this one is drawn directly.
def sequence(name, actors, steps, w=760):
    """Lifelines and messages. The canvas stays narrow so that the text is
    still legible once the figure is scaled to the width of the page."""
    lane = w // len(actors)
    xs = {a: lane * i + lane // 2 for i, a in enumerate(actors)}
    top, gap = 86, 56
    rows = sum(len(s[2]) for s in steps)
    h = top + gap * len(steps) + 50
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
           f'viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="white"/>',
           '<defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="2.6" orient="auto">'
           '<path d="M0,0 L7,2.6 L0,5.2 z" fill="#475569"/></marker>'
           '<marker id="r" markerWidth="8" markerHeight="8" refX="7" refY="2.6" orient="auto">'
           '<path d="M0,0 L7,2.6 L0,5.2 z" fill="#94A3B8"/></marker></defs>']
    for a in actors:
        x = xs[a]
        parts = a.split('|')
        bh = 24 + 16 * len(parts)
        out.append(f'<rect x="{x-lane//2+7}" y="20" width="{lane-14}" height="{bh}" rx="7" '
                   f'fill="{FILL}" stroke="{BLUE}" stroke-width="1.5"/>')
        for i, part in enumerate(parts):
            out.append(f'<text x="{x}" y="{40 + i*16}" font-family="{F}" font-size="13" '
                       f'fill="{NAVY}" text-anchor="middle">{part}</text>')
        out.append(f'<line x1="{x}" y1="{20+bh}" x2="{x}" y2="{h-24}" stroke="#CBD5E1" '
                   f'stroke-width="1.1" stroke-dasharray="4 4"/>')
    for i, (src, dst, label, kind) in enumerate(steps):
        y = top + gap * i + 30
        x1, x2 = xs[src], xs[dst]
        col = '#94A3B8' if kind == 'return' else '#475569'
        dash = ' stroke-dasharray="5 3"' if kind == 'return' else ''
        head = 'r' if kind == 'return' else 'a'
        sign = 1 if x2 > x1 else -1
        out.append(f'<line x1="{x1 + sign*4}" y1="{y}" x2="{x2 - sign*6}" y2="{y}" stroke="{col}" '
                   f'stroke-width="1.4" marker-end="url(#{head})"{dash}/>')
        lines = label if isinstance(label, list) else [label]
        for j, ln in enumerate(lines):
            out.append(f'<text x="{(x1+x2)//2}" y="{y - 8 - 15*(len(lines)-1-j)}" font-family="{F}" '
                       f'font-size="13" fill="#334155" text-anchor="middle">{ln}</text>')
    out.append('</svg>')
    open(f'/tmp/{name}.svg', 'w', encoding='utf-8').write('\n'.join(out))
    subprocess.run(['convert', '-density', '130', '-background', 'white',
                    f'/tmp/{name}.svg', f'fig/{name}.png'], check=True)
    print('ok', name)


sequence('f_seq_approve',
  ['Багийн|гишүүн', 'Веб|интерфэйс', 'submit_task /|approve_task', 'tasks|хүснэгт', 'audit_log'],
  [('Багийн|гишүүн', 'Веб|интерфэйс', '1. «Хянуулах» дарна', 'call'),
   ('Веб|интерфэйс', 'submit_task /|approve_task', ['2. submit_task(taskId)'], 'call'),
   ('submit_task /|approve_task', 'tasks|хүснэгт', ['3. Эрх, статусыг', 'шалгана'], 'call'),
   ('tasks|хүснэгт', 'submit_task /|approve_task', '4. Зөвшөөрөв', 'return'),
   ('submit_task /|approve_task', 'tasks|хүснэгт', ['5. status →', 'UNDER_REVIEW'], 'call'),
   ('submit_task /|approve_task', 'audit_log', ['6. TASK_SUBMITTED', 'бичнэ'], 'call'),
   ('submit_task /|approve_task', 'Веб|интерфэйс', '7. Амжилттай', 'return'),
   ('Веб|интерфэйс', 'Багийн|гишүүн', ['8. «Илгээлээ»'], 'return')])

sequence('f_seq_reject',
  ['Төслийн|менежер', 'Веб|интерфэйс', 'reject_task', 'tasks|хүснэгт', 'audit_log'],
  [('Төслийн|менежер', 'Веб|интерфэйс', '1. «Буцаах» дарна', 'call'),
   ('Веб|интерфэйс', 'Веб|интерфэйс', ['2. Шалтгаан хоосон', 'эсэхийг шалгана'], 'call'),
   ('Веб|интерфэйс', 'reject_task', ['3. reject_task(', 'taskId, reason)'], 'call'),
   ('reject_task', 'reject_task', ['4. Шалтгаангүй бол', 'алдаа өгнө'], 'call'),
   ('reject_task', 'tasks|хүснэгт', ['5. status → REJECTED,', 'review_note'], 'call'),
   ('reject_task', 'audit_log', ['6. TASK_REJECTED', 'бичнэ'], 'call'),
   ('reject_task', 'Веб|интерфэйс', '7. Амжилттай', 'return'),
   ('Веб|интерфэйс', 'Төслийн|менежер', '8. «Буцаалаа»', 'return')])

sequence('f_seq_login',
  ['Хэрэглэгч', 'Login|дэлгэц', 'Supabase|Auth', 'profiles|хүснэгт', 'Нэгдсэн|самбар'],
  [('Хэрэглэгч', 'Login|дэлгэц', ['1. И-мэйл, нууц үг', 'оруулна'], 'call'),
   ('Login|дэлгэц', 'Supabase|Auth', ['2. signIn(email,', 'password)'], 'call'),
   ('Supabase|Auth', 'Login|дэлгэц', ['3. JWT токен'], 'return'),
   ('Login|дэлгэц', 'profiles|хүснэгт', ['4. Үүргийг уншина'], 'call'),
   ('profiles|хүснэгт', 'Login|дэлгэц', '5. role = TEAM_MEMBER', 'return'),
   ('Login|дэлгэц', 'Нэгдсэн|самбар', ['6. Үүрэгт тохирсон', 'цэс үзүүлнэ'], 'call'),
   ('Нэгдсэн|самбар', 'Хэрэглэгч', ['7. Зөвшөөрөгдсөн', 'төслүүд (RLS)'], 'return')])

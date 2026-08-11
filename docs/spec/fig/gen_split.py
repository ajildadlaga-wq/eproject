"""Class and ER diagrams, split in two.

Nine classes side by side on an A4 column leaves the type at about 5 pt. Rather
than shrink the reader, each is split: the core four that carry the approval
rule, then the four that record and describe. Shared entities appear in both,
drawn hollow the second time, so the seam is obvious.
"""
import subprocess

F = 'DejaVu Sans'
BLUE, NAVY, GREEN, RED, AMBER = '#1268EB', '#0A3576', '#22A15C', '#B23A3A', '#B8860B'
FILL = '#EAF2FE'


def dot(name, src, dpi=140):
    p = f'/tmp/{name}.dot'
    open(p, 'w', encoding='utf-8').write(src)
    subprocess.run(['dot', '-Tpng', f'-Gdpi={dpi}', p, '-o', f'fig/{name}.png'], check=True)
    print('ok', name)


HDR = f'''graph [fontname="{F}", bgcolor="white"];
node  [fontname="{F}"];
edge  [fontname="{F}", fontsize=11];'''


def cls(name, attrs, ops=(), color=BLUE, fill=FILL, faded=False):
    head = '#94A3B8' if faded else color
    body = '#F8FAFC' if faded else 'white'
    a = '<BR ALIGN="LEFT"/>'.join(attrs)
    out = f'''<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6">
    <TR><TD BGCOLOR="{head}"><FONT COLOR="white" POINT-SIZE="15"><B>{name}</B></FONT></TD></TR>
    <TR><TD ALIGN="LEFT" BALIGN="LEFT" BGCOLOR="{body}"><FONT POINT-SIZE="12.5">{a}</FONT></TD></TR>'''
    if ops:
        o = '<BR ALIGN="LEFT"/>'.join(ops)
        out += f'<TR><TD ALIGN="LEFT" BALIGN="LEFT" BGCOLOR="{fill}"><FONT POINT-SIZE="12.5">{o}</FONT></TD></TR>'
    return out + '</TABLE>>'


# ----------------------------------------------------------- class: core
dot('f_class_core', f'''digraph G {{
{HDR}
rankdir=TB; nodesep=.55; ranksep=.8;
node [shape=plaintext];
Profile [label={cls('Profile', [
  '- id : UUID', '- fullName : String', '- role : Role'],
  ['+ canApprove() : Boolean', '+ canWrite() : Boolean'])}];
Project [label={cls('Project', [
  '- id : UUID', '- name : String', '- phase : SdlcPhase',
  '- startDate : Date', '- endDate : Date'],
  ['+ progress() : Integer'])}];
Member [label={cls('ProjectMember', ['- memberRole : MemberRole'])}];
Task [label={cls('Task', [
  '- id : UUID', '- name : String', '- status : TaskStatus',
  '- priority : Priority', '- percentComplete : Integer',
  '- plannedEnd : Date', '- reviewNote : String'],
  ['+ submit()', '+ approve(note)', '+ reject(reason)',
   '+ countsToProgress() : Boolean'], color=GREEN, fill='#E6F6EA')}];
edge [color="#64748B", arrowhead=none];
Profile -> Project [taillabel="1", headlabel="0..*", label="  удирдана"];
Project -> Task    [taillabel="1", headlabel="0..*"];
Profile -> Member  [taillabel="1", headlabel="0..*"];
Project -> Member  [taillabel="1", headlabel="0..*"];
Profile -> Task    [taillabel="1", headlabel="0..*", label="  гүйцэтгэнэ", style=dashed];
Task -> Task       [taillabel="0..*", headlabel="0..*", label="  хамаарна", style=dashed];
}}''')

# ------------------------------------------------------ class: supporting
dot('f_class_support', f'''digraph G {{
{HDR}
rankdir=TB; nodesep=.55; ranksep=.8;
node [shape=plaintext];
Task [label={cls('Task', ['(Зураг 6.1-ийг үзнэ үү)'], faded=True)}];
Project [label={cls('Project', ['(Зураг 6.1-ийг үзнэ үү)'], faded=True)}];
Update [label={cls('TaskUpdate', [
  '- progressBefore : Integer', '- progressAfter : Integer',
  '- whatHappened : String', '- whyChanged : String',
  '- createdAt : DateTime'])}];
Audit [label={cls('AuditEntry', [
  '- action : String', '- entity : String',
  '- summary : String', '- occurredAt : DateTime'], color=NAVY)}];
Req [label={cls('Requirement', [
  '- title : String', '- type : ReqType',
  '- status : ReqStatus', '- baselineVersion : Integer'])}];
Risk [label={cls('Risk', [
  '- title : String', '- probability : Integer',
  '- impact : Integer', '- priority : Priority'],
  ['+ computePriority() : Priority'])}];
edge [color="#64748B", arrowhead=none];
Task -> Update  [taillabel="1", headlabel="0..*"];
Task -> Audit   [taillabel="1", headlabel="0..*", style=dashed];
Project -> Req  [taillabel="1", headlabel="0..*"];
Project -> Risk [taillabel="1", headlabel="0..*"];
Update -> Audit [style=invis];
Audit -> Req    [style=invis];
Req -> Risk     [style=invis];
{{rank=same; Task; Project;}}
}}''')


def tbl(name, rows, faded=False):
    head = '#94A3B8' if faded else NAVY
    out = f'''<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5">
    <TR><TD COLSPAN="2" BGCOLOR="{head}"><FONT COLOR="white" POINT-SIZE="14"><B>{name}</B></FONT></TD></TR>'''
    for key, col in rows:
        bg = FILL if key else 'white'
        k = f'<B>{key}</B>' if key else ' '
        out += (f'<TR><TD ALIGN="LEFT" BGCOLOR="{bg}"><FONT POINT-SIZE="12">{k}</FONT></TD>'
                f'<TD ALIGN="LEFT" BGCOLOR="{bg}"><FONT POINT-SIZE="12">{col}</FONT></TD></TR>')
    return out + '</TABLE>>'


# ------------------------------------------------------------- ERD: core
dot('f_erd_core', f'''digraph G {{
{HDR}
rankdir=TB; nodesep=.4; ranksep=.9; splines=spline;
node [shape=plaintext];
profiles [label={tbl('profiles', [
  ('PK', 'id  uuid'), ('', 'full_name  text'), ('', 'role  app_role')])}];
projects [label={tbl('projects', [
  ('PK', 'id  uuid'), ('', 'name  text'), ('', 'description  text'),
  ('', 'sdlc_phase  sdlc_phase'), ('', 'start_date  date'),
  ('', 'end_date  date'), ('FK', 'manager_id  uuid')])}];
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
edge [color="#64748B", arrowhead=crow, dir=both, arrowtail=none];
profiles -> projects [label="  1:N  удирдана"];
profiles -> members  [label="  1:N"];
projects -> members  [label="  1:N"];
projects -> tasks    [label="  1:N"];
profiles -> tasks    [label="  1:N  хариуцна"];
}}''')

# -------------------------------------------------------- ERD: supporting
dot('f_erd_support', f'''digraph G {{
{HDR}
rankdir=TB; nodesep=.4; ranksep=.9; splines=spline;
node [shape=plaintext];
tasks [label={tbl('tasks', [('PK', 'id  uuid')], faded=True)}];
projects [label={tbl('projects', [('PK', 'id  uuid')], faded=True)}];
profiles [label={tbl('profiles', [('PK', 'id  uuid')], faded=True)}];
updates [label={tbl('task_updates', [
  ('PK', 'id  uuid'), ('FK', 'task_id  uuid'), ('FK', 'project_id  uuid'),
  ('FK', 'user_id  uuid'), ('', 'user_name  text'),
  ('', 'progress_before / after  int'),
  ('', 'what_happened  text'), ('', 'why_changed  text')])}];
audit [label={tbl('audit_log', [
  ('PK', 'id  bigserial'), ('FK', 'actor_id  uuid'), ('', 'actor_name  text'),
  ('', 'action  text'), ('', 'entity  text'), ('FK', 'project_id  uuid'),
  ('', 'summary  text'), ('', 'detail  jsonb'),
  ('', 'occurred_at  timestamptz')])}];
reqs [label={tbl('requirements', [
  ('PK', 'id  uuid'), ('FK', 'project_id  uuid'), ('', 'title  text'),
  ('', 'type  requirement_type'), ('', 'status  requirement_status'),
  ('', 'baseline_version  int')])}];
risks [label={tbl('risks', [
  ('PK', 'id  uuid'), ('FK', 'project_id  uuid'), ('', 'title  text'),
  ('', 'category  risk_category'), ('', 'probability  int'),
  ('', 'impact  int'), ('', 'priority  priority_level')])}];
edge [color="#64748B", arrowhead=crow, dir=both, arrowtail=none];
tasks    -> updates [label="  1:N"];
profiles -> audit   [label="  1:N"];
projects -> reqs    [label="  1:N"];
projects -> risks   [label="  1:N"];
updates -> audit [style=invis];
audit -> reqs    [style=invis];
reqs -> risks    [style=invis];
{{rank=same; tasks; profiles; projects;}}
}}''')

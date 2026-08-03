import subprocess, os, textwrap
F='DejaVu Sans'
def dot(name, src, dpi=160):
    p=f'/tmp/{name}.dot'
    open(p,'w',encoding='utf-8').write(src)
    out=f'fig/{name}.png'
    subprocess.run(['dot','-Tpng',f'-Gdpi={dpi}',p,'-o',out],check=True)
    print('ok',out)

HDR = f'''graph [fontname="{F}", bgcolor="white"];
node  [fontname="{F}", fontsize=11];
edge  [fontname="{F}", fontsize=10];'''

# ---------- Fig 1.1  Task Lifecycle (State Machine) ----------
dot('f_task_lifecycle', f'''digraph G {{
rankdir=LR; {HDR}
node [shape=box, style="rounded,filled", fillcolor="#EAF2FE", color="#1268EB", penwidth=1.4, height=.5, margin="0.16,0.10"];
DRAFT[label="DRAFT\\n(Ноорог)"];
ASSIGNED[label="ASSIGNED\\n(Хуваарилагдсан)"];
INPROG[label="IN_PROGRESS\\n(Хийгдэж буй)"];
BLOCKED[label="BLOCKED\\n(Саатсан)", fillcolor="#FDE9E9", color="#B23A3A"];
COMPLETED[label="COMPLETED\\n(Гүйцэтгэсэн)"];
REVIEW[label="UNDER_REVIEW\\n(Хянагдаж буй)", fillcolor="#FFF4E0", color="#B8860B"];
APPROVED[label="APPROVED\\n(Батлагдсан)", fillcolor="#E6F6EA", color="#2E7D4F", penwidth=2];
REJECTED[label="REJECTED\\n(Буцаагдсан)", fillcolor="#FDE9E9", color="#B23A3A"];
DRAFT->ASSIGNED[label="PM хуваарилав"];
ASSIGNED->INPROG[label="Гишүүн эхлэв"];
INPROG->BLOCKED[label="саатал"]; BLOCKED->INPROG[label="шийдэгдэв"];
INPROG->COMPLETED[label="гишүүн дуусгав"];
COMPLETED->REVIEW[label="автоматаар"];
REVIEW->APPROVED[label="PM батлав", color="#2E7D4F", fontcolor="#2E7D4F", penwidth=1.8];
REVIEW->REJECTED[label="PM татгалзав", color="#B23A3A", fontcolor="#B23A3A"];
REJECTED->INPROG[label="дахин ажиллах", style=dashed];
{{rank=same; BLOCKED; REJECTED;}}
}}''')

# ---------- Fig 2.1  System Context Diagram ----------
dot('f_context', f'''digraph G {{
{HDR}
layout=neato; overlap=false; splines=true; sep="+18";
node [shape=box, style="rounded,filled", fillcolor="#F3F4F6", color="#6B7280", height=.55, margin="0.18,0.10"];
SYS [label="E-PROJECT\\nProject Management Dashboard", shape=box, style="rounded,filled",
     fillcolor="#1268EB", fontcolor="white", fontsize=13, penwidth=0, width=3.1, height=1.0, pos="0,0!"];
ADM [label="Administrator",   pos="-3.4,1.9!"];
PM  [label="Project Manager",  pos="0,2.6!"];
TM  [label="Team Member",      pos="3.4,1.9!"];
EX  [label="Executive",        pos="3.9,-0.6!"];
AUD [label="Auditor\\n(ирээдүйд)", style="rounded,filled,dashed", pos="2.6,-2.5!"];
AUTH[label="Supabase Auth\\n(Identity)", fillcolor="#EAF2FE", color="#1268EB", pos="-3.9,-0.6!"];
MAIL[label="Мэдэгдлийн суваг\\n(E-mail)", fillcolor="#EAF2FE", color="#1268EB", pos="-2.6,-2.5!"];
PLAN[label="Батлагдсан төслийн\\nтөлөвлөгөө (Gantt)", fillcolor="#FFF4E0", color="#B8860B", pos="0,-3.0!"];
ADM->SYS [label="хэрэглэгч, эрх"];
PM ->SYS [label="төсөл, task, approve"];
TM ->SYS [label="явц шинэчлэх"];
SYS->EX  [label="dashboard, тайлан"];
SYS->AUD [label="audit log", style=dashed];
SYS->AUTH[label="нэвтрэлт", dir=both];
SYS->MAIL[label="мэдэгдэл"];
PLAN->SYS[label="анхны өгөгдөл"];
}}''')

# ---------- Fig 2.2  Module Map ----------
dot('f_modules', f'''digraph G {{
rankdir=TB; {HDR}
node [shape=box, style="filled", color="#D1D5DB", fillcolor="#FFFFFF", height=.42, width=1.9, margin="0.10,0.06", fontsize=10];
subgraph cluster_p {{ label="Presentation (React + Vite + TS)"; style="rounded,filled"; fillcolor="#F8FAFC"; color="#94A3B8"; fontsize=12;
  L[label="Login"]; D[label="Dashboard"]; G[label="Gantt View"]; R[label="Reports"]; N[label="Notifications"]; U[label="User Mgmt"]; }}
subgraph cluster_b {{ label="Business Logic (Postgres RPC + Edge Functions)"; style="rounded,filled"; fillcolor="#EFF6FF"; color="#1268EB"; fontsize=12;
  PJ[label="Project Mgmt"]; TK[label="Task Mgmt"]; MS[label="Milestone"]; AP[label="Approval\\nWorkflow"]; PR[label="Progress\\nCalculation"]; RQ[label="Requirements\\n/ Risk"]; }}
subgraph cluster_d {{ label="Data & Security (Supabase Postgres + RLS)"; style="rounded,filled"; fillcolor="#F0FDF4"; color="#2E7D4F"; fontsize=12;
  DB[label="Core Schema"]; RL[label="RLS Policies"]; AL[label="Activity Log"]; AU[label="Audit Log"]; }}
D->PJ; G->TK; R->PR; N->AP; U->DB; L->RL;
PJ->DB; TK->DB; MS->DB; AP->AU; PR->DB; RQ->DB;
}}''')

# ---------- Fig 3.1  Power / Interest Grid ----------
dot('f_grid', f'''digraph G {{
{HDR}
layout=neato; overlap=false; splines=false;
node [shape=box, style="filled", fontsize=11, width=2.6, height=1.35, margin="0.12,0.10"];
Q2 [label="ӨНДӨР НӨЛӨӨ / БАГА СОНИРХОЛ\\n\\nKEEP SATISFIED\\n\\n• Байгууллагын удирдлага\\n• Мэдээллийн аюулгүй\\n  байдлын алба",
    fillcolor="#FFF4E0", color="#B8860B", pos="0,1.5!"];
Q1 [label="ӨНДӨР НӨЛӨӨ / ӨНДӨР СОНИРХОЛ\\n\\nMANAGE CLOSELY\\n\\n• Төслийн ивээн тэтгэгч\\n• Executive\\n• Project Manager",
    fillcolor="#E6F6EA", color="#2E7D4F", penwidth=2, pos="3,1.5!"];
Q4 [label="БАГА НӨЛӨӨ / БАГА СОНИРХОЛ\\n\\nMONITOR\\n\\n• Гадаад гүйцэтгэгч\\n• Хамтрагч байгууллага",
    fillcolor="#F3F4F6", color="#6B7280", pos="0,-1.5!"];
Q3 [label="БАГА НӨЛӨӨ / ӨНДӨР СОНИРХОЛ\\n\\nKEEP INFORMED\\n\\n• Team Member\\n• Administrator\\n• Auditor (ирээдүйд)",
    fillcolor="#EAF2FE", color="#1268EB", pos="3,-1.5!"];
}}''')

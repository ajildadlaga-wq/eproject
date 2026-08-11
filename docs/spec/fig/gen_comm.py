"""Communication diagrams, laid out by hand.

Sized to the page budget in fig/README.md: a canvas about 800 px wide with
12–13 px text lands near 8 pt once the figure is scaled to an A4 column.
Boxes are wide enough for their own labels and far enough apart for the
message that runs between them.
"""
import subprocess

F = 'DejaVu Sans'
BLUE, NAVY, FILL = '#1268EB', '#0A3576', '#EAF2FE'
CH = 6.7          # approximate width of one character at 12 px


def box(x, y, w, h, lines):
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{FILL}" '
           f'stroke="{BLUE}" stroke-width="1.6"/>']
    cy = y + h / 2 - (len(lines) - 1) * 8 + 4
    for i, ln in enumerate(lines):
        out.append(f'<text x="{x + w/2}" y="{cy + i*16}" font-family="{F}" font-size="12.5" '
                   f'fill="{NAVY}" text-anchor="middle">{ln}</text>')
    return out


def line(x1, y1, x2, y2):
    return [f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#94A3B8" stroke-width="1.5"/>']


def head(x, y, d):
    p = {'right': 'M0,0 L8,3.5 L0,7', 'left': 'M8,0 L0,3.5 L8,7',
         'down': 'M0,0 L3.5,8 L7,0', 'up': 'M0,8 L3.5,0 L7,8'}[d]
    return [f'<path d="{p}" transform="translate({x},{y})" fill="none" stroke="#475569" stroke-width="1.7"/>']


def msg(x, y, lines, anchor='middle'):
    """A numbered message, on a white plate so it stays legible wherever it sits."""
    w = max(len(s) for s in lines) * CH + 10
    h = len(lines) * 16 + 4
    px = {'middle': x - w / 2, 'start': x - 5, 'end': x - w + 5}[anchor]
    out = [f'<rect x="{px}" y="{y - h/2}" width="{w}" height="{h}" fill="white" opacity="0.95"/>']
    for i, ln in enumerate(lines):
        out.append(f'<text x="{x}" y="{y - h/2 + 16*i + 13}" font-family="{F}" font-size="12" '
                   f'fill="#1E293B" text-anchor="{anchor}">{ln}</text>')
    return out


def render(name, w, h, parts):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
           f'<rect width="{w}" height="{h}" fill="white"/>' + '\n'.join(parts) + '</svg>')
    open(f'/tmp/{name}.svg', 'w', encoding='utf-8').write(svg)
    subprocess.run(['convert', '-density', '110', '-background', 'white',
                    f'/tmp/{name}.svg', f'fig/{name}.png'], check=True)
    print('ok', name)


# --------------------------------------------------------- approving a task
p = []
p += box(18, 20, 168, 50, ['Төслийн менежер', ': Actor'])
p += box(340, 20, 170, 50, [': TaskList', '(интерфэйс)'])
p += box(325, 180, 200, 54, [': ApprovalService', '(approve_task)'])
p += box(655, 184, 128, 46, ['t3 : Task'])
p += box(340, 335, 170, 50, [': AuditLog'])

p += line(186, 45, 340, 45)
p += head(328, 41, 'right')
p += msg(263, 28, ['1: approve(t3)'])

p += line(425, 70, 425, 180)
p += head(421, 168, 'down')
p += msg(415, 122, ['2: approveTask(id, note)'], 'end')

p += line(525, 207, 655, 207)
p += head(643, 203, 'right')
p += msg(590, 174, ['3: checkManager()', '4: setStatus(APPROVED)'])

p += line(425, 234, 425, 335)
p += head(421, 323, 'down')
p += msg(415, 283, ['5: write(TASK_APPROVED)'], 'end')

p += line(655, 190, 510, 70)
p += head(514, 70, 'up')
p += msg(600, 118, ['6: updated'], 'start')
render('f_comm_approve', 800, 405, p)

# ---------------------------------------------------- updating task progress
p = []
p += box(18, 20, 168, 50, ['Багийн гишүүн', ': Actor'])
p += box(340, 20, 180, 50, [': ProgressDialog', '(интерфэйс)'])
p += box(318, 180, 224, 54, [': TaskService', '(update_task_progress)'])
p += box(672, 184, 128, 46, ['t3 : Task'])
p += box(340, 335, 180, 50, [': TaskUpdate'])

p += line(186, 45, 340, 45)
p += head(328, 41, 'right')
p += msg(263, 28, ['1: update(60%)'])

p += line(430, 70, 430, 180)
p += head(426, 168, 'down')
p += msg(420, 122, ['2: updateProgress(id, 60,', 'юу хийсэн, яагаад)'], 'end')

p += line(542, 207, 672, 207)
p += head(660, 203, 'right')
p += msg(607, 174, ['3: clampTo99()', '4: setPercent(60)'])

p += line(430, 234, 430, 335)
p += head(426, 323, 'down')
p += msg(420, 283, ['5: create(60, тайлбар)'], 'end')

p += line(672, 190, 520, 70)
p += head(524, 70, 'up')
p += msg(615, 118, ['6: saved'], 'start')
render('f_comm_progress', 820, 405, p)

// lib/doc.js — E-PROJECT master document: shared styles & building blocks
const fs = require('fs');
const path = require('path');
const D = require('docx');
const {
  Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, PageBreak, convertInchesToTwip,
} = D;

const FONT = 'Times New Roman';
const NAVY = '0A3576';
const BLUE = '0F56C4';
const GREY = '595959';
const CONTENT_TW = 9638;          // usable width in DXA (A4 minus 2cm margins)
const MAX_IMG_PX = 640;

// ---------------------------------------------------------------- counters
let chapter = 0, tblNo = 0, figNo = 0;
function setChapter(n) { chapter = n; tblNo = 0; figNo = 0; }

// ---------------------------------------------------------------- text bits
function runs(text, base = {}) {
  // supports **bold** inline
  const out = [];
  String(text).split(/(\*\*[^*]+\*\*)/g).forEach(seg => {
    if (!seg) return;
    const b = seg.startsWith('**') && seg.endsWith('**');
    out.push(new TextRun({ text: b ? seg.slice(2, -2) : seg, bold: b || !!base.bold, ...base }));
  });
  return out;
}

const P = (text = '', o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { before: o.before ?? 0, after: o.after ?? 120, line: o.line ?? 276 },
  indent: o.indent,
  keepNext: o.keepNext,
  children: typeof text === 'string' ? runs(text, { size: o.size || 22, italics: o.italics, bold: o.bold, color: o.color }) : text,
});

const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1, pageBreakBefore: true,
  spacing: { before: 0, after: 320, line: 276 },
  children: [new TextRun({ text, bold: true, size: 34, color: NAVY, font: FONT })],
});
const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2, keepNext: true,
  spacing: { before: 340, after: 160, line: 276 },
  children: [new TextRun({ text, bold: true, size: 27, color: BLUE, font: FONT })],
});
const H3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3, keepNext: true,
  spacing: { before: 240, after: 120, line: 276 },
  children: [new TextRun({ text, bold: true, size: 23, color: '000000', font: FONT })],
});

// ---------------------------------------------------------------- lists
const BUL = (items, o = {}) => items.map(t => new Paragraph({
  numbering: { reference: 'bul', level: o.level || 0 },
  alignment: AlignmentType.JUSTIFIED,
  spacing: { after: 60, line: 264 },
  children: runs(t, { size: 22 }),
}));
const NUM = (items) => items.map(t => new Paragraph({
  numbering: { reference: 'num', level: 0 },
  alignment: AlignmentType.JUSTIFIED,
  spacing: { after: 60, line: 264 },
  children: runs(t, { size: 22 }),
}));

// ---------------------------------------------------------------- table
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: 'AEB6C4' };
const TB = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function cell(text, { w, header = false, bg, align, bold, size = 20, span } = {}) {
  const children = (Array.isArray(text) ? text : String(text).split('\n')).map((t, i) =>
    new Paragraph({
      alignment: align || (header ? AlignmentType.CENTER : AlignmentType.LEFT),
      spacing: { before: 40, after: 40, line: 240 },
      children: runs(t, { size, bold: header || bold, color: header ? 'FFFFFF' : '000000' }),
    }));
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    columnSpan: span,
    shading: { type: ShadingType.CLEAR, fill: header ? BLUE : (bg || 'FFFFFF'), color: 'auto' },
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    borders: TB,
    verticalAlign: D.VerticalAlign.CENTER,
    children,
  });
}

/** TBL({caption, head:[...], rows:[[...]], widths:[pct...]}) -> array of elements */
function TBL({ caption, head, rows, widths, size = 20, firstColBold = false }) {
  tblNo += 1;
  const n = head ? head.length : rows[0].length;
  const w = (widths && widths.length === n ? widths : Array(n).fill(100 / n))
    .map(p => Math.round(CONTENT_TW * p / 100));
  const diff = CONTENT_TW - w.reduce((a, b) => a + b, 0); w[n - 1] += diff;

  const trs = [];
  if (head) trs.push(new TableRow({
    tableHeader: true,
    children: head.map((h, i) => cell(h, { w: w[i], header: true, size })),
  }));
  rows.forEach((r, ri) => trs.push(new TableRow({
    children: r.map((c, i) => cell(c, {
      w: w[i], size, bg: ri % 2 ? 'F5F7FA' : 'FFFFFF',
      bold: firstColBold && i === 0,
      align: n > 2 && i > 0 && String(c).length < 18 ? AlignmentType.CENTER : AlignmentType.LEFT,
    })),
  })));

  const out = [];
  if (caption) out.push(new Paragraph({
    alignment: AlignmentType.LEFT, keepNext: true, spacing: { before: 220, after: 80 },
    children: [new TextRun({ text: `Хүснэгт ${chapter}.${tblNo}. `, bold: true, size: 20, color: GREY }),
               new TextRun({ text: caption, size: 20, color: GREY })],
  }));
  out.push(new Table({ columnWidths: w, width: { size: CONTENT_TW, type: WidthType.DXA }, rows: trs }));
  out.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
  return out;
}

// ---------------------------------------------------------------- figure
function pngSize(file) {
  const b = fs.readFileSync(file).subarray(16, 24);
  return { w: b.readUInt32BE(0), h: b.readUInt32BE(4) };
}
function FIG(file, caption, maxPx = MAX_IMG_PX) {
  figNo += 1;
  const { w, h } = pngSize(file);
  const scale = Math.min(1, maxPx / w);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 240, after: 80 },
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(file),
        transformation: { width: Math.round(w * scale), height: Math.round(h * scale) } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [new TextRun({ text: `Зураг ${chapter}.${figNo}. `, bold: true, size: 20, color: GREY }),
                 new TextRun({ text: caption, size: 20, color: GREY })],
    }),
  ];
}

// ---------------------------------------------------------------- callout
function NOTE(label, text) {
  return [new Table({
    columnWidths: [CONTENT_TW],
    width: { size: CONTENT_TW, type: WidthType.DXA },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_TW, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: 'EEF3FA', color: 'auto' },
        margins: { top: 120, bottom: 120, left: 160, right: 160 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 2, color: 'C9D6E8' },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: 'C9D6E8' },
          left: { style: BorderStyle.SINGLE, size: 18, color: BLUE },
          right: { style: BorderStyle.SINGLE, size: 2, color: 'C9D6E8' },
        },
        children: [new Paragraph({
          alignment: AlignmentType.JUSTIFIED, spacing: { line: 264 },
          children: [new TextRun({ text: label + ' ', bold: true, size: 21, color: NAVY }),
                     ...runs(text, { size: 21 })],
        })],
      })],
    })],
  }), new Paragraph({ spacing: { after: 200 }, children: [] })];
}

const SPACER = (after = 200) => new Paragraph({ spacing: { after }, children: [] });
const BREAK = () => new Paragraph({ children: [new PageBreak()] });

module.exports = {
  D, FONT, NAVY, BLUE, GREY, CONTENT_TW, MAX_IMG_PX,
  setChapter, P, H1, H2, H3, BUL, NUM, TBL, FIG, NOTE, SPACER, BREAK, runs, cell,
};

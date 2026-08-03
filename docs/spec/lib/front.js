// lib/front.js — cover page, revision history, approval, TOC
const {
  D, FONT, NAVY, BLUE, GREY, CONTENT_TW, P, H1, TBL, SPACER, BREAK, setChapter,
} = require('./doc');
const {
  Paragraph, TextRun, AlignmentType, TableOfContents, BorderStyle, PageBreak,
} = D;

const META = {
  date: '2026 оны 8 дугаар сар',
  author: '‹Боловсруулсан: Овог, Нэр›',
  org: 'E-MONGOLIA',
  school: '‹Сургууль / Тэнхим›',
};

const center = (text, o = {}) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: o.before ?? 0, after: o.after ?? 120, line: 300 },
  children: [new TextRun({ text, bold: o.bold, size: o.size || 22, color: o.color || '000000',
    font: FONT, allCaps: o.caps, characterSpacing: o.tracking })],
});

function cover() {
  const fs = require('fs');
  const { ImageRun } = D;
  return [
    center(META.school, { size: 24, before: 300, after: 60 }),
    center('Дадлагын ажлын хүрээнд боловсруулав', { size: 21, color: GREY, after: 700 }),

    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new ImageRun({ type: 'png', data: fs.readFileSync('fig/mark.png'),
        transformation: { width: 118, height: 118 } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE, space: 8 } },
      children: [new TextRun({ text: 'E-PROJECT', bold: true, size: 72, color: NAVY, font: FONT, characterSpacing: 60 })],
    }),
    center('Government Project Management Dashboard', { size: 28, color: BLUE, before: 260, after: 600 }),

    center('SOFTWARE PROJECT DOCUMENTATION', { size: 26, bold: true, tracking: 30, after: 120 }),
    center('Төслийн баримт бичгийн нэгдсэн эмхэтгэл', { size: 22, color: GREY, italics: true, after: 700 }),

    ...TBL({
      head: null,
      widths: [32, 68],
      size: 21,
      firstColBold: true,
      rows: [
        ['Баримт бичгийн нэр', 'E-Project — Software Project Documentation'],
        ['Огноо (Date)', META.date],
        ['Боловсруулсан (Author)', META.author],
        ['Захиалагч (Client)', META.org],
        ['Стандарт (Standards)', 'IEEE 29148:2018 · PMBOK Guide 7th ed. · BPMN 2.0 · UML 2.5'],
      ],
    }),
    SPACER(600),
    center(META.date, { size: 22, color: GREY }),
    BREAK(),
  ];
}

function revisionHistory() {
  return [
    new Paragraph({
      spacing: { before: 0, after: 240 },
      children: [new TextRun({ text: 'Баримт бичгийн баталгаажуулалт (Document Approval)', bold: true, size: 30, color: NAVY, font: FONT })],
    }),
    P('Энэхүү баримт бичгийг дараах оролцогч талууд хянаж, баталгаажуулна. Гарын үсэг зурснаар тухайн этгээд баримт бичигт тусгагдсан хамрах хүрээ, шаардлага, хүлээлтийг хүлээн зөвшөөрсөнд тооцно.'),
    ...TBL({
      head: ['Үүрэг', 'Овог, нэр', 'Албан тушаал', 'Гарын үсэг', 'Огноо'],
      widths: [22, 22, 24, 18, 14],
      rows: [
        ['Байгууллагын удирдлага', '', '', '', ''],
        ['Төслийн менежер', '', '', '', ''],
        ['Business Analyst', '', '', '', ''],
        ['Хөгжүүлэгч багийн ахлагч', '', '', '', ''],
        ['Дадлагын удирдагч', '', '', '', ''],
      ],
    }),
    BREAK(),
  ];
}

function toc() {
  return [
    new Paragraph({
      spacing: { before: 0, after: 260 },
      children: [new TextRun({ text: 'Агуулга (Table of Contents)', bold: true, size: 30, color: NAVY, font: FONT })],
    }),
    new TableOfContents('Агуулга', { hyperlink: true, headingStyleRange: '1-3' }),
    new Paragraph({
      spacing: { before: 300 },
      children: [new TextRun({
        text: 'Санамж: Word дээр нээгээд агуулга дээр хулганы баруун товч → «Update Field» → «Update entire table» дарж хуудасны дугаарыг шинэчилнэ үү.',
        italics: true, size: 19, color: GREY, font: FONT })],
    }),
    BREAK(),
  ];
}

function abbreviations() {
  setChapter(0);
  return [
    new Paragraph({
      spacing: { before: 0, after: 240 },
      children: [new TextRun({ text: 'Товчилсон үг, нэр томьёо', bold: true, size: 30, color: NAVY, font: FONT })],
    }),
    ...TBL({
      head: ['Товчилсон үг', 'Бүтэн нэр', 'Тайлбар'],
      widths: [16, 30, 54],
      firstColBold: true,
      rows: [
        ['BPMN', 'Business Process Model and Notation', 'Бизнес процессыг зурах олон улсын стандарт тэмдэглэгээ (v2.0).'],
        ['BRD', 'Business Requirement Document', 'Бизнесийн шаардлагыг тодорхойлсон баримт бичиг.'],
        ['ERD', 'Entity Relationship Diagram', 'Өгөгдлийн сангийн мөн чанар–холбоосын диаграм.'],
        ['FR / NFR', 'Functional / Non-Functional Requirement', 'Функциональ ба функциональ бус шаардлага.'],
        ['IEEE 29148', 'ISO/IEC/IEEE 29148:2018', 'Шаардлагын инженерчлэл, SRS-ийн олон улсын стандарт.'],
        ['PM', 'Project Manager', 'Төслийн менежер — task батлах эрх бүхий үүрэг.'],
        ['PMBOK', 'Project Management Body of Knowledge', 'Төслийн удирдлагын PMI байгууллагын гарын авлага.'],
        ['RACI', 'Responsible, Accountable, Consulted, Informed', 'Хариуцлагыг хуваарилах матриц.'],
        ['RBAC', 'Role-Based Access Control', 'Үүрэгт суурилсан хандах эрхийн хяналт.'],
        ['RLS', 'Row-Level Security', 'PostgreSQL-ийн мөрийн түвшний аюулгүй байдлын бодлого.'],
        ['SDLC', 'System Development Life Cycle', 'Системийн хөгжүүлэлтийн амьдралын мөчлөг.'],
        ['SRS', 'Software Requirements Specification', 'Программ хангамжийн шаардлагын тодорхойлолт.'],
        ['UAT', 'User Acceptance Testing', 'Хэрэглэгчийн хүлээн авах туршилт.'],
        ['UML', 'Unified Modeling Language', 'Обьект хандлагат загварчлалын нэгдсэн хэл (v2.5).'],
        ['WBS', 'Work Breakdown Structure', 'Ажлын задаргааны бүтэц.'],
      ],
    }),
  ];
}

module.exports = { META, cover, revisionHistory, toc, abbreviations };

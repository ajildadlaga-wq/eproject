// build.js — E-PROJECT Software Project Documentation (master document)
const fs = require('fs');
const D = require('docx');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer,
  PageNumber, LevelFormat, BorderStyle,
} = D;
const { FONT, NAVY, BLUE, GREY } = require('./lib/doc');
const { META, cover, revisionHistory, toc, abbreviations } = require('./lib/front');

const chapters = [
  require('./ch/ch01_charter'),
  require('./ch/ch02_vision'),
  require('./ch/ch03_stakeholder'),
  require('./ch/ch04_srs'),
  require('./ch/ch05_usecase'),
  require('./ch/ch06_static'),
  require('./ch/ch07_dynamic'),
  require('./ch/ch08_database'),
  require('./ch/ch09_conclusion'),
];

const header = new Header({
  children: [new Paragraph({
    alignment: AlignmentType.RIGHT,
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C9D0DB', space: 4 } },
    children: [
      new TextRun({ text: 'E-PROJECT', bold: true, size: 17, color: NAVY, font: FONT }),
      new TextRun({ text: '  ·  Software Project Documentation', size: 17, color: GREY, font: FONT }),
    ],
  })],
});

const footer = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'C9D0DB', space: 6 } },
    children: [
      new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY, font: FONT }),
      new TextRun({ text: ' / ', size: 18, color: GREY, font: FONT }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: GREY, font: FONT }),
    ],
  })],
});

const blankFooter = new Footer({ children: [new Paragraph('')] });
const page = {
  size: { width: 11906, height: 16838 },
  margin: { top: 1134, right: 1134, bottom: 1134, left: 1418 },
};

const doc = new Document({
  creator: META.author,
  title: 'E-Project — Software Project Documentation',
  description: 'Government Project Management Dashboard — нэгдсэн баримт бичиг',
  features: { updateFields: true },
  styles: {
    default: {
      document: { run: { font: FONT, size: 22, color: '000000' },
                  paragraph: { spacing: { line: 276, after: 120 } } },
      heading1: { run: { font: FONT, size: 34, bold: true, color: NAVY } },
      heading2: { run: { font: FONT, size: 27, bold: true, color: BLUE } },
      heading3: { run: { font: FONT, size: 23, bold: true, color: '000000' } },
    },
    paragraphStyles: [{ id: 'Normal', name: 'Normal', run: { font: FONT, size: 22 } }],
  },
  numbering: {
    config: [
      { reference: 'bul', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 240 } }, run: { font: FONT, color: BLUE } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 900, hanging: 240 } }, run: { font: FONT, color: BLUE } } },
      ] },
      { reference: 'num', levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 260 } }, run: { font: FONT, bold: true, color: BLUE } } },
      ] },
    ],
  },
  sections: [
    { properties: { page }, footers: { default: blankFooter },
      children: [...cover(), ...revisionHistory(), ...toc(), ...abbreviations()] },
    { properties: { page }, headers: { default: header }, footers: { default: footer },
      children: chapters.flatMap(fn => fn()) },
  ],
});

Packer.toBuffer(doc).then(buf => {
  const out = process.argv[2] || 'E-Project_Documentation.docx';
  fs.writeFileSync(out, buf);
  console.log('✓', out, (buf.length / 1024).toFixed(0) + ' KB');
});

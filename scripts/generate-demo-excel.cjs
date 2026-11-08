const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const root = resolve(__dirname, '..');
const path = resolve(root, 'src/gomate-portal/formExcel.js');
const compiled = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)(createRequire(path), loaded, loaded.exports);

(async () => {
  const sharp = createRequire(resolve(root, '../GoMate-BE/package.json'))('sharp');
  const output = resolve(root, 'public/demo-excel'); mkdirSync(output, { recursive: true });
  for (const kind of ['verification', 'location', 'post']) for (const variant of [1, 2]) {
    const data = loaded.exports.sampleData(kind, variant);
    const documents = [];
    if (kind === 'verification') {
      for (const supplemental of [false, true]) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="620"><rect width="1100" height="620" fill="#f2edff"/><g font-family="Arial" fill="#49367c"><text x="55" y="90" font-size="45" font-weight="bold">DEMO - NOT A VALID LICENSE</text><text x="55" y="180" font-size="28">${data.company}</text><text x="55" y="245" font-size="28">Certificate: DEMO-GOMATE-00${variant}</text><text x="55" y="315" font-size="28">${supplemental ? 'Supplemental document' : 'Business verification test document'}</text><text x="55" y="415" font-size="25">For software demonstration and testing only.</text><text x="55" y="475" font-size="25">Replace this image before submitting a real application.</text></g></svg>`;
        documents.push({ buffer: await sharp(Buffer.from(svg)).png().toBuffer(), extension: 'png' });
      }
    }
    writeFileSync(resolve(output, `${kind}-${variant}.xlsx`), await loaded.exports.createFormWorkbook(kind, data, documents));
  }
  console.log('Generated six demo workbooks in public/demo-excel.');
})().catch(error => { console.error(error); process.exitCode = 1; });

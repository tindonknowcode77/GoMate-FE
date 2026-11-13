import fs from 'node:fs';
import path from 'node:path';

const map = {
  TCB: 'media_1794533038123_b3af217c.png',
  BIDV: 'media_1794533054583_02c01486.png',
  CTG: 'media_1794533077475_4723ad93.png',
  VCB: 'media_1794533096054_ebdcaa69.png',
  VPB: 'media_1794533109569_26ce602f.png',
  MB: 'media_1794533123326_d743364b.png',
  ACB: 'media_1794533150411_d3920af4.png',
  SHB: 'media_1794533166761_d9149add.png',
  HDB: 'media_1794533182521_69d51377.png',
  SCB: 'media_1794533195231_c6953f44.png',
  STB: 'media_1794533210118_b0083e4a.png',
  TPB: 'media_1794533224209_96a62f81.png',
  SHBVN: 'media_1794533248612_89f3c2b8.png',
};

const srcDir = 'C:/Users/tin/.gemini/antigravity/brain/c0e0886a-2dea-4990-a3cd-e98f462ffcfb/.user_uploaded';
const publicDir = 'C:/GoMate/GoMate-FE/public/banks';
const srcAssetsDir = 'C:/GoMate/GoMate-FE/src/assets/banks';

fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(srcAssetsDir, { recursive: true });

for (const [code, fileName] of Object.entries(map)) {
  const src = path.join(srcDir, fileName);
  fs.copyFileSync(src, path.join(publicDir, `${code}.png`));
  fs.copyFileSync(src, path.join(srcAssetsDir, `${code}.png`));
  console.log(`Copied ${code}`);
}

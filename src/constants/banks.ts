export interface BankInfo {
  code: string;
  shortName: string;
  name: string;
  bin: string;
  logo: any;
  logoUrl: string;
}

export const SUPPORTED_BANKS: BankInfo[] = [
  {
    code: 'MB',
    shortName: 'MBBank',
    name: 'Ngân hàng Quân Đội',
    bin: '970422',
    logo: require('../assets/banks/MB.png'),
    logoUrl: '/banks/MB.png',
  },
  {
    code: 'VCB',
    shortName: 'Vietcombank',
    name: 'Ngân hàng Ngoại thương Việt Nam',
    bin: '970436',
    logo: require('../assets/banks/VCB.png'),
    logoUrl: '/banks/VCB.png',
  },
  {
    code: 'BIDV',
    shortName: 'BIDV',
    name: 'Ngân hàng Đầu tư và Phát triển Việt Nam',
    bin: '970418',
    logo: require('../assets/banks/BIDV.png'),
    logoUrl: '/banks/BIDV.png',
  },
  {
    code: 'CTG',
    shortName: 'VietinBank',
    name: 'Ngân hàng Công thương Việt Nam',
    bin: '970415',
    logo: require('../assets/banks/CTG.png'),
    logoUrl: '/banks/CTG.png',
  },
  {
    code: 'TCB',
    shortName: 'Techcombank',
    name: 'Ngân hàng Kỹ thương Việt Nam',
    bin: '970407',
    logo: require('../assets/banks/TCB.png'),
    logoUrl: '/banks/TCB.png',
  },
  {
    code: 'ACB',
    shortName: 'ACB',
    name: 'Ngân hàng Á Châu',
    bin: '970416',
    logo: require('../assets/banks/ACB.png'),
    logoUrl: '/banks/ACB.png',
  },
  {
    code: 'VPB',
    shortName: 'VPBank',
    name: 'Ngân hàng Việt Nam Thịnh Vượng',
    bin: '970432',
    logo: require('../assets/banks/VPB.png'),
    logoUrl: '/banks/VPB.png',
  },
  {
    code: 'TPB',
    shortName: 'TPBank',
    name: 'Ngân hàng Tiên Phong',
    bin: '970423',
    logo: require('../assets/banks/TPB.png'),
    logoUrl: '/banks/TPB.png',
  },
  {
    code: 'HDB',
    shortName: 'HDBank',
    name: 'Ngân hàng Phát triển TP.HCM',
    bin: '970437',
    logo: require('../assets/banks/HDB.png'),
    logoUrl: '/banks/HDB.png',
  },
  {
    code: 'STB',
    shortName: 'Sacombank',
    name: 'Ngân hàng Sài Gòn Thương Tín',
    bin: '970403',
    logo: require('../assets/banks/STB.png'),
    logoUrl: '/banks/STB.png',
  },
  {
    code: 'SHB',
    shortName: 'SHB',
    name: 'Ngân hàng Sài Gòn - Hà Nội',
    bin: '970443',
    logo: require('../assets/banks/SHB.png'),
    logoUrl: '/banks/SHB.png',
  },
  {
    code: 'SCB',
    shortName: 'SCB',
    name: 'Ngân hàng Sài Gòn',
    bin: '970429',
    logo: require('../assets/banks/SCB.png'),
    logoUrl: '/banks/SCB.png',
  },
  {
    code: 'SHBVN',
    shortName: 'Shinhan Bank',
    name: 'Ngân hàng TNHH MTV Shinhan Việt Nam',
    bin: '970424',
    logo: require('../assets/banks/SHBVN.png'),
    logoUrl: '/banks/SHBVN.png',
  },
];

export function findBank(codeOrBin?: string): BankInfo | undefined {
  if (!codeOrBin) return undefined;
  const normalized = String(codeOrBin).trim().toUpperCase();
  return SUPPORTED_BANKS.find(
    b => b.code.toUpperCase() === normalized || b.shortName.toUpperCase() === normalized || b.bin === normalized
  );
}

// The same schema powers browser templates and the downloadable demo fixtures.
export const schemas = {
  verification: { sheet: 'DoanhNghiep', fields: {
    accountType: 'Loại tài khoản: business hoặc individual', country: 'Quốc gia: VN', company: 'Tên doanh nghiệp', website: 'Trang web', category: 'Ngành (đúng tên trong danh sách)', address: 'Địa chỉ chi tiết', certificateNumber: 'Số giấy chứng nhận', taxId: 'Mã số thuế (không bắt buộc)', representativeName: 'Người đại diện', representativeTitle: 'Chức vụ', representativeEmail: 'Email liên hệ', representativePhone: 'Số điện thoại',
  } },
  location: { sheet: 'DiaDiem', fields: { name: 'Tên địa điểm', address: 'Địa chỉ chi tiết', city: 'Tỉnh / Thành phố', phone: 'Số điện thoại', latitude: 'Vĩ độ', longitude: 'Kinh độ' } },
  post: { sheet: 'BaiDang', fields: { title: 'Tiêu đề', copy: 'Mô tả', discountPercent: 'Giảm giá (%)', offer: 'Ưu đãi', offerTerms: 'Điều kiện ưu đãi' } },
};
export const groupFields = { name: 'Tên nhóm', category: 'Danh mục', meetingPoint: 'Tên địa điểm / Điểm hẹn', location: 'Địa chỉ', city: 'Tỉnh / Thành phố', startsAt: 'Bắt đầu: YYYY-MM-DDTHH:mm (giờ Việt Nam)', endsAt: 'Kết thúc: YYYY-MM-DDTHH:mm (giờ Việt Nam)', maxParticipants: 'Sức chứa', estimatedCost: 'Chi phí / người (VND)', depositAmount: 'Tiền cọc / người (VND)' };
export const categories = ['Workshop', 'Cà phê', 'Thể thao', 'Du lịch', 'Âm nhạc', 'Nghệ thuật', 'Networking'];
const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
async function excel() { return (await import('exceljs')).default; }
const fail = message => { throw new Error(message); };
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : value == null ? '' : fail('Chỉ nhập văn bản hoặc số; không dùng công thức trong Excel.');
function number(value, label, min, max, integer = false) {
  const n = value === '' ? NaN : Number(value);
  if (!Number.isFinite(n) || n < min || n > max || integer && !Number.isInteger(n)) fail(`${label}: nhập ${integer ? 'số nguyên' : 'số'} từ ${min} đến ${max}.`);
  return n;
}
function required(data, fields) { for (const key of fields) if (!data[key]) fail(`Thiếu dữ liệu: ${key}.`); }
function limit(data, limits) { for (const [key, max] of Object.entries(limits)) if ((data[key] || '').length > max) fail(`${key}: tối đa ${max} ký tự.`); }
function style(sheet) {
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5642A6' } };
  sheet.columns.forEach(column => { column.width = 30; });
  sheet.eachRow(row => { row.alignment = { vertical: 'top', wrapText: true }; });
}
export function sampleData(kind, variant = 1) {
  if (kind === 'verification') return { accountType: 'business', country: 'VN', company: `CÔNG TY DEMO GOMATE ${variant}`, website: 'https://example.com', category: 'Thủ công, mỹ thuật và workshop', address: '12 Nguyễn Huệ, Phường Bến Nghé, TP. Hồ Chí Minh', certificateNumber: `DEMO-GOMATE-00${variant}`, taxId: '', representativeName: variant === 1 ? 'Nguyễn Minh An' : 'Trần Thu Hà', representativeTitle: 'Giám đốc', representativeEmail: `demo${variant}@example.com`, representativePhone: '0901234567' };
  if (kind === 'location') return variant === 1 ? { name: 'GoMate Demo - Nguyễn Huệ', address: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1', city: 'TP. Hồ Chí Minh', phone: '0901234567', latitude: 10.7739, longitude: 106.7033 } : { name: 'GoMate Demo - Thảo Điền', address: '12 Thảo Điền, Phường Thảo Điền, TP. Thủ Đức', city: 'TP. Hồ Chí Minh', phone: '0912345678', latitude: 10.8031, longitude: 106.734 };
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const location = sampleData('location', variant);
  return { promo: { title: variant === 1 ? 'Workshop làm nến thơm cuối tuần' : 'Workshop vẽ tranh và kết nối', copy: 'Cùng GoMate trải nghiệm sáng tạo, làm quen bạn mới và mang sản phẩm về nhà. Dữ liệu phục vụ demo.', discountPercent: 20, offer: 'Tặng một đồ uống và bộ dụng cụ', offerTerms: 'Áp dụng cho người đăng ký qua GoMate. Có mặt trước 15 phút.' }, groups: Array.from({ length: variant + 1 }, (_, index) => ({ name: `Nhóm demo ${index + 1}`, category: 'Workshop', meetingPoint: location.name, location: location.address, city: location.city, startsAt: `${date}T${index % 2 ? '14' : '09'}:00`, endsAt: `${date}T${index % 2 ? '16' : '11'}:00`, maxParticipants: 10, estimatedCost: 150000, depositAmount: 50000 })) };
}
export async function createFormWorkbook(kind, data = sampleData(kind), documents = []) {
  const Excel = await excel(), book = new Excel.Workbook();
  const schema = schemas[kind];
  const sheet = book.addWorksheet(schema.sheet);
  sheet.addRow(['Mã trường (giữ nguyên)', 'Nội dung', 'Giá trị (sửa cột này)']);
  for (const [key, label] of Object.entries(schema.fields)) sheet.addRow([key, label, (kind === 'post' ? data.promo : data)[key] ?? '']);
  style(sheet); sheet.getColumn(2).width = 44; sheet.getColumn(3).width = 65;
  // Phone and certificate cells stay strings, preserving leading zeroes.
  sheet.getColumn(3).numFmt = '@';
  if (kind === 'post') {
    const groups = book.addWorksheet('Nhom');
    groups.addRow(Object.keys(groupFields));
    for (const group of data.groups) groups.addRow(Object.keys(groupFields).map(key => group[key]));
    style(groups);
    for (const [index, label] of Object.values(groupFields).entries()) groups.getRow(1).getCell(index + 1).note = label;
  }
  if (kind === 'verification') for (const [index, doc] of [documents[0], documents[1]].entries()) {
    const attachments = book.addWorksheet(index ? 'TaiLieuBoSung' : 'GiayPhep');
    attachments.addRow(['Ảnh tài liệu: thay ảnh này bằng giấy phép của bạn. Ảnh DEMO chỉ để kiểm thử.']);
    if (doc) {
      const id = book.addImage({ buffer: doc.buffer, extension: doc.extension || 'png' });
      attachments.addImage(id, { tl: { col: 0, row: 2 }, ext: { width: 760, height: 420 } });
    }
  }
  const help = book.addWorksheet('HuongDan');
  help.addRows([
    ['GoMate · Nhập Excel vào form'],
    ['Giữ nguyên tên sheet và mã trường. Sửa giá trị ở cột C; mỗi file chứa một form.'],
    ['Nhập số điện thoại, số giấy chứng nhận dưới dạng văn bản để giữ số 0 đầu. Không dùng công thức.'],
    ['Bài đăng: mỗi dòng sheet Nhom là một nhóm (1–20 nhóm). Ngày giờ là văn bản YYYY-MM-DDTHH:mm, giờ Việt Nam.'],
    ['Nhập Excel chỉ điền form. Kiểm tra dữ liệu và nhấn nút gửi/lưu để thực hiện.'],
    ['Xác minh: chèn đúng một ảnh PNG/JPEG vào sheet GiayPhep, ảnh bổ sung vào TaiLieuBoSung (không bắt buộc). PDF chọn riêng trên form.'],
    ['Tệp tối đa 10 MB. Không tự tải tài liệu từ đường dẫn trong ô Excel.'],
    ['Các công ty, giấy phép và thông tin mẫu DEMO không dùng cho hồ sơ thật.'],
  ]); help.getColumn(1).width = 115; help.eachRow(row => { row.alignment = { wrapText: true }; row.height = 40; });
  return book.xlsx.writeBuffer();
}
export async function readFormWorkbook(kind, buffer, options = {}) {
  const Excel = await excel(), book = new Excel.Workbook();
  try { await book.xlsx.load(buffer); } catch { fail('Không đọc được Excel. Hãy dùng file .xlsx mẫu, không đặt mật khẩu.'); }
  const schema = schemas[kind], sheet = book.getWorksheet(schema.sheet);
  if (!sheet || sheet.rowCount > 60) fail(`Không đúng mẫu: cần sheet ${schema.sheet}.`);
  const data = {}, seen = new Set();
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const key = text(row.getCell(1).value);
    if (!key) return;
    if (!Object.hasOwn(schema.fields, key) || seen.has(key)) fail(`Mã trường không hợp lệ hoặc lặp: ${key}.`);
    seen.add(key); data[key] = text(row.getCell(3).value);
  });
  for (const key of Object.keys(schema.fields)) if (!seen.has(key)) fail(`Thiếu dòng ${key} trong mẫu.`);
  if (kind === 'location') {
    required(data, ['name', 'address', 'city']); limit(data, { name: 120, address: 300, city: 100, phone: 40 });
    if ((data.latitude === '') !== (data.longitude === '')) fail('Nhập cả vĩ độ và kinh độ hoặc để trống cả hai.');
    if (data.latitude !== '') { data.latitude = number(data.latitude, 'Vĩ độ', -90, 90); data.longitude = number(data.longitude, 'Kinh độ', -180, 180); }
    return data;
  }
  if (kind === 'verification') {
    required(data, ['company', 'category', 'address', 'certificateNumber', 'representativeName', 'representativeTitle', 'representativeEmail', 'representativePhone']);
    limit(data, { company: 150, website: 500, address: 500, certificateNumber: 60, representativeName: 120, representativeTitle: 80 });
    if (!['business', 'individual'].includes(data.accountType) || data.country !== 'VN') fail('Loại tài khoản phải là business/individual, quốc gia là VN.');
    if (options.industries && !options.industries.includes(data.category)) fail('Ngành không có trong danh sách trên form.');
    if (!/^[A-Z0-9][A-Z0-9./-]{1,59}$/i.test(data.certificateNumber)) fail('Số giấy chứng nhận không hợp lệ.');
    if (data.taxId && !/^\d{10}(?:\d{3})?$/.test(data.taxId)) fail('Mã số thuế cần 10 hoặc 13 chữ số.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.representativeEmail) || !/^[+\d][\d\s().-]{7,24}$/.test(data.representativePhone)) fail('Email hoặc số điện thoại liên hệ không hợp lệ.');
    if (data.website) { let url; try { url = new URL(data.website); } catch { fail('Trang web phải là URL http/https đầy đủ.'); } if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) fail('Trang web phải là URL http/https hợp lệ.'); }
    if (options.identity) for (const key of ['accountType', 'country', 'certificateNumber']) if (data[key] !== options.identity[key]) fail('Excel không được thay đổi thông tin định danh đã khóa.');
    const documents = ['GiayPhep', 'TaiLieuBoSung'].map(name => {
      const images = book.getWorksheet(name)?.getImages() || [];
      if (images.length > 1) fail(`Sheet ${name} chỉ được chứa một ảnh.`);
      if (!images.length) return null;
      const image = book.getImage(images[0].imageId);
      if (!['png', 'jpeg', 'jpg'].includes(image.extension) || !image.buffer?.byteLength || image.buffer.byteLength > 10 * 1024 * 1024) fail('Ảnh tài liệu phải là PNG/JPEG, tối đa 10 MB.');
      return { name: `${name}.${image.extension}`, mime: image.extension === 'png' ? 'image/png' : 'image/jpeg', buffer: image.buffer };
    });
    return { application: data, documents };
  }
  required(data, ['title', 'copy']); limit(data, { title: 120, copy: 3000, offer: 200, offerTerms: 500 });
  if (data.title.length < 3) fail('Tiêu đề cần ít nhất 3 ký tự.');
  data.discountPercent = number(data.discountPercent, 'Giảm giá', 0, 100, true);
  const groupSheet = book.getWorksheet('Nhom');
  if (!groupSheet || groupSheet.rowCount < 2 || groupSheet.rowCount > 21) fail('Sheet Nhom cần từ 1 đến 20 nhóm.');
  const keys = Object.keys(groupFields);
  keys.forEach((key, i) => { if (text(groupSheet.getRow(1).getCell(i + 1).value) !== key) fail(`Giữ nguyên cột ${key} trong sheet Nhom.`); });
  const groups = [];
  groupSheet.eachRow((row, index) => {
    if (index === 1) return;
    const group = Object.fromEntries(keys.map((key, i) => [key, text(row.getCell(i + 1).value)]));
    required(group, keys);
    limit(group, { name: 80, meetingPoint: 150, location: 200, city: 100 });
    if (!categories.includes(group.category)) fail(`Nhóm ${index - 1}: danh mục không hợp lệ.`);
    for (const key of ['startsAt', 'endsAt']) {
      const value = group[key];
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + '+07:00')) || new Date(value + 'Z').toISOString().slice(0, 16) !== value) fail(`Nhóm ${index - 1}: dùng ngày giờ YYYY-MM-DDTHH:mm hợp lệ.`);
    }
    if (group.startsAt >= group.endsAt || Date.parse(group.startsAt + '+07:00') <= Date.now()) fail(`Nhóm ${index - 1}: lịch phải ở tương lai, kết thúc sau bắt đầu.`);
    group.maxParticipants = number(group.maxParticipants, 'Sức chứa', 2, 1000, true);
    group.estimatedCost = number(group.estimatedCost, 'Chi phí', 0, 100000000, true);
    group.depositAmount = number(group.depositAmount, 'Tiền cọc', 0, group.estimatedCost, true);
    groups.push({ ...group, id: `excel-group-${index}`, locationId: '' });
  });
  return { promo: data, groups };
}
export async function downloadFormTemplate(kind) {
  let buffer;
  if (kind === 'verification') {
    const response = await fetch('/demo-excel/verification-1.xlsx');
    if (!response.ok) fail('Không tải được mẫu hồ sơ. Vui lòng thử lại.');
    buffer = await response.arrayBuffer();
  } else buffer = await createFormWorkbook(kind);
  const url = URL.createObjectURL(new Blob([buffer], { type: mime }));
  const link = document.createElement('a'); link.href = url; link.download = `gomate-${kind}-mau.xlsx`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

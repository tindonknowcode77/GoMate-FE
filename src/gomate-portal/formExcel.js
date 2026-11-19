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
function text(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Object.hasOwn(value, 'formula') || Object.hasOwn(value, 'sharedFormula')) fail('Ô chứa công thức; hãy thay bằng giá trị văn bản hoặc số.');
  if (value.error) fail(`Ô có lỗi Excel (${value.error}).`);
  if (Array.isArray(value.richText)) return value.richText.map(part => part.text).join('').trim();
  // Excel automatically turns emails and URLs into hyperlink objects. Read the
  // displayed text only; never follow the link or fetch external resources.
  if (typeof value.text === 'string' && typeof value.hyperlink === 'string') return value.text.trim();
  fail('Kiểu ô không hỗ trợ; hãy nhập văn bản hoặc số.');
}
function number(value, label, min, max, integer = false) {
  const n = value === '' ? NaN : Number(value);
  if (!Number.isFinite(n) || n < min || n > max || integer && !Number.isInteger(n)) fail(`${label}: nhập ${integer ? 'số nguyên' : 'số'} từ ${min} đến ${max}.`);
  return n;
}
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
  const data = {}, seen = new Set(), cells = {}, issues = [];
  const issue = (cell, label, message) => issues.push({ sheet: cell.worksheet.name, cell: cell.address, field: label, message });
  const read = (cell, label) => {
    try {
      const value = text(cell.value);
      if (!value) { issue(cell, label, 'Ô trống, giữ nguyên giá trị trên form.'); return undefined; }
      return value;
    } catch (error) { issue(cell, label, error.message); return undefined; }
  };
  const validate = (target, key, cell, label, check) => {
    if (!Object.hasOwn(target, key)) return;
    try { target[key] = check(target[key]); }
    catch (error) { delete target[key]; issue(cell, label, error.message); }
  };
  const check = (key, test) => validate(data, key, cells[key], schema.fields[key], test);
  const lengths = (target, limits, fieldCells, labels) => {
    for (const [key, max] of Object.entries(limits)) validate(target, key, fieldCells[key], labels[key], value => {
      if (value.length > max) fail(`Tối đa ${max} ký tự.`);
      return value;
    });
  };
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const key = read(row.getCell(1), 'Mã trường');
    if (key === undefined) return;
    if (!Object.hasOwn(schema.fields, key)) { issue(row.getCell(1), 'Mã trường', `Mã trường không hợp lệ: ${key}.`); return; }
    if (seen.has(key)) {
      delete data[key];
      issue(row.getCell(1), schema.fields[key], `Mã trường ${key} bị lặp; bỏ qua toàn bộ giá trị của trường này.`);
      return;
    }
    seen.add(key); cells[key] = row.getCell(3);
    const value = read(cells[key], schema.fields[key]);
    if (value !== undefined) data[key] = value;
  });
  for (const [key, label] of Object.entries(schema.fields)) if (!seen.has(key)) issues.push({ sheet: sheet.name, cell: '', field: label, message: `Thiếu dòng ${key}; giữ nguyên giá trị trên form.` });
  if (kind === 'location') {
    lengths(data, { name: 120, address: 300, city: 100, phone: 40 }, cells, schema.fields);
    check('latitude', value => number(value, 'Vĩ độ', -90, 90));
    check('longitude', value => number(value, 'Kinh độ', -180, 180));
    // Coordinates form one map point; never combine half an imported pair with
    // the other half from an existing location.
    if (Object.hasOwn(data, 'latitude') !== Object.hasOwn(data, 'longitude')) {
      const key = Object.hasOwn(data, 'latitude') ? 'latitude' : 'longitude';
      issue(cells[key], schema.fields[key], 'Cần cả vĩ độ và kinh độ hợp lệ; giữ nguyên tọa độ trên form.');
      delete data.latitude; delete data.longitude;
    }
    return { ...data, issues };
  }
  if (kind === 'verification') {
    lengths(data, { company: 150, website: 500, address: 500, certificateNumber: 60, representativeName: 120, representativeTitle: 80 }, cells, schema.fields);
    check('company', value => { if (value.length < 2) fail('Tên doanh nghiệp cần ít nhất 2 ký tự.'); return value; });
    check('accountType', value => { if (!['business', 'individual'].includes(value)) fail('Chọn business hoặc individual.'); return value; });
    check('country', value => { if (value !== 'VN') fail('Quốc gia phải là VN.'); return value; });
    check('category', value => { if (options.industries && !options.industries.includes(value)) fail('Ngành không có trong danh sách trên form.'); return value; });
    check('certificateNumber', value => { if (!/^[A-Z0-9][A-Z0-9./-]{1,59}$/i.test(value)) fail('Số giấy chứng nhận không hợp lệ.'); return value; });
    check('taxId', value => { if (!/^\d{10}(?:\d{3})?$/.test(value)) fail('Mã số thuế cần 10 hoặc 13 chữ số.'); return value; });
    check('representativeEmail', value => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail('Email liên hệ không hợp lệ.'); return value; });
    check('representativePhone', value => { if (!/^[+\d][\d\s().-]{7,24}$/.test(value)) fail('Số điện thoại liên hệ không hợp lệ.'); return value; });
    check('website', value => {
      let url; try { url = new URL(value); } catch { fail('Trang web phải là URL http/https đầy đủ.'); }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) fail('Trang web phải là URL http/https hợp lệ.');
      return value;
    });
    if (options.identity) for (const key of ['accountType', 'country', 'certificateNumber']) check(key, value => {
      if (value !== options.identity[key]) fail('Thông tin định danh đã khóa; giữ nguyên giá trị trên form.');
      return value;
    });
    const documents = ['GiayPhep', 'TaiLieuBoSung'].map(name => {
      const documentIssue = message => { issues.push({ sheet: name, cell: '', field: 'Ảnh tài liệu', message }); return null; };
      const images = book.getWorksheet(name)?.getImages() || [];
      if (images.length > 1) return documentIssue('Chỉ được chứa một ảnh; giữ nguyên tài liệu trên form.');
      if (!images.length) return null;
      const image = book.getImage(images[0].imageId);
      if (!image || !['png', 'jpeg', 'jpg'].includes(image.extension) || !image.buffer?.byteLength || image.buffer.byteLength > 10 * 1024 * 1024) return documentIssue('Ảnh tài liệu phải là PNG/JPEG, tối đa 10 MB; giữ nguyên tài liệu trên form.');
      return { name: `${name}.${image.extension}`, mime: image.extension === 'png' ? 'image/png' : 'image/jpeg', buffer: image.buffer };
    });
    return { application: data, documents, issues };
  }
  lengths(data, { title: 120, copy: 3000, offer: 200, offerTerms: 500 }, cells, schema.fields);
  check('title', value => { if (value.length < 3) fail('Tiêu đề cần ít nhất 3 ký tự.'); return value; });
  check('discountPercent', value => number(value, 'Giảm giá', 0, 100, true));
  const groupSheet = book.getWorksheet('Nhom');
  if (!groupSheet || groupSheet.rowCount < 2 || groupSheet.rowCount > 21) {
    issues.push({ sheet: 'Nhom', cell: '', field: 'Danh sách nhóm', message: 'Cần từ 1 đến 20 nhóm; giữ nguyên các nhóm trên form.' });
    return { promo: data, groups: [], groupsComplete: false, issues };
  }
  const keys = Object.keys(groupFields);
  const validColumns = keys.filter((key, i) => {
    const cell = groupSheet.getRow(1).getCell(i + 1);
    try { if (text(cell.value) === key) return true; } catch { /* Report the exact column below. */ }
    issue(cell, groupFields[key], `Giữ nguyên tiêu đề cột ${key}; bỏ qua cột này.`); return false;
  });
  const groups = [];
  let groupsComplete = validColumns.length === keys.length;
  groupSheet.eachRow((row, index) => {
    if (index === 1) return;
    const group = {}, groupCells = Object.fromEntries(keys.map((key, i) => [key, row.getCell(i + 1)]));
    for (const key of validColumns) {
      const value = read(groupCells[key], groupFields[key]);
      if (value !== undefined) group[key] = value;
    }
    const groupCheck = (key, test) => validate(group, key, groupCells[key], groupFields[key], test);
    lengths(group, { name: 80, meetingPoint: 150, location: 200, city: 100 }, groupCells, groupFields);
    groupCheck('category', value => { if (!categories.includes(value)) fail('Danh mục không hợp lệ.'); return value; });
    for (const key of ['startsAt', 'endsAt']) {
      groupCheck(key, value => {
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + '+07:00')) || new Date(value + 'Z').toISOString().slice(0, 16) !== value) fail('Dùng ngày giờ YYYY-MM-DDTHH:mm hợp lệ.');
        if (Date.parse(value + '+07:00') <= Date.now()) fail('Lịch phải ở tương lai.');
        return value;
      });
    }
    if (group.startsAt && group.endsAt && group.startsAt >= group.endsAt) {
      issue(groupCells.endsAt, groupFields.endsAt, 'Kết thúc phải sau bắt đầu; giữ nguyên lịch trên form.');
      delete group.startsAt; delete group.endsAt;
    }
    // As with coordinates, import a schedule only as a complete pair.
    if (Boolean(group.startsAt) !== Boolean(group.endsAt)) {
      const key = group.startsAt ? 'startsAt' : 'endsAt';
      issue(groupCells[key], groupFields[key], 'Cần cả thời gian bắt đầu và kết thúc hợp lệ; giữ nguyên lịch trên form.');
      delete group.startsAt; delete group.endsAt;
    }
    groupCheck('maxParticipants', value => number(value, 'Sức chứa', 2, 1000, true));
    groupCheck('estimatedCost', value => number(value, 'Chi phí', 0, 100000000, true));
    groupCheck('depositAmount', value => number(value, 'Tiền cọc', 0, 100000000, true));
    if (Object.hasOwn(group, 'depositAmount') && (!Object.hasOwn(group, 'estimatedCost') || group.depositAmount > group.estimatedCost)) {
      issue(groupCells.depositAmount, groupFields.depositAmount, 'Cần chi phí hợp lệ và tiền cọc không vượt chi phí; giữ nguyên chi phí và tiền cọc trên form.');
      delete group.estimatedCost; delete group.depositAmount;
    } else if (Object.hasOwn(group, 'estimatedCost') && !Object.hasOwn(group, 'depositAmount')) {
      issue(groupCells.estimatedCost, groupFields.estimatedCost, 'Cần cả chi phí và tiền cọc hợp lệ; giữ nguyên hai giá trị trên form.');
      delete group.estimatedCost;
    }
    if (keys.some(key => !Object.hasOwn(group, key))) groupsComplete = false;
    groups.push({ ...group, excelRow: index });
  });
  if (groups.length !== groupSheet.rowCount - 1) groupsComplete = false;
  return { promo: data, groups, groupsComplete, issues };
}

// Partial imports update groups by their Excel row, preserving existing values
// and extra draft groups. A complete workbook can still replace the group list.
export function mergeExcelGroups(current, imported, complete) {
  const next = complete ? [] : [...current];
  for (const { excelRow, ...fields } of imported) {
    if (!Object.keys(fields).length) continue;
    const index = excelRow - 2;
    while (next.length <= index) next.push({ ...Object.fromEntries(Object.keys(groupFields).map(key => [key, ''])), id: `excel-group-${Date.now()}-${next.length}`, locationId: '' });
    next[index] = { ...next[index], ...fields, ...(['location', 'meetingPoint', 'city'].some(key => Object.hasOwn(fields, key)) ? { locationId: '' } : {}) };
  }
  return next;
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

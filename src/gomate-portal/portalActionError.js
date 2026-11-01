const reasons = {
  'Failed to fetch': 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
  'NetworkError when attempting to fetch resource.': 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
  'Name must contain 2 to 100 characters': 'Họ tên cần từ 2 đến 100 ký tự.',
  'Email already registered; use a new employee email': 'Email đã được sử dụng. Vui lòng nhập email khác.',
  'Email already registered': 'Email đã được sử dụng. Vui lòng nhập email khác.',
  'Invalid request fields': 'Thông tin gửi lên không hợp lệ. Vui lòng tải lại trang và kiểm tra thông tin đã nhập.',
  'Missing or invalid text': 'Vui lòng nhập đầy đủ thông tin bắt buộc và kiểm tra độ dài các trường.',
  'Valid email required': 'Vui lòng nhập địa chỉ email hợp lệ.',
  'Invalid email': 'Địa chỉ email không hợp lệ.',
  'Invalid phone number': 'Số điện thoại không hợp lệ. Vui lòng nhập từ 9 đến 15 chữ số.',
  'Invalid coordinates': 'Tọa độ địa điểm không hợp lệ.',
  'Invalid map position': 'Vị trí trên bản đồ không hợp lệ.',
  'Invalid credentials': 'Email hoặc mật khẩu không chính xác.',
  'Invalid email or password': 'Email hoặc mật khẩu không chính xác.',
  'A 6-digit verification code is required': 'Vui lòng nhập mã xác minh gồm 6 chữ số.',
  'Invalid or expired code. Request a new code if needed.': 'Mã xác minh không đúng hoặc đã hết hạn. Vui lòng yêu cầu mã mới.',
  'Invalid or expired verification code': 'Mã xác minh không đúng hoặc đã hết hạn.',
  'Invalid or expired code': 'Mã xác minh không đúng hoặc đã hết hạn.',
  'Provide the current version': 'Dữ liệu chưa được cập nhật. Vui lòng làm mới trang rồi thử lại.',
  'Group changed': 'Thông tin nhóm đã thay đổi. Vui lòng làm mới dữ liệu rồi thử lại.',
  'Group changed. Reload before saving.': 'Thông tin nhóm đã thay đổi. Vui lòng làm mới dữ liệu rồi thử lại.',
  'Post changed': 'Bài đăng đã thay đổi. Vui lòng làm mới dữ liệu rồi thử lại.',
  'Post changed. Reload before editing.': 'Bài đăng đã thay đổi. Vui lòng làm mới dữ liệu rồi thử lại.',
  'Post changed or cannot be withdrawn': 'Bài đăng đã thay đổi hoặc không còn có thể rút lại. Vui lòng làm mới dữ liệu.',
  'Staff account changed': 'Thông tin nhân viên đã thay đổi. Vui lòng làm mới dữ liệu rồi thử lại.',
  'Staff request changed': 'Phân công nhân viên đã thay đổi. Vui lòng làm mới dữ liệu rồi thử lại.',
  'Location not found or changed': 'Địa điểm đã bị xóa hoặc thay đổi. Vui lòng làm mới dữ liệu rồi thử lại.',
  'Insufficient business permissions': 'Bạn không có quyền thực hiện thao tác này trong doanh nghiệp.',
  'Insufficient portal permissions': 'Tài khoản của bạn không có quyền thực hiện thao tác này.',
  'Verified business required': 'Doanh nghiệp cần được xác minh trước khi thực hiện thao tác này.',
  'Group access denied': 'Bạn không có quyền quản lý nhóm này hoặc quyền đã bị thu hồi.',
  'Group not found': 'Không tìm thấy nhóm hoặc nhóm không còn được phép truy cập.',
  'Group is closed': 'Nhóm đã đóng nên không thể thực hiện thao tác này.',
  'Group closed': 'Nhóm đã đóng nên không thể thực hiện thao tác này.',
  'No deposit to record or group closed': 'Nhóm đã đóng hoặc không có khoản tiền cọc cần ghi nhận.',
  'Only approved members have deposit records': 'Chỉ có thể ghi nhận tiền cọc cho thành viên đã được duyệt.',
  'Request changed, group full or no longer upcoming': 'Yêu cầu đã thay đổi, nhóm đã đủ người hoặc đã quá thời gian đăng ký.',
  'Only assign approved groups belonging to this business': 'Chỉ được phân công các nhóm đã được duyệt thuộc doanh nghiệp của bạn.',
  'Cannot change the account identity of an employee': 'Không thể đổi email của tài khoản nhân viên. Vui lòng giữ email hiện tại.',
  'Employee account not found': 'Tài khoản nhân viên không còn tồn tại. Vui lòng làm mới dữ liệu.',
  'Employee password required': 'Vui lòng nhập mật khẩu cho tài khoản nhân viên.',
  'Employee already belongs to this business': 'Nhân viên đã có trong doanh nghiệp. Vui lòng chỉnh sửa thông tin hiện tại.',
  'Select 0–50 valid groups': 'Chỉ được chọn tối đa 50 nhóm hợp lệ, không trùng nhau.',
  'Offer expiry must be in the future': 'Thời hạn ưu đãi phải sau thời điểm hiện tại.',
  'Too many attempts. Try again later.': 'Bạn đã thao tác quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.',
};

export function portalActionError(operation, error) {
  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  let reason = reasons[message] || message;
  if (error?.status === 401 && !reasons[message]) reason = 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.';
  else if (error?.status >= 500) reason = 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
  else if (!reason) reason = error?.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : 'Vui lòng kiểm tra kết nối và thử lại.';
  return `Không thể ${operation}: ${reason}`;
}

export function groupCommandOperation(group, command, patch) {
  const target = `nhóm “${group.name}”`;
  if (command === 'actions/confirm-schedule') return `chốt lịch cho ${target}`;
  if (command === 'actions/start') return `bắt đầu hoạt động của ${target}`;
  if (command === 'actions/complete') return `kết thúc hoạt động của ${target}`;
  if (command.startsWith('requests/')) return `${patch.status === 'approved' ? 'duyệt' : 'từ chối'} yêu cầu tham gia ${target}`;
  if (command.startsWith('offers/')) return `cập nhật ưu đãi của ${target}`;
  if (command.startsWith('attendance/')) return `cập nhật điểm danh của ${target}`;
  return `cập nhật ${target}`;
}

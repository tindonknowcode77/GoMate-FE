# Đối chiếu giao diện FE và backend

Ngày kiểm tra: 2026-10-03. FE: `fe-ui2`, commit `a90fcbd`; BE: code local
trong `GoMate-BE`. Đây là kết quả đọc code, chưa kiểm thử API trên server.

## Hiện trạng

BE đã có `/api/auth/register`, `/login`, `/google`, `/verify-email`,
`/resend-verification`, `/me`, `/logout` (các đường dẫn sau cùng tiền tố
`/api/auth`), cùng `/api/health`. Route nằm trong
`GoMate-BE/src/modules/auth/routes.js` và `GoMate-BE/src/app.js`.

FE đã nối đăng ký, OTP 6 số, gửi lại mã, đăng nhập và đăng xuất; token giữ trong bộ nhớ.
Tạo/sửa/xóa, danh sách hoạt động do mình tổ chức và chi tiết đã nối API hoạt động;
Match dùng API tìm kiếm. Các màn hình demo khác trong `src/data/` vẫn chứa dữ liệu mẫu. Tin nhắn, duyệt thành viên,
đánh giá chưa được lưu vào backend. Hồ sơ cá nhân và ảnh đại diện đã nối API
`/api/profile/me` và `/api/profile/me/avatar` (2026-10-04).

## Chức năng backend cần bổ sung

| Giao diện / chức năng | BE cần xử lý | Hiện trạng BE |
| --- | --- | --- |
| Đăng nhập, đăng ký, xác minh email, Google | Nối các API tài khoản hiện có vào app; xử lý phiên hết hạn | Đã có API, FE mới chưa nối |
| Quên/đặt lại mật khẩu, đổi mật khẩu | Gửi mã/link có hạn, xác thực yêu cầu, cập nhật mật khẩu và thu hồi phiên theo chính sách | Chưa có |
| Đăng nhập Apple | Xác minh danh tính Apple và cấp phiên | Chưa có |
| Tạo/sửa/xem hồ sơ | Tên, username, ảnh đại diện, giới thiệu, khu vực, sở thích | Đã nối hồ sơ của mình và upload ảnh; hồ sơ host/thành viên vẫn mẫu |
| Tạo/sửa/xóa và xem hoạt động | Tên, danh mục, mô tả, ảnh bìa, thời gian, địa điểm, sức chứa, chi phí dự kiến, yêu cầu | Đã nối CRUD, danh sách của host, chi tiết và ảnh bìa Cloudinary; BE kiểm tra quyền host; xóa mềm |
| Match và bộ lọc | Từ khóa, phân trang, khoảng cách/danh mục/ngân sách/thời gian rảnh | Đã nối GET /api/activities; bỏ qua/undo chỉ local, chưa lưu BE |
| Yêu cầu tham gia và quản lý host | Gửi yêu cầu, xem trạng thái chờ, duyệt/từ chối, chống yêu cầu trùng và vượt sức chứa | Chưa có |
| Trang chủ và hoạt động của tôi | Hoạt động đã tham gia/đã tổ chức, lịch sắp tới, trạng thái và lịch sử | Đã có danh sách đã tổ chức; danh sách đã tham gia và dữ liệu trang chủ chưa nối |
| Nhóm hoạt động | Danh sách thành viên, quyền host/member, chỉ cho người đủ quyền xem nội dung nhóm | Chưa có |
| Tin nhắn riêng và chat nhóm | Hội thoại, lịch sử phân trang, gửi/nhận tin, số chưa đọc, đánh dấu đã đọc; cập nhật realtime | Chưa có |
| Kế hoạch nhóm | Lịch trình, checklist, bình chọn và phiếu bầu | Chưa có |
| Chi phí | Khoản chi, người trả, người chia, số tiền mỗi người cần thanh toán, trạng thái cân bằng | Chưa có; chưa thấy luồng thanh toán thật trong nhóm |
| Đang diễn ra và tổng kết | Bắt đầu/kết thúc, đổi giờ/địa điểm, nhật ký cập nhật, điểm danh, ảnh kỷ niệm, số liệu tổng kết | Chưa có |
| Đánh giá | Sao/nhận xét cho hoạt động và thành viên, chỉ người đủ điều kiện được đánh giá, thống kê điểm và tỷ lệ tham dự | Chưa có |
| Thông báo | Yêu cầu mới, kết quả duyệt, tin nhắn, nhắc lịch, thay đổi từ host; trạng thái đã đọc, thiết bị nhận push và tùy chọn nhận | Chưa có |
| An toàn và quyền riêng tư | Báo cáo hoạt động/người dùng, chặn/bỏ chặn, ẩn, giới hạn hiển thị hồ sơ và gợi ý | Chưa có |
| Cài đặt tài khoản nâng cao | Hai bước xác thực, lịch sử đăng nhập, tài khoản liên kết, số điện thoại nếu giữ các mục này trong sản phẩm | Chưa có; UI phần lớn chỉ là nhãn |
| GoMate Plus | Gói/thời hạn/quyền lợi, xác nhận giao dịch và trạng thái thuê bao nếu triển khai | Chưa có; nút dùng thử hiện chưa xử lý |

Upload ảnh đại diện, ảnh bìa và ảnh nhóm cần cơ chế lưu file và trả URL dùng
được trên thiết bị khác. Đổi ngôn ngữ/giao diện và xin quyền hệ điều hành là
phần FE; chỉ cần BE nếu muốn đồng bộ tùy chọn qua nhiều thiết bị.

## Các điểm cần thống nhất trước khi nối API

1. Đã sửa `VerifyEmailScreen.tsx` thành **6 ô mã**, hiển thị email thật và gọi API.
2. Khám phá Match qua API không còn báo thành công giả khi vuốt phải; gửi yêu cầu
   và host duyệt chưa triển khai. Các luồng hoạt động mẫu khác vẫn là prototype.
3. FE đang gộp `pending/confirmed/in-progress/completed` trong một kiểu trạng thái.
   Nên tách trạng thái yêu cầu tham gia khỏi vòng đời hoạt động.
4. Dữ liệu mẫu như `3/5`, `2.5 km`, `120.000đ/người` chỉ để hiển thị.
   API nên trả số lượng/sức chứa, khoảng cách dạng số, số tiền/đơn vị tiền tệ,
   thời gian có múi giờ và tọa độ để lọc chính xác; FE định dạng khi hiển thị.
5. Bộ lọc khám phá đã áp dụng từ khóa, khoảng cách, danh mục, ngân sách và
   ngày/giờ bắt đầu qua API. Khoảng cách cần quyền vị trí; thời gian theo UTC+7.
6. Quyền sửa, duyệt, bắt đầu/kết thúc, truy cập chat và đánh giá phải kiểm tra
   tại BE. Không lấy quyền host từ nút hiển thị hoặc tên người dùng ở FE.
7. Các dấu verified, số sao, tỷ lệ đúng hẹn và số hoạt động hoàn thành hiện là
   dữ liệu mẫu; cần định nghĩa rõ cách xác minh/tính toán trước khi cung cấp thật.

## Thứ tự đề xuất

1. Nối auth hiện có, sửa OTP; bổ sung khôi phục mật khẩu và hồ sơ/upload.
2. Hoạt động + Match cơ bản + yêu cầu tham gia + duyệt thành viên + phân quyền.
3. Nhóm + chat + thông báo + bắt đầu/kết thúc + điểm danh.
4. Kế hoạch/bình chọn, chia chi phí, ảnh, đánh giá và thống kê.
5. Hoàn thiện báo cáo/chặn trước phát hành; chốt phạm vi Apple, 2FA, Plus
   và các mục cài đặt nâng cao trước khi triển khai thêm.

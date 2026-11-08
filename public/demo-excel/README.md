# Excel demo cho doanh nghiệp

Trong ba form ở `/portal`, dùng **Tải Excel mẫu** hoặc **Excel demo 1 / 2**,
sau đó **Nhập Excel**, kiểm tra dữ liệu và nhấn nút gửi/lưu của form.

| Tệp | Nội dung |
| --- | --- |
| verification-1.xlsx | Công ty DEMO 1, giấy phép và tài liệu bổ sung bằng ảnh |
| verification-2.xlsx | Công ty DEMO 2, định danh khác để thử tài khoản thứ hai |
| location-1.xlsx | Địa điểm Nguyễn Huệ, đầy đủ điện thoại và tọa độ |
| location-2.xlsx | Địa điểm Thảo Điền, đầy đủ điện thoại và tọa độ |
| post-1.xlsx | Workshop làm nến, 2 nhóm, 10 người/nhóm, cọc 50.000đ |
| post-2.xlsx | Workshop vẽ tranh, 3 nhóm, 10 người/nhóm, cọc 50.000đ |

Mẫu tải trực tiếp trong form luôn tạo lịch tương lai. Các file demo được tạo với
lịch sau ngày sinh file 7 ngày; chạy `npm run demo:excel` trong GoMate-FE để tạo
lại trước buổi demo sau này. Script cần GoMate-BE và dependency `sharp` đã cài.

Giữ tên sheet, mã trường ở cột A và tiêu đề cột của sheet Nhom. Chỉ sửa cột C
trong DoanhNghiep/DiaDiem/BaiDang. Mỗi dòng trong Nhom là một nhóm độc lập;
ngày giờ viết dạng `YYYY-MM-DDTHH:mm`, theo giờ Việt Nam. Không dùng công thức.
Số điện thoại và giấy chứng nhận nên để kiểu Text để giữ số 0 đầu.

File xác minh có sheet GiayPhep và TaiLieuBoSung: chèn một ảnh PNG/JPEG vào mỗi
sheet. Ảnh sẽ tự điền vào phần tài liệu tương ứng, có xem trước. PDF vẫn chọn
riêng trên form. Mẫu không có ảnh vẫn nhập các trường văn bản; cần chọn giấy
phép trước khi gửi hồ sơ lần đầu. Thông tin định danh đã khóa vẫn được bảo vệ.

Các tài liệu và công ty DEMO là dữ liệu kiểm thử, không phải giấy phép thật.
Hồ sơ vẫn qua luồng duyệt của admin; Excel không tự submit hoặc tự duyệt.

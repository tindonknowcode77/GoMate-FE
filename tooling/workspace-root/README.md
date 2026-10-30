# GoMate — chạy web tại một cổng

Chạy tại thư mục gốc chứa `GoMate-FE` và `GoMate-BE`.

```powershell
npm install
npm --prefix GoMate-FE install
npm --prefix GoMate-BE install
npm run dev:all
```

Lệnh build frontend từ code hiện tại, dùng API tương đối `/api`, rồi chạy backend tại cổng **3000**. Không khởi động Expo ở cổng 8081. Cần cấu hình MongoDB trong `GoMate-BE/.env` trước khi chạy.

- Ứng dụng: http://localhost:3000
- Doanh nghiệp / Staff / Admin: http://localhost:3000/portal
- Demo: http://localhost:3000/demo
- API: http://localhost:3000/api

Sau khi sửa frontend, chạy `npm run build:web` ở terminal khác rồi tải lại trang; hoặc dừng và chạy lại `npm run dev:all`. Frontend không tự reload trong chế độ này. Backend tự khởi động lại khi sửa code.

Lệnh build luôn đặt `EXPO_PUBLIC_API_BASE_URL=/api`, ghi đè URL trong `.env.local` cho lần build web này. Không cần đổi cấu hình Expo/native. `npm run start` trong FE vẫn là công cụ Expo riêng cho phát triển mobile.

Nhấn Ctrl+C để dừng. Nếu build lỗi, lệnh dừng trước khi mở server để tránh phục vụ bản cũ. Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd`.

# GoMate Mobile

Sau khi gộp `fe-ui2`, app dùng `index.ts` và `App.tsx`. Code web cũ được
sao lưu tại `C:\GoMate\backups\fe-stash-20261003`; stash vẫn được giữ nguyên.
Đã nối API đăng ký, xác minh email 6 số, gửi lại mã, đăng nhập và đăng xuất.
Sau xác minh, FE tự gọi đăng nhập rồi mở bước hoàn thiện hồ sơ.

- `npm.cmd run dev`: chạy Expo.
- `npm.cmd run build`: xuất bản web vào `dist` cho lệnh build ở thư mục gốc.
- `npm.cmd run build:mobile`: xuất bundle Android/iOS vào `dist-native`.
- Cấu hình `EXPO_PUBLIC_API_BASE_URL` trong `.env` thành URL BE có đuôi `/api`,
  rồi khởi động lại Expo. Điện thoại thật dùng IP LAN của máy chạy BE;
  Android emulator dùng `http://10.0.2.2:3000/api`. Web cần BE cho phép origin qua CORS.
- Token chỉ giữ trong bộ nhớ; mở lại app cần đăng nhập lại. Google/Apple và
  quên mật khẩu chưa được nối. Hồ sơ cá nhân đã nối API lấy/sửa và upload ảnh;
  tạo/sửa/xóa, danh sách hoạt động tổ chức, chi tiết và Match đã nối API.
  Nhóm/chat và các mục hoạt động mẫu trên trang chủ vẫn chưa nối đầy đủ.

Ứng dụng tìm người cùng tham gia một hoạt động cụ thể, được xây dựng bằng React
Native, Expo SDK 57 và TypeScript. Luồng hiện tại gồm đăng nhập/đăng ký, xác minh
email, hoàn thiện hồ sơ và khu vực ứng dụng chính với năm tab: Trang chủ, Match,
Tạo, Tin nhắn và Hồ sơ.

Tab Match là trung tâm tìm và quản lý hoạt động: mở chế độ khám phá toàn màn hình,
xem chi tiết, gửi yêu cầu tham gia, xem yêu cầu đang chờ, hoặc quản lý hoạt động
đã đăng và duyệt thành viên. Khi được duyệt, mỗi hoạt động có nhóm riêng với
Chat, Kế hoạch, Chi phí và Thành viên, sau đó đi qua trạng thái đang diễn ra,
tổng kết và đánh giá.

## Chạy dự án

```powershell
npm.cmd install
npm.cmd start
```

Quét QR bằng Expo Go hoặc nhấn `a` để mở Android emulator. Trên PowerShell, dùng
`npm.cmd` nếu chính sách thực thi chặn `npm.ps1`.

## Kiểm tra

- `npm.cmd run typecheck`: kiểm tra TypeScript.
- `npm.cmd run lint`: kiểm tra mã bằng Expo ESLint.
- `npx.cmd expo-doctor`: kiểm tra cấu hình và dependency Expo.
- `npx.cmd expo export --platform android --output-dir dist`: tạo Android bundle.

## Cấu trúc chính

- `App.tsx`: điều phối xác thực, onboarding và ứng dụng chính.
- `src/screens/`: toàn bộ màn hình auth, profile, dashboard, Match, bộ lọc,
  tạo hoạt động, tin nhắn và các luồng phụ.
- `src/components/`: header, bottom navigation, activity card và UI dùng lại.
- `src/data/activities.ts`: dữ liệu activity mẫu cho Match.
- `src/services/activityService.ts`: adapter mock cho việc đăng hoạt động trong
  khi backend chưa có contract tương ứng.
- `src/assets/Activity-image/`: bốn ảnh hoạt động do dự án cung cấp.
- `docs/`: nhật ký phát triển và quyết định sản phẩm/kỹ thuật.

Hiện dữ liệu, trạng thái yêu cầu/nhóm và điều hướng được giữ cục bộ để hoàn thiện
prototype UI. Backend, xác thực thật, upload và lưu trữ lâu dài chưa được kết nối.

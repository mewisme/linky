# Danh mục Trường hợp Kiểm thử LINKY

Danh mục này liệt kê tất cả luồng có thể kiểm thử được suy ra từ TEST_STRATEGY_AUDIT.md. ID Trường hợp Kiểm thử theo quy ước: TC-AUT-xxx (Tự động), TC-MAN-xxx (Thủ công).

---

## Trường hợp Kiểm thử Tự động

| ID | Tính năng | Loại Kiểm thử | Cấp độ | Mô tả Ngắn | Điều kiện Tiên quyết | Kết quả Mong đợi |
|----|-----------|---------------|--------|-------------|----------------------|------------------|
| TC-AUT-001 | Xác thực | Tự động | UI | Sign-in với email trống | Trang tại /sign-in, Clerk sẵn sàng | Input email giữ giá trị; không điều hướng |
| TC-AUT-002 | Xác thực | Tự động | UI | Sign-in với định dạng email không hợp lệ | Trang tại /sign-in, Clerk sẵn sàng | Input email giữ giá trị; không điều hướng |
| TC-AUT-003 | Xác thực | Tự động | UI | Sign-in với email không tồn tại | Trang tại /sign-in, Clerk sẵn sàng | Thông báo lỗi hiển thị: không tìm thấy tài khoản |
| TC-AUT-004 | Xác thực | Tự động | UI | Sign-in với mật khẩu trống | Email đã gửi, trang mật khẩu hiển thị | Input mật khẩu giữ giá trị; không submit |
| TC-AUT-005 | Xác thực | Tự động | UI | Sign-in với mật khẩu sai | Email hợp lệ đã gửi, trang mật khẩu hiển thị | Thông báo lỗi hiển thị: mật khẩu sai |
| TC-AUT-006 | Xác thực | Tự động | UI | Sign-in thành công | Email và mật khẩu hợp lệ | Chuyển hướng tới landing; nút vào chat hiển thị |
| TC-AUT-007 | Xác thực | Tự động | UI | Sign-up với định dạng email không hợp lệ | Trang tại /sign-up, Clerk sẵn sàng | Input email giữ giá trị; không điều hướng |
| TC-AUT-008 | Xác thực | Tự động | UI | Sign-up với mật khẩu dưới 8 ký tự | Trang tại /sign-up | Lỗi mật khẩu hiển thị |
| TC-AUT-009 | Xác thực | Tự động | UI | Sign-up không chấp nhận điều khoản | Form điền, checkbox chưa chọn | Checkbox vẫn chưa chọn; không submit |
| TC-AUT-010 | Xác thực | Tự động | UI | Sign-up với email đã dùng | Form điền với email tồn tại | Lỗi phản hồi form hiển thị |
| TC-AUT-011 | Xác thực | Tự động | UI | Sign-up với mật khẩu yếu hoặc bị xâm phạm | Form điền với mật khẩu yếu | Lỗi mật khẩu hiển thị |
| TC-AUT-012 | Xác thực | Tự động | UI | Sign-up OTP trống | Sign-up đã gửi, trang OTP hiển thị | Lỗi OTP hiển thị |
| TC-AUT-013 | Xác thực | Tự động | UI | Sign-up OTP sai | Trang OTP hiển thị | Lỗi OTP hiển thị |
| TC-AUT-014 | Xác thực | Tự động | UI | Sign-up thành công | Form hợp lệ, OTP đúng | Chuyển hướng về trang chủ |
| TC-AUT-015 | Video Chat | Tự động | UI | Trang idle hiển thị với nút bắt đầu | User đã xác thực, trang /chat | Container idle và nút bắt đầu hiển thị |
| TC-AUT-016 | Video Chat | Tự động | UI | Hai người dùng ghép cặp và vào cuộc gọi | Hai user đã xác thực, cả hai trên /chat, cả hai bắt đầu cuộc gọi | Cả hai thấy container video, video từ xa, timer cuộc gọi |
| TC-AUT-017 | Video Chat | Tự động | UI | Kết thúc cuộc gọi trả cả hai về idle | Hai user trong cuộc gọi | Cả hai thấy nút bắt đầu; video từ xa và timer ẩn |
| TC-AUT-018 | Video Chat | Tự động | UI | Bỏ qua cuộc gọi trả cả hai về idle | Hai user trong cuộc gọi | Cả hai thấy nút bắt đầu; video từ xa ẩn |
| TC-AUT-019 | Video Chat | Tự động | UI | Bỏ qua rồi bắt đầu cuộc gọi mới | Hai user, bỏ qua, cả hai idle | Cả hai có thể bắt đầu lại và ghép cặp |
| TC-AUT-020 | Video Chat | Tự động | UI | Bật/tắt tiếng phản ánh trong UI | Hai user trong cuộc gọi | Nút mute hiển thị variant destructive khi tắt tiếng |
| TC-AUT-021 | Video Chat | Tự động | UI | Bật/tắt camera phản ánh trong UI | Hai user trong cuộc gọi | Chỉ báo tắt camera hiển thị khi tắt; nút hiển thị destructive |
| TC-AUT-022 | Video Chat | Tự động | UI | Kết nối lại sau reload trang | Hai user trong cuộc gọi, user1 reload | User1 trở về trạng thái in-call; container video hiển thị |
| TC-AUT-023 | Video Chat | Tự động | UI | Chat: mở sidebar, gửi và nhận tin nhắn | Hai user trong cuộc gọi | Cả hai thấy sidebar chat; tin nhắn hiển thị trên cả hai |
| TC-AUT-024 | Video Chat | Tự động | UI | Thêm yêu thích trong cuộc gọi | Hai user trong cuộc gọi | Thêm yêu thích; toast "Added to favorites"; nút xóa hiển thị |
| TC-AUT-025 | Video Chat | Tự động | UI | Xóa yêu thích trong cuộc gọi | User đã thêm yêu thích trong cuộc gọi | Xóa yêu thích; toast "Removed from favorites"; nút thêm hiển thị |
| TC-AUT-026 | Video Chat | Tự động | UI | Bố cục idle viewport mobile | User đã xác thực, viewport mobile, /chat | Container idle và nút bắt đầu hiển thị |
| TC-AUT-027 | Video Chat | Tự động | UI | Bố cục in-call viewport mobile | Hai user trong cuộc gọi trên mobile | Container video, video từ xa, timer hiển thị; bounding box hợp lệ |
| TC-AUT-028 | Yêu thích | Tự động | UI | Trang danh sách yêu thích tải | User đã xác thực có yêu thích, /connections/favorites | Bảng dữ liệu yêu thích hiển thị |
| TC-AUT-029 | Yêu thích | Tự động | UI | Xóa yêu thích từ danh sách | User trên trang yêu thích, ít nhất một yêu thích | Xóa thành công; danh sách cập nhật |
| TC-AUT-030 | Hồ sơ User | Tự động | UI | Trang hồ sơ tải | User đã xác thực, /user/profile | Card hồ sơ, avatar, trường tên hiển thị |
| TC-AUT-031 | Hồ sơ User | Tự động | UI | Trang tiến độ hiển thị cấp và chuỗi | User đã xác thực, /user/progress | Card cấp tiến độ, card chuỗi, giá trị exp hiển thị |
| TC-AUT-032 | Admin | Tự động | UI | Danh sách admin users tải | Admin user, /admin/users | Bảng users hoặc trạng thái trống hiển thị |
| TC-AUT-033 | Admin | Tự động | UI | Trang admin interest tags tải | Admin user, /admin/interest-tags | Nội dung interest tags hiển thị |
| TC-AUT-034 | Admin | Tự động | UI | Trang admin reports tải | Admin user, /admin/reports | Nội dung reports hiển thị |

---

## Trường hợp Kiểm thử Thủ công

| ID | Tính năng | Loại Kiểm thử | Cấp độ | Mô tả Ngắn | Điều kiện Tiên quyết | Kết quả Mong đợi |
|----|-----------|---------------|--------|-------------|----------------------|------------------|
| TC-MAN-001 | WebRTC | Thủ công | Thủ công | Xác minh chất lượng video trong cuộc gọi | Hai user trong cuộc gọi, camera thật | Video rõ, không có artifact |
| TC-MAN-002 | WebRTC | Thủ công | Thủ công | Xác minh chất lượng âm thanh trong cuộc gọi | Hai user trong cuộc gọi, microphone thật | Âm thanh rõ, không vang hoặc méo |
| TC-MAN-003 | WebRTC | Thủ công | Thủ công | Xác minh độ trễ chấp nhận được | Hai user trong cuộc gọi | Độ trễ dưới 500ms cảm nhận |
| TC-MAN-004 | Quyền | Thủ công | Thủ công | Từ chối quyền camera | User từ chối camera | App hiển thị lỗi phù hợp; không crash |
| TC-MAN-005 | Quyền | Thủ công | Thủ công | Từ chối quyền microphone | User từ chối microphone | App hiển thị lỗi phù hợp; không crash |
| TC-MAN-006 | Quyền | Thủ công | Thủ công | Chuyển camera giữa cuộc gọi | User có nhiều camera | Video chuyển sang camera mới |
| TC-MAN-007 | Quyền | Thủ công | Thủ công | Chuyển microphone giữa cuộc gọi | User có nhiều mic | Âm thanh chuyển sang microphone mới |
| TC-MAN-008 | Video Nổi | Thủ công | Thủ công | Kéo overlay tới góc | User trong cuộc gọi, overlay hiển thị | Overlay snap vào góc gần nhất |
| TC-MAN-009 | Video Nổi | Thủ công | Thủ công | Vị trí overlay trên mobile | User trong cuộc gọi trên mobile | Overlay đúng vị trí; không che điều khiển |
| TC-MAN-010 | Kết nối | Thủ công | Thủ công | Chỉ báo chất lượng kết nối dưới mạng kém | Mạng kém mô phỏng hoặc thật | Chỉ báo phản ánh trạng thái suy giảm |
| TC-MAN-011 | Kết nối | Thủ công | Thủ công | Khôi phục ngắt kết nối kéo dài | User ngắt kết nối 30+ giây | Peer thấy end-call; hành vi kết nối lại đúng |
| TC-MAN-012 | Xác thực | Thủ công | Thủ công | Luồng 2FA | User có 2FA bật | Hộp thoại 2FA hiển thị; sign-in hoàn tất |
| TC-MAN-013 | Xác thực | Thủ công | Thủ công | Duy trì phiên qua tab | User đã đăng nhập, mở tab mới | Phiên duy trì; không đăng nhập trùng |
| TC-MAN-014 | Admin | Thủ công | Thủ công | So sánh embedding | Admin user, hai user có embedding | Modal so sánh hiển thị độ tương đồng; kết quả hợp lý |
| TC-MAN-015 | Admin | Thủ công | Thủ công | Tìm user tương tự | Admin user, user có embedding | Danh sách user tương tự trả về; thứ tự hợp lý |
| TC-MAN-016 | Admin | Thủ công | Thủ công | Hành động bulk user | Admin user, users được chọn | Hành động bulk thực thi; danh sách cập nhật |
| TC-MAN-017 | Admin | Thủ công | Thủ công | Import interest tags | Admin user, file JSON | Import thành công; tags hiển thị trong danh sách |
| TC-MAN-018 | Ghép cặp | Thủ công | Thủ công | Chất lượng ghép cặp với sở thích chung | Hai user có thẻ trùng | User ghép cặp có sở thích chung; chất lượng chủ quan tốt |
| TC-MAN-019 | Tương thích | Thủ công | Thủ công | Đa trình duyệt: Chrome, Firefox, Safari | Cùng luồng trên mỗi trình duyệt | Luồng hoạt động nhất quán |
| TC-MAN-020 | Tương thích | Thủ công | Thủ công | Thiết bị mobile: iOS Safari | Thiết bị iOS thật | Luồng video chat hoạt động |
| TC-MAN-021 | Tương thích | Thủ công | Thủ công | Thiết bị mobile: Android Chrome | Thiết bị Android thật | Luồng video chat hoạt động |
| TC-MAN-022 | Cài đặt | Thủ công | Thủ công | Đổi mật khẩu qua Clerk | User trên settings/security | Modal Clerk mở; đổi mật khẩu hoàn tất |
| TC-MAN-023 | Cài đặt | Thủ công | Thủ công | Danh sách phiên đang hoạt động | User có nhiều phiên | Phiên được liệt kê; thu hồi hoạt động |
| TC-MAN-024 | Hồ sơ | Thủ công | Thủ công | Trường hợp biên xác thực chỉnh sửa hồ sơ | User trên hồ sơ, input không hợp lệ | Thông báo xác thực đúng; không lưu không hợp lệ |
| TC-MAN-025 | UX | Thủ công | Thủ công | Khám phá: hành trình user đầy đủ | User mới | Sign-up, hồ sơ, cuộc gọi đầu, yêu thích, tiến độ; không có chặn |

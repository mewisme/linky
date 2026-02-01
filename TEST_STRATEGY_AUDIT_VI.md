# Kiểm toán Chiến lược Kiểm thử LINKY

## 1. Tổng quan Dự án (Góc độ Kiểm thử)

### Loại Hệ thống

LINKY là hệ thống **thời gian thực**, **có trạng thái** và **phân tán**:

- **Thời gian thực**: Socket.IO cho ghép cặp và tín hiệu; WebRTC cho media peer-to-peer; MQTT cho presence. Sự kiện phụ thuộc thời gian và thứ tự.
- **Có trạng thái**: Redis lưu hàng đợi ghép cặp, presence và cache ngắn hạn. Phòng trong bộ nhớ theo dõi cuộc gọi đang hoạt động. Kích hoạt phiên giới hạn một phiên hoạt động mỗi người dùng.
- **Phân tán**: Backend (Express), frontend (Next.js), Redis, Supabase, MQTT broker, S3, Clerk. Nhiều thành phần phải nhất quán.

### Rủi ro Kỹ thuật Chính Ảnh hưởng Kiểm thử

| Rủi ro | Tác động | Giảm thiểu |
|--------|----------|------------|
| WebRTC yêu cầu thiết bị media thật hoặc giả | Tự động hóa không thể xác minh chất lượng video/âm thanh thực tế | Dùng thiết bị giả trong CI; kiểm thử thủ công thiết bị thật |
| Hộp thoại quyền trình duyệt (camera/mic) | Không thể tự động hóa đáng tin cậy trên mọi trình duyệt | Cấp quyền trước hoặc dùng thiết bị giả; kiểm thử thủ công luồng từ chối |
| Định thời Socket.IO + Redis + ghép cặp | Điều kiện đua, ghép cặp không ổn định | Unit test logic; integration test với định thời kiểm soát |
| Vô hiệu hóa cache khi ghi | Dữ liệu cũ nếu vô hiệu hóa thất bại | Unit test lệnh vô hiệu hóa; integration test cache + repo |
| Cập nhật presence MQTT vào Redis và admin sockets | Trạng thái presence có thể phân kỳ | Integration test MQTT handler; kiểm thử thủ công admin dashboard |
| Đồng bộ đa người dùng | Hai người dùng phải ghép cặp và đồng bộ | Tự động hóa với hai browser context; tránh >2 người dùng trong tự động hóa |
| Clerk auth (bên thứ ba) | Không thể khẳng định trên UI nội bộ Clerk | Kiểm tra trạng thái app trước/sau auth; loại trừ UI Clerk khỏi tự động hóa |
| Khoảng thời gian nền (ghép cặp, heartbeat) | Hiệu ứng phụ, không xác định | Integration test với test server; tránh unit test intervals |

---

## 2. Định nghĩa Cấp độ Kiểm thử

### Kiểm thử Đơn vị (Unit Test)

**Định nghĩa**: Kiểm thử một module hoặc hàm riêng lẻ với các phụ thuộc được mock (Supabase, Redis, Clerk, Ollama).

**Phù hợp khi**:
- Logic thuần túy (matcher, scoring, cosine similarity, level-from-exp, add-days).
- Logic service chỉ phụ thuộc repository được inject; repository được mock.
- Không có HTTP, Socket.IO hoặc trình duyệt.
- Xác định, nhanh, không I/O ngoài.

**Không phù hợp khi**: Nhiều thành phần tương tác, cần I/O thật, hoặc hiệu ứng phụ (intervals, sockets).

### Kiểm thử Tích hợp (Integration Test)

**Định nghĩa**: Kiểm thử nhiều thành phần cùng nhau (HTTP route + service + repository, Socket.IO handler + matchmaking + rooms, webhook + đồng bộ user) với thật hoặc test doubles.

**Phù hợp khi**:
- Xác minh luồng API route end-to-end trong backend.
- Xác minh socket handlers với Socket.IO client thật chống test server.
- Xác minh tính nhất quán cache + repository.
- Xác minh MQTT handler cập nhật Redis và emit tới admin sockets.

**Không phù hợp khi**: Logic thuần túy (dùng unit) hoặc luồng UI đầy đủ (dùng automation).

### Kiểm thử Tự động Giao diện (Automation UI Test)

**Định nghĩa**: Kiểm thử end-to-end trình duyệt bằng Playwright. Điều khiển UI thật, yêu cầu app chạy và test users.

**Phù hợp khi**:
- Luồng auth (sign-in, sign-up) loại trừ UI nội bộ Clerk.
- Luồng video chat: vào hàng đợi, ghép cặp, trong cuộc gọi, kết thúc, bỏ qua, tắt tiếng, camera, chat, yêu thích.
- Điều hướng, xác thực form, phản hồi toast.
- Kịch bản hai người dùng qua browser context riêng.

**Không phù hợp khi**: Chất lượng media WebRTC, hộp thoại quyền, cử chỉ kéo, hoặc UI modal nội bộ Clerk.

### Kiểm thử Thủ công (Manual Test)

**Định nghĩa**: Xác minh do con người thực hiện, không tự động hóa.

**Phù hợp khi**:
- Chất lượng video/âm thanh WebRTC, độ trễ, hành vi codec.
- Từ chối quyền camera/microphone, chuyển thiết bị, thiết bị đang dùng.
- Kéo video nổi, snap góc, hành vi PiP.
- Chỉ báo chất lượng kết nối dưới mạng thay đổi.
- Luồng admin dashboard yêu cầu thiết lập admin user.
- Kiểm thử khám phá, xác minh UX, chất lượng ghép cặp chủ quan.
- Tương thích đa thiết bị, đa trình duyệt.

**Không phù hợp khi**: Tự động hóa khả thi và đáng tin (vd: sign-in, ghép cặp, chat).

---

## 3. Kiểm toán Theo Từng Tính năng

### Vòng đời Xác thực Người dùng (loại trừ UI nội bộ Clerk)

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Sign-in (email, mật khẩu, lỗi), sign-up (xác thực, OTP), duy trì phiên, đăng xuất. Clerk xử lý UI; app tích hợp qua token và chuyển hướng. |
| **Cấp độ phù hợp** | Automation UI, Manual (2FA/MFA, phiên qua tab) |
| **Lý do** | Automation: luồng email/mật khẩu, thông báo lỗi, chuyển hướng là xác định. Manual: 2FA, MFA, phiên qua tab khó tự động hóa. Unit/Integration: logic auth ở Clerk; app chỉ tiêu thụ token. |

### Hồ sơ & Cài đặt Người dùng

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Trang hồ sơ (avatar, tên, bio, thông tin cá nhân, thẻ sở thích). Trang cài đặt. Cập nhật qua API. |
| **Cấp độ phù hợp** | Unit (services), Integration (API + service + repo), Automation UI (tải trang, submit form), Manual (UX, trường hợp biên xác thực) |
| **Lý do** | Unit: profile/settings services với repo mock. Integration: luồng API đầy đủ. Automation: cần auth; luồng form có thể tự động. Manual: xác minh trực quan, xác thực phức tạp. |

### Thẻ Sở thích (Interest Tags)

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Người dùng chọn thẻ sở thích trên hồ sơ. Admin CRUD thẻ sở thích. Thẻ ảnh hưởng điểm ghép cặp. |
| **Cấp độ phù hợp** | Unit (scoring, logic thẻ), Integration (API, admin routes), Automation UI (chọn thẻ user nếu có), Manual (CRUD admin, import) |
| **Lý do** | Unit: scoring dùng thẻ. Integration: admin interest-tags routes. Automation: chọn thẻ hồ sơ user nếu có selector ổn định. Manual: luồng admin, import JSON. |

### Yêu thích (Favorites)

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Thêm/xóa yêu thích trong cuộc gọi (sự kiện socket). Trang danh sách yêu thích. Yêu thích ảnh hưởng điểm ghép cặp. |
| **Cấp độ phù hợp** | Unit (scoring với favorites), Integration (API favorites), Automation UI (thêm/xóa trong cuộc gọi, trang danh sách) |
| **Lý do** | Unit: scoring service với trọng số favorite. Integration: API CRUD favorites. Automation: thêm/xóa trong cuộc gọi và trang danh sách có thể tự động. Manual: không cần nếu automation bao phủ. |

### Logic Ghép cặp (Redis, Scoring, Fallback)

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Hàng đợi Redis, enqueue/dequeue, tryMatch. Scoring: sở thích chung, bonus công bằng, cooldown bỏ qua. Fallback deadlock khi chỉ hai người và cả hai đã bỏ qua. |
| **Cấp độ phù hợp** | Unit, Integration |
| **Lý do** | Unit: matcher, scoring là logic thuần; redis-matchmaking với Redis mock. Integration: Redis thật + vòng ghép cặp. Automation: luồng ghép cặp ở cấp UI; logic backend kiểm thử riêng. |

### Vòng đời Cuộc gọi Video

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Vào hàng đợi, trạng thái đang tìm, ghép cặp, trong cuộc gọi (container video, timer), kết thúc, bỏ qua, ngắt kết nối. Tạo phòng, heartbeat, dọn dẹp. |
| **Cấp độ phù hợp** | Unit (rooms, sessions, call-history services), Integration (socket handlers + matchmaking + rooms), Automation UI (luồng đầy đủ với hai người dùng) |
| **Lý do** | Unit: rooms, sessions, call-history với mock. Integration: socket + matchmaking. Automation: luồng hai context từ idle đến in-call đến end/skip. Manual: chỉ chất lượng media. |

### Điều khiển Media (Camera, Mic, Tắt tiếng, Chuyển)

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Bật/tắt tiếng âm thanh, bật/tắt camera. Sự kiện socket tới peer. UI phản ánh trạng thái. |
| **Cấp độ phù hợp** | Automation UI, Manual (hành vi media thực tế) |
| **Lý do** | Automation: nút bật/tắt, trạng thái UI (chỉ báo tắt tiếng/tắt camera) là xác định. Manual: truyền âm thanh/video thực tế, chuyển thiết bị. |

### Hành vi Video Nổi / PiP

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Overlay kéo được cho video local. Snap góc. Kích thước/vị trí overlay mobile. |
| **Cấp độ phù hợp** | Manual |
| **Lý do** | Cử chỉ kéo và snap góc không đáng tin trong Playwright. Cần xác minh thủ công. |

### Tin nhắn Chat

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Mở/đóng sidebar, gửi tin nhắn, nhận trên peer. Danh sách tin nhắn, timestamp. |
| **Cấp độ phù hợp** | Automation UI |
| **Lý do** | Tự động hóa hai context: gửi từ một, khẳng định trên cả hai. Xác định. Manual: không cần. |

### Chuỗi & Cấp độ (Streaks & Levels)

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Tính chuỗi, tiêu thụ freeze, cấp từ EXP, phần thưởng. Trang tiến độ hiển thị cấp, exp, chuỗi. |
| **Cấp độ phù hợp** | Unit (services), Integration (API + call-history progress), Automation UI (hiển thị trang progress) |
| **Lý do** | Unit: streak, level, reward services với repo mock. Integration: call-history áp dụng progress. Automation: trang progress có data-testids. Manual: trường hợp biên, UX. |

### Admin Dashboards

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Danh sách users, reports, interest tags, level rewards, streak bonuses, changelogs, visitors, embeddings. Routes chỉ admin. |
| **Cấp độ phù hợp** | Unit (admin services), Integration (admin routes), Automation UI (với admin user), Manual (khám phá, luồng phức tạp) |
| **Lý do** | Unit: services với mock. Integration: luồng admin API. Automation: khả thi với admin test user. Manual: embedding compare, find similar, bulk actions. |

### Công việc Nền & Làm mới Cache

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Interval ghép cặp (1s), dọn mục hết hạn (30s), heartbeat phòng (4s). TTL cache và vô hiệu hóa khi ghi. |
| **Cấp độ phù hợp** | Unit (logic dọn nếu tách được), Integration (intervals với test server) |
| **Lý do** | Unit: logic dọn với Redis mock. Integration: vòng interval đầy đủ. Automation/Manual: không áp dụng; chỉ backend. |

### Sự kiện Socket & MQTT

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Socket: join, skip, signal, chat-message, mute-toggle, video-toggle, reaction, favorite:notify-peer, end-call, resync, disconnect. MQTT: cập nhật presence vào Redis và admin sockets. |
| **Cấp độ phù hợp** | Unit (logic handler nếu tách được), Integration (socket + MQTT handlers) |
| **Lý do** | Unit: handler phức tạp có nhiều deps; một phần. Integration: Socket.IO client thật + MQTT handler. Automation: thực thi socket qua UI. Manual: không cần cho tính đúng sự kiện. |

### Luồng Khôi phục Lỗi & Kết nối lại

| Thuộc tính | Giá trị |
|------------|---------|
| **Mô tả** | Reload trang trong cuộc gọi kích hoạt resync. Ngắt kết nối peer kích hoạt end-call cho peer. Hàng đợi kích hoạt phiên khi nhiều tab. |
| **Cấp độ phù hợp** | Integration (resync handler), Automation UI (reload trang trong cuộc gọi) |
| **Lý do** | Integration: resync handler với rooms. Automation: reload trong cuộc gọi, khẳng định trở lại in-call. Manual: lỗi mạng, ngắt kết nối kéo dài. |

---

## 4. Ma trận Quyết định Tự động vs Thủ công

### Luồng KHÔNG NÊN Có Kiểm thử Thủ công (Tự động Đủ)

| Luồng | Lý do |
|-------|-------|
| Sign-in (email, mật khẩu, lỗi, thành công) | Xác định; Playwright xử lý form và chuyển hướng |
| Sign-up (xác thực, OTP, thành công) | Xác định; test users có sẵn |
| Vào hàng đợi, ghép cặp hai người, trong cuộc gọi | Tự động hóa hai context; không khẳng định chất lượng media |
| Kết thúc cuộc gọi, bỏ qua cuộc gọi | Xác định; cả hai trở về idle |
| Bật/tắt tiếng, bật/tắt camera | Trạng thái UI và sự kiện socket là xác định |
| Chat: gửi, nhận | Hai context; giao tin nhắn là xác định |
| Thêm/xóa yêu thích trong cuộc gọi | Toast và trạng thái nút là xác định |
| Kết nối lại (reload trang) | Reload và chờ in-call; xác định |
| Bố cục viewport mobile | Viewport Playwright; khẳng định bố cục |
| Trang danh sách yêu thích | API + UI; xác định |
| Trang tiến độ (cấp, exp, chuỗi) | data-testids có sẵn; xác định |

### Luồng KHÔNG NÊN Có Kiểm thử Tự động (Cần Thủ công)

| Luồng | Lý do |
|-------|-------|
| Chất lượng video/âm thanh WebRTC | Cần thiết bị thật; tự động hóa dùng thiết bị giả |
| Từ chối quyền camera/mic | Hộp thoại trình duyệt không thể tự động hóa đáng tin |
| Chuyển thiết bị (camera/mic) | UI chọn thiết bị phụ thuộc trình duyệt |
| Kéo video nổi và snap góc | Tự động hóa cử chỉ không đáng tin |
| Chỉ báo chất lượng kết nối | Phụ thuộc mạng; không xác định |
| Luồng 2FA / MFA | UI Clerk; dễ lỗi giữa môi trường |
| Admin embedding compare, find similar | Phức tạp, chỉ admin; chi phí thiết lập cao |
| Chất lượng ghép cặp (liên quan sở thích) | Chủ quan; không khẳng định tự động |
| Tương thích đa thiết bị, đa trình duyệt | Khám phá; ma trận thủ công |
| Duy trì phiên qua tab | Clerk + trạng thái app; xác minh thủ công |

### Luồng Có Cả Hai (Có lý do)

| Luồng | Automation | Manual | Lý do |
|-------|------------|--------|-------|
| Điều hướng admin dashboard | Có (với admin user) | Có (khám phá) | Automation cho smoke; manual cho luồng sâu |
| Chỉnh sửa hồ sơ, lưu | Có (submit form) | Có (UX, xác thực) | Automation cho happy path; manual cho trường hợp biên |
| Cài đặt, bảo mật | Có (tải trang) | Có (modal Clerk) | Automation cho điều hướng; manual cho UI Clerk |

---

## 5. Tổng kết Phủ sóng Theo Rủi ro

### Khu vực Rủi ro Cao

| Khu vực | Rủi ro | Độ sâu Kiểm thử |
|---------|--------|-----------------|
| Logic ghép cặp | Ghép sai, deadlock, bỏ qua cooldown | Unit: matcher, scoring. Integration: Redis + matchmaking |
| Vòng đời cuộc gọi video | Rò rỉ phòng, socket mồ côi, trạng thái không nhất quán | Unit: rooms, sessions. Integration: socket handlers. Automation: luồng đầy đủ |
| Call history + progress | Chuỗi/cấp/exp sai sau cuộc gọi | Unit: call-history, streak, level. Integration: luồng record |
| Vô hiệu hóa cache | Profile, progress, admin lists cũ | Unit: lệnh invalidate. Integration: cache + repo |
| Ngắt kết nối / resync socket | Peer không được thông báo, phòng không dọn | Integration: disconnect handler. Automation: reload |

### Khu vực Rủi ro Trung bình

| Khu vực | Rủi ro | Độ sâu Kiểm thử |
|---------|--------|-----------------|
| Tích hợp xác thực | Token không truyền, chuyển hướng sai | Automation: sign-in, sign-up |
| CRUD yêu thích | Thêm/xóa thất bại, danh sách cũ | Unit: scoring. Integration: API. Automation: in-call + danh sách |
| Reports | Tạo/cập nhật trạng thái sai | Unit: reports service. Integration: API |
| Admin routes | Truy cập trái phép, dữ liệu sai | Unit: admin services. Integration: admin API. Manual: luồng phức tạp |
| Presence MQTT | Trạng thái Redis/admin sai | Integration: MQTT handler |

### Khu vực Rủi ro Thấp

| Khu vực | Rủi ro | Độ sâu Kiểm thử |
|---------|--------|-----------------|
| Cosine similarity | Lỗi toán | Chỉ Unit |
| Level-from-exp, add-days | Lỗi suy dẫn | Chỉ Unit |
| Timezone helpers | Ngày sai | Chỉ Unit |
| Interest tags (chọn user) | Chỉ UI | Automation hoặc Manual |
| Changelogs, level rewards (admin) | CRUD | Unit + Integration |

### Ánh xạ Rủi ro sang Độ sâu Kiểm thử

| Mức Rủi ro | Unit | Integration | Automation | Manual |
|------------|------|-------------|------------|--------|
| Cao | Bắt buộc | Bắt buộc | Bắt buộc khi áp dụng | Cho media, quyền |
| Trung bình | Bắt buộc | Khuyến nghị | Bắt buộc cho luồng user | Cho luồng admin phức tạp |
| Thấp | Bắt buộc | Tùy chọn | Tùy chọn | Tùy chọn |

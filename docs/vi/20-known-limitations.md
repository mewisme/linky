# 20 -- Hạn chế đã biết

## Mục đích

Liệt kê hạn chế, nợ kỹ thuật, tính năng triển khai một phần và khả năng đã lên kế hoạch của nền tảng Linky.

## Phạm vi

Toàn bộ tài liệu đặc tả.

## Phụ thuộc

Mọi tài liệu trước.

---

## 1. Kiến trúc (A-01–A-04)

Phòng chỉ in-memory; restart mất cuộc gọi đang hoạt động. Khóa matchmaking in-process; không đồng bộ đa instance. Notification context theo server; đa server không gửi chéo. Quy tắc cô lập domain không enforce tĩnh.

---

## 2. Mở rộng (S-01–S-05)

Một container API. Socket.IO chưa dùng Redis adapter. Ollama một instance. Matchmaking giới hạn 50 candidate. DB không cấu hình connection pooling.

---

## 3. Bảo mật (X-01–X-06)

Service role bỏ qua RLS. Rate limit fail-open khi Redis lỗi. MQTT credential chung. Không quét nội dung chat/media. Phân quyền admin/superadmin một phần frontend. Signal WebRTC relay không validate nội dung.

---

## 4. Kinh tế (E-01–E-05)

Stabilizer chỉ giảm conversion bonus; không tự phục hồi deflation. Decay mùa không hoàn tác. RPC không idempotent. Timeout hàng đợi 5 phút hardcode. estimatedWaitSeconds luôn null.

---

## 5. Dữ liệu (D-01–D-05)

Không job dọn user xóa mềm. Không công cụ migration schema tự động. Chat snapshot tối đa 20 tin. Chỉ lỗi 410 mới xóa push subscription. Embedding không cache Redis.

---

## 6. Giám sát (M-01–M-03)

Log ra stdout; không kho log tập trung. Cảnh báo cấu hình ngoài code. Metric kinh tế chỉ theo ngày.

---

## 7. Frontend (F-01–F-04)

unstable_cache có thể đổi. Một socket manager theo context trình duyệt. Không offline support. Quy tắc lớp không enforce tĩnh.

---

## 8. Triển khai (P-01–P-05)

Không blue-green/canary. Không auto-scaling. Mạng Docker tạo thủ công. Chỉ prefix /v1. Không đặc tả OpenAPI.

---

## 9. Khoảng trống tính năng (G-01–G-07)

Chưa có: ghi hình cuộc gọi, gọi nhóm, chat lưu trữ lâu dài, chặn theo IP, gộp thông báo, tìm kiếm người dùng, xuất dữ liệu (GDPR).

---

## Thành phần liên quan

Mọi tài liệu trong bộ đặc tả.

## Rủi ro

Mỗi hạn chế cần đánh giá theo quy mô người dùng, yêu cầu audit bảo mật, tuân thủ (GDPR), SLO và nguồn lực kỹ thuật.

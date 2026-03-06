# 03 -- Hệ thống xác thực

## Mục đích

Mô tả kiến trúc xác thực và phân quyền của Linky: tích hợp Clerk, luồng xác minh JWT, đồng bộ webhook, chuỗi middleware và quản lý vai trò admin.

## Phạm vi

Xác thực cho HTTP, Socket.IO, kiểm soát truy cập admin và vòng đời người dùng qua webhook Clerk.

## Phụ thuộc

- [01-overview.md](01-overview.md), [02-architecture.md](02-architecture.md)

## Tham chiếu chéo

- [09-admin-system.md](09-admin-system.md), [11-security-model.md](11-security-model.md), [14-api-contracts.md](14-api-contracts.md)

---

## 1. Nhà cung cấp xác thực: Clerk

Linky dùng Clerk làm nhà cung cấp danh tính: đăng ký/đăng nhập, phiên và JWT, hồ sơ người dùng, webhook vòng đời.

Cấu hình backend: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`.

---

## 2. Luồng xác thực HTTP

Các route `/webhook`, `/api/v1/interest-tags`, `/api/v1/changelogs`, `/api/v1/matchmaking/queue-status`, `/healthz`, `/health`: không yêu cầu auth. Các route `/api/v1/*` còn lại: `clerkMiddleware` (trích Bearer token, verify JWT, gắn payload vào `req.auth`). Route `/api/v1/admin/*`: thêm `adminMiddleware` (kiểm tra admin qua Redis cache `admin:role:{clerkUserId}`, TTL 5 phút, fallback DB).

---

## 3. Xác thực Socket.IO

Namespace `/chat`: `socketAuthMiddleware` — token từ `handshake.auth.token` hoặc `handshake.query.token`, verify JWT Clerk, gắn userId, userName, userImageUrl vào `socket.data`. Namespace `/admin`: thêm `adminNamespaceAuthMiddleware` kiểm tra vai trò admin.

---

## 4. Webhook Clerk và vòng đời người dùng

`user.created`: tạo hoặc kích hoạt lại user trong Supabase; nếu email thuộc automation test thì xóa user khỏi Clerk. `user.updated`: cập nhật user, vô hiệu cache profile. `user.deleted`: xóa mềm (deleted=true, deleted_at); vô hiệu cache admin users. Xóa người dùng luôn là soft delete.

---

## 5. Frontend và quản lý token

Server action: `serverFetch(url, { token: true })` lấy token qua `getToken()` của Clerk. Query có cache: `withSentryQuery` dùng `unstable_cache` với key có userId. Socket: `createNamespaceSockets(token)`, `updateToken(socket, newToken)` khi token đổi, `destroySockets()` khi unmount.

---

## 6. Hệ thống vai trò Admin

Hai cấp: `admin` và `superadmin`. Lưu trong `users.role`, cache Redis 5 phút. Frontend: `isAdmin(role)`, `isSuperAdmin(role)` trong `shared/utils/roles.ts`.

---

## Thành phần liên quan

[09-admin-system.md](09-admin-system.md), [11-security-model.md](11-security-model.md), [12-database-schema.md](12-database-schema.md).

## Rủi ro

Luân chuyển secret JWT Clerk cần triển khai đồng bộ. Thay đổi vai trò admin có độ trễ tối đa 5 phút do cache. Endpoint webhook phải public, chỉ bảo vệ bằng chữ ký. User xóa mềm không có job dọn dẹp.

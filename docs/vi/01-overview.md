# 01 -- Tổng quan nền tảng

## Mục đích

Tài liệu này cung cấp tổng quan toàn diện về nền tảng Linky: mục đích nghiệp vụ, công nghệ sử dụng, cấu trúc monorepo, kiến trúc ứng dụng và bộ công cụ phát triển.

## Phạm vi

Bao phủ toàn bộ nền tảng từ thư mục gốc kho mã nguồn đến mọi workspace, package và ứng dụng.

## Phụ thuộc

Không. Đây là tài liệu nền tảng.

## Tham chiếu chéo

- [02-architecture.md](02-architecture.md) cho mô hình lớp chi tiết
- [17-deployment.md](17-deployment.md) cho cấu trúc hạ tầng

---

## 1. Mục đích nền tảng

Linky là nền tảng video chat thời gian thực cấp production, cho phép gọi video ngẫu nhiên peer-to-peer. Nền tảng kết hợp gọi video qua WebRTC với hệ thống tương tác gồm:

- Ghép cặp theo sở thích với embedding hồ sơ ngữ nghĩa
- Kinh tế coin ảo đầy đủ: ví, cửa hàng, boost, prestige và cơ chế mùa
- Hệ thống streak và tiến độ gắn với thời lượng gọi
- Thông báo thời gian thực qua Socket.IO và Web Push
- Theo dõi trạng thái người dùng qua MQTT
- Công cụ quản trị: kiểm duyệt nội dung, mô phỏng kinh tế, quản lý người dùng

Hệ thống được thiết kế cho triển khai production với quan sát (Sentry + Pino), tắt máy an toàn, giới hạn tốc độ và khả năng mở rộng ngang.

---

## 2. Công nghệ sử dụng

### Backend (apps/api)

| Thành phần | Công nghệ | Phiên bản/Chi tiết |
|------------|-----------|---------------------|
| Runtime | Node.js | 20+ |
| Framework | Express.js | TypeScript |
| Thời gian thực | Socket.IO | WebSocket, namespace `/chat` và `/admin` |
| Cơ sở dữ liệu | Supabase (Postgres) | Client service role, extension pgvector |
| Cache | Redis | 8-alpine, mô hình cache-aside |
| Xác thực | Clerk | Xác minh JWT, đồng bộ webhook |
| Embedding | Ollama | Mô hình nomic-embed-text:v1.5 |
| Lưu trữ | AWS S3 | Lưu file media, URL ký trước |
| Tin nhắn | MQTT | Trạng thái người dùng (online/offline) |
| WebRTC | Cloudflare TURN | Xuyên NAT cho kết nối peer |
| Push | Web Push (VAPID) | Thông báo push trình duyệt |
| Ghi log | Pino (@ws/logger) | Log cấu trúc JSON |
| Giám sát | Sentry | Theo dõi lỗi, hiệu năng |

### Frontend (apps/web)

| Thành phần | Công nghệ | Phiên bản/Chi tiết |
|------------|-----------|---------------------|
| Framework | Next.js | 16, App Router |
| Thư viện UI | React | 19 |
| Styling | Tailwind CSS | 4 |
| Thành phần | Radix UI + shadcn | Qua package @ws/ui |
| State | Zustand | Store phía client |
| Server state | TanStack React Query | Quản lý cache |
| Auth | Clerk (@clerk/nextjs) | Thành phần client + server |
| Icon | @tabler/icons-react | Bộ icon chính |
| Thời gian thực | Socket.IO Client | Kết nối WebSocket |
| Trạng thái | MQTT.js | Trạng thái online người dùng |
| Giám sát | Sentry (@sentry/nextjs) | Lỗi + hiệu năng |

### Package dùng chung

| Package | Đường dẫn | Mục đích |
|---------|-----------|----------|
| @ws/ui | packages/ui | Thư viện component Radix UI + shadcn |
| @ws/logger | packages/logger | Ghi log cấu trúc Pino |
| @ws/eslint-config | packages/eslint-config | Cấu hình ESLint dùng chung |
| @ws/typescript-config | packages/typescript-config | Cấu hình TypeScript dùng chung |

---

## 3. Cấu trúc Monorepo

Cấu trúc thư mục chính: `apps/api` (backend Express), `apps/web` (frontend Next.js), `packages/` (ui, logger, eslint-config, typescript-config). Chi tiết đầy đủ xem tài liệu tiếng Anh [en/01-overview.md](../en/01-overview.md).

---

## 4. Kiến trúc ứng dụng tóm tắt

Backend tuân theo thiết kế hướng domain: các domain không được import lẫn nhau; điều phối đa domain thực hiện qua lớp `contexts/`. Frontend tuân theo kiến trúc phân lớp với hướng phụ thuộc hướng vào trong: app → features → entities → shared → lib.

---

## 5. Lệnh phát triển

`pnpm dev` (tất cả app), `pnpm dev:api`, `pnpm dev:web`, `pnpm build`, `pnpm lint`, `pnpm check-types`, `pnpm format`. Kiểm thử: `cd apps/api && pnpm vitest run`, `pnpm test` (E2E Playwright).

---

## 6. Cấu hình môi trường

Backend đọc cấu hình từ biến môi trường qua `apps/api/src/config/index.ts`. Các nhóm: Server (PORT, NODE_ENV, CORS_ORIGIN), Clerk, Supabase, Redis, S3, MQTT, Cloudflare TURN, Ollama, VAPID, và các tham số tinh chỉnh (rate limit, timeout, shutdown, v.v.).

---

## Thành phần liên quan

Các tài liệu tiếp theo trong bộ đặc tả xây trên cấu trúc mô tả tại đây. Chi tiết triển khai Docker: [17-deployment.md](17-deployment.md). Mô hình bảo mật: [11-security-model.md](11-security-model.md).

## Rủi ro cần lưu ý

Nền tảng phụ thuộc nhiều dịch vụ bên ngoài (Clerk, Supabase, Cloudflare TURN), tạo ràng buộc nhà cung cấp. Ollama tự host cần tài nguyên GPU cho embedding ở quy mô lớn. Broker MQTT phải quản lý bên ngoài; không có broker tích hợp sẵn.

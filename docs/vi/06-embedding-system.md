# 06 -- Hệ thống embedding

## Mục đích

Mô tả hệ thống embedding hồ sơ ngữ nghĩa cho ghép cặp: pipeline tạo embedding, tích hợp Ollama, lưu vector, tính tương đồng và kích hoạt tái tạo.

## Phạm vi

Hạ tầng embedding (Ollama), xây dựng đầu vào, lưu trữ Supabase/pgvector, tính cosine similarity, quản lý embedding trong admin.

## Phụ thuộc

- [02-architecture.md](02-architecture.md), [05-matchmaking.md](05-matchmaking.md)

---

## 1. Kiến trúc

Thay đổi hồ sơ → scheduleEmbeddingRegeneration(userId) (setImmediate) → runEmbeddingJob: lấy profile, buildEmbeddingInput (bio, gender, age_bucket, interest_tags), hash SHA-256, so sánh source_hash; nếu giống thì bỏ qua; gọi Ollama embedText (nomic-embed-text:v1.5), upsert user_embeddings (embedding, model_name, source_hash).

---

## 2. Đầu vào và Ollama

Đầu vào: chuỗi "bio\n...\ngender\n...\nage_bucket\n...\ninterest_tags\n...". Chuẩn hóa: trim, lowercase; age_bucket từ date_of_birth. Ollama: timeout cấu hình (mặc định 60s), trả về { embedding, modelName } hoặc null. Lỗi không làm chết request; user không có embedding vẫn ghép cặp được (điểm embedding = 0).

---

## 3. Lưu trữ và tương đồng

Bảng user_embeddings: user_id, embedding (vector), model_name, source_hash. getOrSet không dùng cho embedding; matchmaking load trực tiếp từ DB. Cosine similarity: dotProduct/(normA*normB), clamp [-1,1]. Matchmaking: load batch embedding, tính similarity từng cặp, embeddingScore = similarity * 25 (nếu >= 0.3).

---

## 4. Admin embedding

Sync một user, sync tất cả, so sánh hai user, tìm user tương tự (RPC find_similar_users_by_embedding).

---

## Thành phần liên quan

[05-matchmaking.md](05-matchmaking.md), [09-admin-system.md](09-admin-system.md), [12-database-schema.md](12-database-schema.md).

## Rủi ro

Ollama chạy container riêng; sự cố thì không tạo embedding mới (embedding cũ vẫn dùng). Không cache embedding trên Redis; mỗi chu kỳ match đều đọc DB. sync-all tốn tài nguyên khi số user lớn.

# 15 -- Server Actions

## Mục đích

Danh mục server action Next.js: chiến lược cache, kích hoạt revalidation và instrumentation Sentry.

## Phạm vi

Thư mục apps/web/src/actions/ và mẫu withSentryAction/withSentryQuery.

## Phụ thuộc

- [14-api-contracts.md](14-api-contracts.md)

---

## Mẫu

Mutation: withSentryAction("tên", () => serverFetch(...) + revalidateTag(tag)). Query: withSentryQuery("tên", (token) => serverFetch(..., { preloadedToken: token }), { keyParts, tags }).

---

## Danh mục (tóm tắt)

Matchmaking: getQueueStatus (query, tag matchmaking). Call history: getCallHistory, getCallHistoryById (query, tag call-history). Favorites: getFavorites (query), addFavorite, removeFavorite (mutation, revalidate favorites). Reports: getMyReports (query), createReport (mutation, revalidate reports-me). Changelogs: getChangelogs (query, tag changelog). Interest tags: getInterestTags (query, tag interest-tags-public).

---

## Sentry và cache key

withSentryAction: bọc Sentry server action instrumentation. withSentryQuery: thêm unstable_cache, keyParts gồm userId (nếu có), tags để revalidate. Revalidation: sau mutation gọi revalidateTag → lần load sau fetch lại từ backend.

---

## Thành phần liên quan

[14-api-contracts.md](14-api-contracts.md), [10-caching-architecture.md](10-caching-architecture.md), [16-observability.md](16-observability.md).

## Rủi ro

unstable_cache có thể đổi trong phiên bản Next.js sau. Key cache phụ thuộc userId; lỗi auth có thể dùng chung entry. Revalidation theo tag có thể vô hiệu nhiều entry cùng lúc.

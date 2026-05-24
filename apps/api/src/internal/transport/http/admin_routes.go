package routes

import (
	"github.com/labstack/echo/v4"

	"linky-api/src/internal/logger"
)

func registerAdminRoutes(g *echo.Group) {
	g.GET("/config", handleAdminConfigList)
	g.GET("/config/:key", handleAdminConfigGet)
	g.POST("/config", handleAdminConfigPost)
	g.PATCH("/config/:key", handleAdminConfigUpsert)
	g.DELETE("/config/:key", handleAdminConfigDelete)

	g.GET("/ai/config", handleAdminAIConfigGet)
	g.PUT("/ai/config", handleAdminAIConfigPut)
	g.GET("/ai/models", handleAdminAIModelsList)

	g.GET("/users", handleAdminUserList)
	g.GET("/users/:id", handleAdminUserGet)
	g.PUT("/users/:id", handleAdminUserPut)
	g.PATCH("/users/:id", handleAdminUserPatch)
	g.PATCH("/users/batch", handleAdminUserBatchPatch)
	g.DELETE("/users/batch", handleAdminUserBatchDelete)
	g.DELETE("/users/:id", handleAdminUserSoftDelete)

	registerAdminClerkUserRoutes(g)

	registerAdminCRUD(g, "/interest-tags", "interest_tags")
	registerAdminCRUD(g, "/exp-bonuses", "exp_bonuses", refreshExpBonusesAfterAdminMutate)
	registerAdminCRUD(g, "/video-filter-presets", "video_filter_presets")

	g.GET("/broadcasts", handleAdminBroadcastsList)
	g.POST("/broadcasts", handleAdminBroadcastsCreate)
	g.POST("/broadcasts/ai-generate", handleAdminBroadcastAIGenerate)

	g.POST("/interest-tags/import", handleAdminImportInterestTags)
	g.DELETE("/interest-tags/:id/hard", handleAdminInterestTagHardDelete)

	g.GET("/embeddings", handleAdminEmbeddings)
	g.POST("/embeddings/regenerate", handleAdminEmbeddingsRegenerate)
	g.POST("/embeddings/sync", handleAdminEmbeddingsSync)
	g.POST("/embeddings/sync-all", handleAdminEmbeddingsSyncAll)
	g.POST("/embeddings/compare", handleAdminEmbeddingsCompare)
	g.POST("/embeddings/similar", handleAdminEmbeddingsSimilar)

	g.POST("/s3/presign-upload", handleAdminS3PresignUpload)
	g.POST("/s3/presign-download", handleAdminS3PresignDownload)
	g.POST("/s3/delete", handleAdminS3Delete)
	g.GET("/s3/presigned/upload", handleAdminS3PresignUploadGET)
	g.GET("/s3/presigned/download", handleAdminS3PresignDownloadGET)
	g.GET("/s3/objects", handleAdminS3ListObjects)
	g.DELETE("/s3/objects/:key", handleAdminS3DeleteObject)
	g.POST("/s3/multipart/start", handleAdminS3MultipartStart)
	g.GET("/s3/multipart/:uploadId/part/:partNumber", handleAdminS3MultipartSignPart)
	g.POST("/s3/multipart/complete", handleAdminS3MultipartComplete)
	g.POST("/s3/multipart/abort", handleAdminS3MultipartAbort)

	g.GET("/reports", handleAdminReportsList)
	g.GET("/reports/:id", handleAdminReportGet)
	g.PATCH("/reports/:id", handleAdminReportPatch)
	g.POST("/reports/:id/ai-summary", handleAdminReportAISummary)
	g.POST("/reports/:id/ai-summary:generate", handleAdminReportAISummary)
}

var adminLog = logger.New("routes:admin")

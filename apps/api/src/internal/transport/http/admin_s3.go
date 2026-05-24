package routes

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"

	"linky-api/src/internal/httpx"
)

func handleAdminS3PresignUpload(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key         string `json:"key"`
		ContentType string `json:"contentType"`
		Expires     int    `json:"expires"`
	}
	_ = json.Unmarshal(rawBody, &input)
	url, fields, err := s3PresignUpload(c.Request().Context(), input.Key, input.ContentType, input.Expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url, "fields": fields})
}

func handleAdminS3PresignDownload(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key     string `json:"key"`
		Expires int    `json:"expires"`
	}
	_ = json.Unmarshal(rawBody, &input)
	url, err := s3PresignDownload(c.Request().Context(), input.Key, input.Expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url})
}

func handleAdminS3Delete(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key string `json:"key"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if err := s3Delete(c.Request().Context(), input.Key); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_DELETE_FAIL", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func handleAdminS3PresignUploadGET(c echo.Context) error {
	key := c.QueryParam("key")
	expires := atoiDefault(c.QueryParam("expires"), 600)
	contentType := c.QueryParam("contentType")
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_KEY_REQUIRED", "s3KeyRequired", "key is required"))
	}
	url, fields, err := s3PresignUpload(c.Request().Context(), key, contentType, expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url, "fields": fields})
}

func handleAdminS3PresignDownloadGET(c echo.Context) error {
	key := c.QueryParam("key")
	expires := atoiDefault(c.QueryParam("expires"), 600)
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_KEY_REQUIRED", "s3KeyRequired", "key is required"))
	}
	url, err := s3PresignDownload(c.Request().Context(), key, expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url})
}

func handleAdminS3ListObjects(c echo.Context) error {
	prefix := c.QueryParam("prefix")
	objs, err := s3ListObjects(c.Request().Context(), prefix)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_LIST_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"objects": objs})
}

func handleAdminS3DeleteObject(c echo.Context) error {
	key := c.Param("key")
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_KEY_REQUIRED", "s3KeyRequired", "key is required"))
	}
	if err := s3Delete(c.Request().Context(), key); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_DELETE_FAIL", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func handleAdminS3MultipartStart(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key         string `json:"key"`
		ContentType string `json:"contentType"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.Key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_KEY_REQUIRED", "s3KeyRequired", "key is required"))
	}
	uploadID, err := s3CreateMultipart(c.Request().Context(), input.Key, input.ContentType)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_MULTIPART_INIT_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"uploadId": uploadID, "key": input.Key})
}

func handleAdminS3MultipartSignPart(c echo.Context) error {
	uploadID := c.Param("uploadId")
	partNumber, _ := atoiAny(c.Param("partNumber"))
	key := c.QueryParam("key")
	expires := atoiDefault(c.QueryParam("expires"), 3600)
	if key == "" || uploadID == "" || partNumber <= 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_PART_INVALID", "s3PartInvalid", "key, uploadId and partNumber are required"))
	}
	url, err := s3PresignPart(c.Request().Context(), key, uploadID, partNumber, expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url})
}

func handleAdminS3MultipartComplete(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key      string          `json:"key"`
		UploadID string          `json:"uploadId"`
		Parts    []multipartPart `json:"parts"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.Key == "" || input.UploadID == "" || len(input.Parts) == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_COMPLETE_INVALID", "s3CompleteInvalid", "key, uploadId and parts are required"))
	}
	if err := s3CompleteMultipart(c.Request().Context(), input.Key, input.UploadID, input.Parts); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_COMPLETE_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"key": input.Key})
}

func handleAdminS3MultipartAbort(c echo.Context) error {
	rawBody, _ := io.ReadAll(c.Request().Body)
	var input struct {
		Key      string `json:"key"`
		UploadID string `json:"uploadId"`
	}
	_ = json.Unmarshal(rawBody, &input)
	if input.Key == "" || input.UploadID == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_ABORT_INVALID", "s3AbortInvalid", "key and uploadId are required"))
	}
	if err := s3AbortMultipart(c.Request().Context(), input.Key, input.UploadID); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_ABORT_FAIL", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func atoiDefault(v string, def int) int {
	n, ok := atoiAny(v)
	if !ok {
		return def
	}
	return n
}

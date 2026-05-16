package routes

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"

	"github.com/labstack/echo/v4"

	"linky-api/src-go/internal/config"
	"linky-api/src-go/internal/httpx"
)

var s3Cfg *config.Config
var s3Client *s3.Client
var s3Presigner *s3.PresignClient

func InitS3(c *config.Config) error {
	s3Cfg = c
	if c.S3Region == "" || c.S3Bucket == "" || c.S3AccessKeyID == "" || c.S3SecretAccessKey == "" {
		return nil
	}
	cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(c.S3Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(c.S3AccessKeyID, c.S3SecretAccessKey, "")),
	)
	if err != nil {
		return err
	}
	s3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		if c.S3Endpoint != "" {
			o.BaseEndpoint = aws.String(c.S3Endpoint)
			o.UsePathStyle = true
		}
	})
	s3Presigner = s3.NewPresignClient(s3Client)
	return nil
}

func s3PresignUpload(ctx context.Context, key, contentType string, expires int) (string, map[string]string, error) {
	if s3Cfg == nil || s3Cfg.S3Bucket == "" {
		return "", nil, errors.New("s3 not configured")
	}
	if s3Presigner == nil {
		return "", nil, errors.New("s3 presigner not initialized")
	}
	if key == "" {
		return "", nil, errors.New("key required")
	}
	if expires <= 0 {
		expires = 600
	}
	dur := time.Duration(expires) * time.Second
	put, err := s3Presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s3Cfg.S3Bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(dur))
	if err != nil {
		return "", nil, err
	}
	fields := map[string]string{}
	if contentType != "" {
		fields["Content-Type"] = contentType
	}
	return put.URL, fields, nil
}

func s3PresignDownload(ctx context.Context, key string, expires int) (string, error) {
	if s3Cfg == nil || s3Cfg.S3Bucket == "" {
		return "", errors.New("s3 not configured")
	}
	if s3Presigner == nil {
		return "", errors.New("s3 presigner not initialized")
	}
	if key == "" {
		return "", errors.New("key required")
	}
	if expires <= 0 {
		expires = 600
	}
	dur := time.Duration(expires) * time.Second
	get, err := s3Presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s3Cfg.S3Bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(dur))
	if err != nil {
		return "", err
	}
	return get.URL, nil
}

func s3Delete(ctx context.Context, key string) error {
	if s3Client == nil {
		return errors.New("s3 client not initialized")
	}
	if key == "" {
		return errors.New("key required")
	}
	_, err := s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s3Cfg.S3Bucket),
		Key:    aws.String(key),
	})
	return err
}

func s3CreateMultipart(ctx context.Context, key, contentType string) (string, error) {
	if s3Client == nil {
		return "", errors.New("s3 client not initialized")
	}
	out, err := s3Client.CreateMultipartUpload(ctx, &s3.CreateMultipartUploadInput{
		Bucket:      aws.String(s3Cfg.S3Bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", err
	}
	if out.UploadId == nil {
		return "", errors.New("no upload id returned")
	}
	return *out.UploadId, nil
}

func s3PresignPart(ctx context.Context, key, uploadID string, partNumber int, expires int) (string, error) {
	if s3Presigner == nil {
		return "", errors.New("s3 presigner not initialized")
	}
	if expires <= 0 {
		expires = 3600
	}
	dur := time.Duration(expires) * time.Second
	out, err := s3Presigner.PresignUploadPart(ctx, &s3.UploadPartInput{
		Bucket:     aws.String(s3Cfg.S3Bucket),
		Key:        aws.String(key),
		UploadId:   aws.String(uploadID),
		PartNumber: aws.Int32(int32(partNumber)),
	}, s3.WithPresignExpires(dur))
	if err != nil {
		return "", err
	}
	return out.URL, nil
}

func s3CompleteMultipart(ctx context.Context, key, uploadID string, parts []multipartPart) error {
	if s3Client == nil {
		return errors.New("s3 client not initialized")
	}
	completed := make([]s3types.CompletedPart, 0, len(parts))
	for _, p := range parts {
		num := int32(p.PartNumber)
		etag := p.ETag
		completed = append(completed, s3types.CompletedPart{
			ETag:       &etag,
			PartNumber: &num,
		})
	}
	_, err := s3Client.CompleteMultipartUpload(ctx, &s3.CompleteMultipartUploadInput{
		Bucket:          aws.String(s3Cfg.S3Bucket),
		Key:             aws.String(key),
		UploadId:        aws.String(uploadID),
		MultipartUpload: &s3types.CompletedMultipartUpload{Parts: completed},
	})
	return err
}

func s3AbortMultipart(ctx context.Context, key, uploadID string) error {
	if s3Client == nil {
		return errors.New("s3 client not initialized")
	}
	_, err := s3Client.AbortMultipartUpload(ctx, &s3.AbortMultipartUploadInput{
		Bucket:   aws.String(s3Cfg.S3Bucket),
		Key:      aws.String(key),
		UploadId: aws.String(uploadID),
	})
	return err
}

type multipartPart struct {
	PartNumber int    `json:"partNumber"`
	ETag       string `json:"etag"`
}

func registerMyS3Routes(g *echo.Group) {
	g.POST("/presign-upload", handleMyPresignUpload)
	g.POST("/multipart/initiate", handleMultipartInitiate)
	g.POST("/multipart/sign-part", handleMultipartSignPart)
	g.POST("/multipart/complete", handleMultipartComplete)
	g.POST("/multipart/abort", handleMultipartAbort)
}

func userKeyPrefix(c echo.Context, key string) string {
	uid := httpx.MustClerkUserID(c)
	if uid == "" {
		return ""
	}
	return "users/" + sanitizeKey(uid) + "/" + sanitizeKey(strings.TrimPrefix(key, "/"))
}

func sanitizeKey(k string) string {
	k = strings.TrimSpace(k)
	k = strings.TrimPrefix(k, "/")
	if strings.Contains(k, "..") {
		return strings.ReplaceAll(k, "..", "_")
	}
	return k
}

func handleMyPresignUpload(c echo.Context) error {
	body, err := readBody(c)
	if err != nil {
		return err
	}
	key, _ := body["key"].(string)
	contentType, _ := body["contentType"].(string)
	expires, _ := atoiAny(body["expires"])
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_KEY_REQUIRED", "s3KeyRequired", "key is required"))
	}
	scoped := userKeyPrefix(c, key)
	if scoped == "" {
		return httpx.Unauthorized(c)
	}
	url, fields, err := s3PresignUpload(c.Request().Context(), scoped, contentType, expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url, "fields": fields, "key": scoped})
}

func handleMultipartInitiate(c echo.Context) error {
	body, err := readBody(c)
	if err != nil {
		return err
	}
	key, _ := body["key"].(string)
	contentType, _ := body["contentType"].(string)
	if key == "" {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_KEY_REQUIRED", "s3KeyRequired", "key is required"))
	}
	scoped := userKeyPrefix(c, key)
	uploadID, err := s3CreateMultipart(c.Request().Context(), scoped, contentType)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_MULTIPART_INIT_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"uploadId": uploadID, "key": scoped})
}

func handleMultipartSignPart(c echo.Context) error {
	body, err := readBody(c)
	if err != nil {
		return err
	}
	key, _ := body["key"].(string)
	uploadID, _ := body["uploadId"].(string)
	partNumber, _ := atoiAny(body["partNumber"])
	expires, _ := atoiAny(body["expires"])
	if key == "" || uploadID == "" || partNumber <= 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_PART_INVALID", "s3PartInvalid", "key, uploadId and partNumber are required"))
	}
	if !strings.HasPrefix(key, "users/") {
		return httpx.SendError(c, 403, "Forbidden",
			httpx.UM("S3_KEY_NOT_OWNED", "s3KeyNotOwned", "Cannot sign for unscoped key"))
	}
	url, err := s3PresignPart(c.Request().Context(), key, uploadID, partNumber, expires)
	if err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_PRESIGN_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"url": url})
}

func handleMultipartComplete(c echo.Context) error {
	body, err := readBody(c)
	if err != nil {
		return err
	}
	key, _ := body["key"].(string)
	uploadID, _ := body["uploadId"].(string)
	partsRaw, _ := body["parts"].([]any)
	if key == "" || uploadID == "" || len(partsRaw) == 0 {
		return httpx.SendError(c, 400, "Bad Request",
			httpx.UM("S3_COMPLETE_INVALID", "s3CompleteInvalid", "key, uploadId and parts are required"))
	}
	parts := make([]multipartPart, 0, len(partsRaw))
	for _, p := range partsRaw {
		obj, _ := p.(map[string]any)
		if obj == nil {
			continue
		}
		num, _ := atoiAny(obj["partNumber"])
		etag, _ := obj["etag"].(string)
		if etag == "" {
			etag, _ = obj["ETag"].(string)
		}
		parts = append(parts, multipartPart{PartNumber: num, ETag: etag})
	}
	if err := s3CompleteMultipart(c.Request().Context(), key, uploadID, parts); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_COMPLETE_FAIL", err.Error()))
	}
	return c.JSON(http.StatusOK, map[string]any{"key": key})
}

func handleMultipartAbort(c echo.Context) error {
	body, err := readBody(c)
	if err != nil {
		return err
	}
	key, _ := body["key"].(string)
	uploadID, _ := body["uploadId"].(string)
	if err := s3AbortMultipart(c.Request().Context(), key, uploadID); err != nil {
		return httpx.SendError(c, 500, "Internal Server Error",
			httpx.UMDetail("S3_ABORT_FAIL", err.Error()))
	}
	return c.NoContent(http.StatusNoContent)
}

func readBody(c echo.Context) (map[string]any, error) {
	var body map[string]any
	if err := c.Bind(&body); err != nil {
		return nil, httpx.SendError(c, 400, "Bad Request", httpx.UMDetail("INVALID_BODY", err.Error()))
	}
	if body == nil {
		body = map[string]any{}
	}
	return body, nil
}

func atoiAny(v any) (int, bool) {
	switch x := v.(type) {
	case float64:
		return int(x), true
	case int:
		return x, true
	case string:
		n, err := strconv.Atoi(x)
		return n, err == nil
	}
	return 0, false
}

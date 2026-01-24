import type { S3API } from "@/types/api.types";
import { client } from "@/lib/client";

export async function getUploadUrl(
  params: S3API.GetUploadUrl.QueryParams,
  token: string
): Promise<S3API.GetUploadUrl.Response> {
  const data = await client.get<S3API.GetUploadUrl.Response>("/api/media/s3/presigned/upload", {
    params: { ...params } as Record<string, string | number | boolean | undefined>,
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function getDownloadUrl(
  params: S3API.GetDownloadUrl.QueryParams,
  token: string
): Promise<S3API.GetDownloadUrl.Response> {
  const data = await client.get<S3API.GetDownloadUrl.Response>("/api/media/s3/presigned/download", {
    params: { ...params } as Record<string, string | number | boolean | undefined>,
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function listObjects(
  params: S3API.ListObjects.QueryParams,
  token: string
): Promise<S3API.ListObjects.Response> {
  const data = await client.get<S3API.ListObjects.Response>("/api/media/s3/objects", {
    params: { ...params } as Record<string, string | number | boolean | undefined>,
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function deleteObject(
  key: string,
  token: string
): Promise<S3API.DeleteObject.Response> {
  const encodedKey = encodeURIComponent(key);
  const data = await client.delete<S3API.DeleteObject.Response>(
    `/api/media/s3/objects/${encodedKey}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function uploadToS3(presignedUrl: string, file: File | Blob): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error(await res.text() || res.statusText);
}

export async function uploadFile(file: File | Blob, key: string, token: string): Promise<string> {
  const { url } = await getUploadUrl({ key, expires: 300 }, token);
  await uploadToS3(url, file);
  return key;
}

export async function startMultipartUpload(
  body: S3API.StartMultipart.Body,
  token: string
): Promise<S3API.StartMultipart.Response> {
  const data = await client.post<S3API.StartMultipart.Response>(
    "/api/media/s3/multipart/start",
    body,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function getPartUploadUrl(
  uploadId: string,
  partNumber: number,
  params: S3API.GetPartUploadUrl.QueryParams,
  token: string
): Promise<S3API.GetPartUploadUrl.Response> {
  const data = await client.get<S3API.GetPartUploadUrl.Response>(
    `/api/media/s3/multipart/${uploadId}/part/${partNumber}`,
    { params: { ...params } as Record<string, string | number | boolean | undefined>, headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function completeMultipartUpload(
  body: S3API.CompleteMultipart.Body,
  token: string
): Promise<S3API.CompleteMultipart.Response> {
  const data = await client.post<S3API.CompleteMultipart.Response>(
    "/api/media/s3/multipart/complete",
    body,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function abortMultipartUpload(
  body: S3API.AbortMultipart.Body,
  token: string
): Promise<S3API.AbortMultipart.Response> {
  const data = await client.post<S3API.AbortMultipart.Response>(
    "/api/media/s3/multipart/abort",
    body,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

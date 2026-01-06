import type { S3API } from "@/types/api.types";
import axios from "axios";
import { client } from "../client";

export async function getUploadUrl(
  params: S3API.GetUploadUrl.QueryParams
): Promise<S3API.GetUploadUrl.Response> {
  const response = await client.get<S3API.GetUploadUrl.Response>("/api/v1/s3/presigned/upload", {
    params,
  });
  return response.data;
}

export async function getDownloadUrl(
  params: S3API.GetDownloadUrl.QueryParams
): Promise<S3API.GetDownloadUrl.Response> {
  const response = await client.get<S3API.GetDownloadUrl.Response>("/api/v1/s3/presigned/download", {
    params,
  });
  return response.data;
}

export async function listObjects(
  params?: S3API.ListObjects.QueryParams
): Promise<S3API.ListObjects.Response> {
  const response = await client.get<S3API.ListObjects.Response>("/api/v1/s3/objects", {
    params,
  });
  return response.data;
}

export async function deleteObject(key: string): Promise<S3API.DeleteObject.Response> {
  const encodedKey = encodeURIComponent(key);
  const response = await client.delete<S3API.DeleteObject.Response>(
    `/api/v1/s3/objects/${encodedKey}`
  );
  return response.data;
}

export async function uploadToS3(presignedUrl: string, file: File | Blob): Promise<void> {
  await axios.put(presignedUrl, file, {
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });
}

export async function uploadFile(file: File | Blob, key: string): Promise<string> {
  const { url } = await getUploadUrl({ key, expires: 300 });

  await uploadToS3(url, file);

  return key;
}

export async function startMultipartUpload(
  body: S3API.StartMultipart.Body
): Promise<S3API.StartMultipart.Response> {
  const response = await client.post<S3API.StartMultipart.Response>(
    "/api/v1/s3/multipart/start",
    body
  );
  return response.data;
}

export async function getPartUploadUrl(
  uploadId: string,
  partNumber: number,
  params: S3API.GetPartUploadUrl.QueryParams
): Promise<S3API.GetPartUploadUrl.Response> {
  const response = await client.get<S3API.GetPartUploadUrl.Response>(
    `/api/v1/s3/multipart/${uploadId}/part/${partNumber}`,
    { params }
  );
  return response.data;
}

export async function completeMultipartUpload(
  body: S3API.CompleteMultipart.Body
): Promise<S3API.CompleteMultipart.Response> {
  const response = await client.post<S3API.CompleteMultipart.Response>(
    "/api/v1/s3/multipart/complete",
    body
  );
  return response.data;
}

export async function abortMultipartUpload(
  body: S3API.AbortMultipart.Body
): Promise<S3API.AbortMultipart.Response> {
  const response = await client.post<S3API.AbortMultipart.Response>(
    "/api/v1/s3/multipart/abort",
    body
  );
  return response.data;
}


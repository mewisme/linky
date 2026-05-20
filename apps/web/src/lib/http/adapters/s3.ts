import type { S3API } from "@/shared/types/api.types";
import { apiUrl } from "@/lib/http/api-url";
import { deleteData, fetchData, postData } from "@/lib/http/client-api";

function withQuery<T>(url: string, params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null) q.set(k, String(v));
  const s = q.toString();
  return s ? `${url}?${s}` : url;
}

export async function getUploadUrl(
  params: S3API.GetUploadUrl.QueryParams,
  token: string
): Promise<S3API.GetUploadUrl.Response> {
  return fetchData<S3API.GetUploadUrl.Response>(
    withQuery(apiUrl.media.s3PresignedUpload(), { ...params }),
    { token }
  );
}

export async function getDownloadUrl(
  params: S3API.GetDownloadUrl.QueryParams,
  token: string
): Promise<S3API.GetDownloadUrl.Response> {
  return fetchData<S3API.GetDownloadUrl.Response>(
    withQuery(apiUrl.media.s3PresignedDownload(), { ...params }),
    { token }
  );
}

export async function listObjects(
  params: S3API.ListObjects.QueryParams,
  token: string
): Promise<S3API.ListObjects.Response> {
  return fetchData<S3API.ListObjects.Response>(
    withQuery(apiUrl.media.s3Objects(), { ...params }),
    { token }
  );
}

export async function deleteObject(
  key: string,
  token: string
): Promise<S3API.DeleteObject.Response> {
  return deleteData<S3API.DeleteObject.Response>(apiUrl.media.s3ObjectByKey(key), { token });
}

export async function uploadToS3(presignedUrl: string, file: File | Blob): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error(await res.text() || res.statusText);
}

export async function uploadToS3PostPolicy(
  url: string,
  fields: Record<string, string>,
  file: File | Blob
): Promise<void> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  form.append("file", file);
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text() || res.statusText);
}

export async function uploadFile(file: File | Blob, key: string, token: string): Promise<string> {
  const raw = await fetchData<{ url: string; fields?: Record<string, string> }>(
    withQuery(apiUrl.media.s3PresignedUpload(), { key, expires: 300 }),
    { token },
  );
  if (raw.fields && Object.keys(raw.fields).length > 0) {
    await uploadToS3PostPolicy(raw.url, raw.fields, file);
  } else {
    await uploadToS3(raw.url, file);
  }
  return key;
}

export async function startMultipartUpload(
  body: S3API.StartMultipart.Body,
  token: string
): Promise<S3API.StartMultipart.Response> {
  return postData<S3API.StartMultipart.Response>(apiUrl.media.s3MultipartStart(), {
    token,
    body,
  });
}

export async function getPartUploadUrl(
  uploadId: string,
  partNumber: number,
  params: S3API.GetPartUploadUrl.QueryParams,
  token: string
): Promise<S3API.GetPartUploadUrl.Response> {
  return fetchData<S3API.GetPartUploadUrl.Response>(
    withQuery(apiUrl.media.s3MultipartPart(uploadId, partNumber), { ...params }),
    { token }
  );
}

export async function completeMultipartUpload(
  body: S3API.CompleteMultipart.Body,
  token: string
): Promise<S3API.CompleteMultipart.Response> {
  return postData<S3API.CompleteMultipart.Response>(apiUrl.media.s3MultipartComplete(), {
    token,
    body,
  });
}

export async function abortMultipartUpload(
  body: S3API.AbortMultipart.Body,
  token: string
): Promise<S3API.AbortMultipart.Response> {
  return postData<S3API.AbortMultipart.Response>(apiUrl.media.s3MultipartAbort(), {
    token,
    body,
  });
}

import { apiUrl } from "@/lib/http/api-url";
import { postData } from "@/lib/http/client-api";
import { uploadToS3PostPolicy } from "@/lib/http/adapters/s3";

export type AdminPresignedIntent = "reward" | "feature";

export interface AdminPresignedUploadParams {
  intent: AdminPresignedIntent;
  content_type: string;
}

interface GoAdminPresignedUploadResponse {
  url: string;
  fields: Record<string, string>;
  key: string;
}

export interface AdminPresignedUploadResponse {
  upload_url: string;
  fields: Record<string, string>;
  resource_key: string;
  resource_type: "s3";
}

export async function getAdminPresignedUpload(
  params: AdminPresignedUploadParams,
  token: string
): Promise<AdminPresignedUploadResponse> {
  const raw = await postData<GoAdminPresignedUploadResponse>(apiUrl.admin.mediaPresignedUpload(), {
    token,
    body: params,
  });
  return {
    upload_url: raw.url,
    fields: raw.fields,
    resource_key: raw.key,
    resource_type: "s3",
  };
}

export async function uploadAdminMediaFile(
  presign: AdminPresignedUploadResponse,
  file: File | Blob
): Promise<string> {
  await uploadToS3PostPolicy(presign.upload_url, presign.fields, file);
  return presign.resource_key;
}

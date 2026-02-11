import { apiUrl } from "@/lib/api/fetch/api-url";
import { postData } from "@/lib/api/fetch/client-api";

export type AdminPresignedIntent = "reward" | "feature";

export interface AdminPresignedUploadParams {
  intent: AdminPresignedIntent;
  content_type: string;
}

export interface AdminPresignedUploadResponse {
  upload_url: string;
  resource_key: string;
  resource_type: "s3";
  expires_in: number;
}

export async function getAdminPresignedUpload(
  params: AdminPresignedUploadParams,
  token: string
): Promise<AdminPresignedUploadResponse> {
  return postData<AdminPresignedUploadResponse>(apiUrl.admin.mediaPresignedUpload(), {
    token,
    body: params,
  });
}

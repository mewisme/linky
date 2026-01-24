import { client } from "@/lib/client";

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
  const data = await client.post<AdminPresignedUploadResponse>(
    "/api/admin/media/presigned-upload",
    params,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return data;
}

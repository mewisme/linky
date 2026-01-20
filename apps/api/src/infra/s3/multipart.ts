import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  type CompletedPart,
} from "@aws-sdk/client-s3";
import { s3 } from "./client.js";

export async function startMultipart(
  bucket: string,
  key: string
): Promise<string> {
  const res = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  return res.UploadId!;
}

export async function getPartUploadUrl(
  bucket: string,
  key: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const { getSignedUrl } = await import(
    "@aws-sdk/s3-request-presigner"
  );

  return getSignedUrl(
    s3,
    new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: 600 }
  );
}

export async function completeMultipart(
  bucket: string,
  key: string,
  uploadId: string,
  parts: CompletedPart[]
): Promise<void> {
  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    })
  );
}

export async function abortMultipart(
  bucket: string,
  key: string,
  uploadId: string
): Promise<void> {
  await s3.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    })
  );
}


import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "./client.js";

export async function getUploadUrl(
  bucket: string,
  key: string,
  expires = 300
): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expires }
  );
}

export async function getDownloadUrl(
  bucket: string,
  key: string,
  expires = 300
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expires }
  );
}

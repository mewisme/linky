import { S3Client } from "@aws-sdk/client-s3";
import { config } from "../../config/index.js";

export const s3 = new S3Client({
  region: config.s3Region,
  endpoint: config.s3Endpoint,
  credentials: {
    accessKeyId: config.s3AccessKeyId,
    secretAccessKey: config.s3SecretAccessKey,
  },
  forcePathStyle: true
});


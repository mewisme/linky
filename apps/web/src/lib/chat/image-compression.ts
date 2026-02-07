import { defaultImageQuality, maxImageDimension } from "./attachment-limits";

import { blobToDataUrl } from "./blob-utils";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = src;
  });
}

export interface CompressedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  compressRatio: number;
}

export async function compressImageFile(
  file: File,
  options?: { quality?: number; maxDimension?: number }
): Promise<CompressedImageResult> {
  const quality = options?.quality ?? defaultImageQuality;
  const maxDimension = options?.maxDimension ?? maxImageDimension;
  const sourceUrl = await blobToDataUrl(file);
  const image = await loadImage(sourceUrl);

  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas not available.");
  }
  context.drawImage(image, 0, 0, width, height);

  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("Image compression failed."));
        }
      },
      mimeType,
      mimeType === "image/png" ? undefined : quality
    );
  });

  const dataUrl = await blobToDataUrl(blob);
  const compressRatio = file.size > 0 ? blob.size / file.size : 1;

  return {
    dataUrl,
    width,
    height,
    size: blob.size,
    mimeType,
    compressRatio,
  };
}

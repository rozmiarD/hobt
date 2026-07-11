export const PORTRAIT_MAX_BYTES = 2 * 1024 * 1024;
export const PORTRAIT_MAX_DIMENSION = 1200;

export class PortraitError extends Error {
  constructor(
    message: string,
    readonly code: "too_large" | "invalid_type" | "processing_failed",
  ) {
    super(message);
    this.name = "PortraitError";
  }
}

export async function processPortraitFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new PortraitError("Invalid file type.", "invalid_type");
  }
  if (file.size > PORTRAIT_MAX_BYTES) {
    throw new PortraitError("Image exceeds 2 MB.", "too_large");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const scale = Math.min(
    1,
    PORTRAIT_MAX_DIMENSION / Math.max(image.width, image.height),
  );
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new PortraitError("Could not process image.", "processing_failed");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.88);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new PortraitError("Could not read file.", "processing_failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new PortraitError("Could not load image.", "processing_failed"));
    image.src = src;
  });
}

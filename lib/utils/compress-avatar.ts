/**
 * Shrink a picked photo to a display-picture size before upload.
 *
 * Phone cameras routinely produce 4–12 MB files. The avatars bucket only
 * accepts 2 MB, and a 96px circle does not need the original. Canvas output is
 * always JPEG so HEIC / large PNG still become something the API will store.
 */

const MAX_EDGE_PX = 720;
const MAX_BYTES = 2 * 1024 * 1024;
const MIME = "image/jpeg";

export async function compressAvatar(file: File): Promise<File> {
  const bitmap = await decodeImage(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    closeBitmap(bitmap);
    throw new Error("Could not process that photo.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  closeBitmap(bitmap);

  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size <= MAX_BYTES) {
      return new File([blob], "avatar.jpg", { type: MIME, lastModified: Date.now() });
    }
  }

  throw new Error("Keep the photo under 2 MB, or pick a smaller one.");
}

async function decodeImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // HEIC and a few other types fail here; the <img> path is the fallback.
    }
  }

  return loadHtmlImage(file);
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Use a JPEG, PNG, WebP or GIF photo."));
    };
    image.src = url;
  });
}

function closeBitmap(image: CanvasImageSource): void {
  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
    image.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not process that photo."));
      },
      MIME,
      quality,
    );
  });
}

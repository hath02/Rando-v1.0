import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Where uploaded images are saved. By default this is the React app's
// public/uploads folder, which Vite serves at /uploads. Set UPLOADS_DIR
// in server/.env to use a different folder.
export const UPLOADS_DIR = path.resolve(
  process.env.UPLOADS_DIR ||
    path.join(here, '..', '..', 'client', 'public', 'uploads')
);

// Sub-folders uploads may be saved into ('' is the uploads folder itself).
const FOLDERS = new Set(['', 'avatars']);

// Names this module generates. Only these are ever deleted, so images that
// came with the project (chair.jpg, etc.) can never be removed by accident.
const GENERATED_NAME = /^(?:avatars\/)?\d{13}-[a-f0-9]{16}\.(?:jpg|png|webp|gif)$/;

export class ImageError extends Error {}

// Identify the real image type from the file's first bytes. The browser's
// filename and Content-Type are chosen by the sender, so they are not trusted.
export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }

  const head = buffer.subarray(0, 6).toString('latin1');
  if (head === 'GIF87a' || head === 'GIF89a') return 'gif';

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

export function isGeneratedImageName(stored) {
  return typeof stored === 'string' && GENERATED_NAME.test(stored);
}

// Validate and save an uploaded file (from multer's memory storage).
// Returns the stored name to put in the database, e.g.
// "1760000000000-a1b2c3d4e5f60718.jpg" or "avatars/1760000000000-....png".
export async function saveImage(file, folder = '') {
  if (!FOLDERS.has(folder)) throw new Error(`Unknown upload folder: ${folder}`);

  const type = detectImageType(file?.buffer);

  if (!type) {
    throw new ImageError('Please upload a JPG, PNG, WebP or GIF image.');
  }

  // The name is generated here; the uploaded filename is never used.
  const name = `${Date.now()}-${randomBytes(8).toString('hex')}.${type}`;
  const directory = folder ? path.join(UPLOADS_DIR, folder) : UPLOADS_DIR;

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), file.buffer, { flag: 'wx' });

  return folder ? `${folder}/${name}` : name;
}

// Delete a file this module created. Anything else is left untouched.
export async function deleteImage(stored) {
  if (!isGeneratedImageName(stored)) return;

  try {
    await unlink(path.join(UPLOADS_DIR, ...stored.split('/')));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Could not delete image:', error.message);
    }
  }
}

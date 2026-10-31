// Uploaded profile pictures on disk: content check, storage, lookup.
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Injection token for the directory the pictures are written to. */
export const PICTURES_DIR = Symbol('PICTURES_DIR');

/**
 * Where the pictures live in the container: a named volume, outside the
 * source tree and outside anything a web server serves (ADR-0016).
 */
export const DEFAULT_PICTURES_DIR = '/var/lib/hypertube/pictures';

/** Upload cap, under the edge proxy's `client_max_body_size` (3 MB). */
export const PICTURE_MAX_BYTES = 2 * 1024 * 1024;

/**
 * multer limits for a request carrying a picture: one file, in memory (the
 * bytes are checked before anything is written), and a few short text
 * fields for the registration form.
 */
export const PICTURE_UPLOAD_LIMITS = {
  fileSize: PICTURE_MAX_BYTES,
  files: 1,
  fields: 10,
  fieldSize: 1024,
};

/** The accepted formats, recognised by their first bytes. */
const FORMATS = [
  { ext: 'jpg', mime: 'image/jpeg', matches: startsWith([0xff, 0xd8, 0xff]) },
  {
    ext: 'png',
    mime: 'image/png',
    matches: startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    ext: 'webp',
    mime: 'image/webp',
    matches: (bytes: Buffer) =>
      bytes.toString('latin1', 0, 4) === 'RIFF' &&
      bytes.toString('latin1', 8, 12) === 'WEBP',
  },
] as const;

/** A stored name: only ever one this store generated (UUID + known extension). */
const NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

function startsWith(signature: readonly number[]) {
  return (bytes: Buffer) => signature.every((byte, i) => bytes[i] === byte);
}

/** A stored picture, ready to stream. */
export interface PictureFile {
  stream: ReadStream;
  mime: string;
  size: number;
}

/**
 * The profile pictures on disk. The type is read from the file's first bytes,
 * never from the client's MIME type or file name, and only JPEG, PNG and WebP
 * pass: no SVG, which can carry script. The file is stored under a fresh
 * random name, so the client's name never reaches the disk and a picture's
 * address cannot be guessed from a user id.
 */
@Injectable()
export class ProfilePictureStore implements OnModuleInit {
  private readonly logger = new Logger(ProfilePictureStore.name);

  constructor(@Inject(PICTURES_DIR) private readonly dir: string) {}

  async onModuleInit(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  /**
   * Stores `bytes`, then runs `persist` with the new name. When `persist`
   * fails (a taken email at registration, a vanished user) the file is
   * deleted again, so a refused request never leaves an orphan on disk.
   *
   * @throws {BadRequestException} 400 when the bytes are not a JPEG, PNG or
   * WebP image; nothing is written then.
   */
  async storeFor<T>(
    bytes: Buffer,
    persist: (name: string) => Promise<T>,
  ): Promise<T> {
    const format = FORMATS.find((candidate) => candidate.matches(bytes));
    if (!format) {
      throw new BadRequestException(
        'picture must be a JPEG, PNG or WebP image',
      );
    }
    const name = `${randomUUID()}.${format.ext}`;
    await writeFile(join(this.dir, name), bytes, { flag: 'wx' });
    try {
      return await persist(name);
    } catch (error) {
      await this.delete(name);
      throw error;
    }
  }

  /**
   * Removes a stored picture. Best effort: a file already gone is no
   * failure, and an I/O error is logged rather than failing the request
   * whose database change already happened.
   */
  async delete(name: string | null): Promise<void> {
    if (name === null || !NAME.test(name)) {
      return;
    }
    try {
      await unlink(join(this.dir, name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`could not delete picture ${name}: ${String(error)}`);
      }
    }
  }

  /**
   * Opens a stored picture. The name check comes before any path is built,
   * so `../` or an absolute path never reaches the file system.
   *
   * @throws {NotFoundException} 404 when `name` is not one this store
   * generated, or the file is gone.
   */
  async open(name: string): Promise<PictureFile> {
    const format = NAME.test(name)
      ? FORMATS.find(({ ext }) => name.endsWith(`.${ext}`))
      : undefined;
    const path = join(this.dir, name);
    const size = format && (await stat(path).catch(() => null))?.size;
    if (!format || size === undefined || size === null) {
      throw new NotFoundException();
    }
    return { stream: createReadStream(path), mime: format.mime, size };
  }
}

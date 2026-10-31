// Unit spec for the picture store, against a real temporary directory: what
// it accepts, that a failed persist leaves no file, and that lookups never
// leave the directory.
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProfilePictureStore } from './profile-picture.store';

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 '),
]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

describe('ProfilePictureStore', () => {
  let dir: string;
  let store: ProfilePictureStore;
  const keep = (name: string) => Promise.resolve(name);

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'pictures-'));
    store = new ProfilePictureStore(dir);
    await store.onModuleInit();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it.each([
    ['png', PNG],
    ['jpg', JPEG],
    ['webp', WEBP],
  ])('stores a %s under a fresh random name', async (ext, bytes) => {
    const name = await store.storeFor(bytes, keep);

    expect(name).toMatch(new RegExp(`^[0-9a-f-]{36}\\.${ext}$`));
    expect(await readdir(dir)).toEqual([name]);
  });

  it.each([
    ['an SVG', SVG],
    ['plain text', Buffer.from('hello')],
    ['an empty file', Buffer.alloc(0)],
  ])('refuses %s and writes nothing', async (_label, bytes) => {
    await expect(store.storeFor(bytes, keep)).rejects.toThrow(
      BadRequestException,
    );
    expect(await readdir(dir)).toEqual([]);
  });

  it('deletes the file again when persisting the name fails', async () => {
    const failure = new Error('unique violation');

    await expect(
      store.storeFor(PNG, () => Promise.reject(failure)),
    ).rejects.toBe(failure);
    expect(await readdir(dir)).toEqual([]);
  });

  it('opens a stored picture with the type its name says', async () => {
    const name = await store.storeFor(PNG, keep);

    const file = await store.open(name);
    file.stream.destroy();

    expect(file).toMatchObject({ mime: 'image/png', size: PNG.length });
  });

  it.each(['../secret.png', 'notes.txt', '/etc/passwd'])(
    'never opens %s, a name it did not generate',
    async (name) => {
      await writeFile(join(dir, 'notes.txt'), 'not a picture');

      await expect(store.open(name)).rejects.toThrow(NotFoundException);
    },
  );

  it('answers 404 for a picture that is gone', async () => {
    const name = await store.storeFor(PNG, keep);
    await store.delete(name);

    await expect(store.open(name)).rejects.toThrow(NotFoundException);
    expect(await readdir(dir)).toEqual([]);
  });
});

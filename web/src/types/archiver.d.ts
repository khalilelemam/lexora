/**
 * Minimal type declarations for archiver v8 (ESM class-based API).
 * archiver v8 does not ship its own TypeScript definitions.
 */
declare module 'archiver' {
  import { Transform } from 'node:stream';
  import type { ZlibOptions } from 'node:zlib';

  interface EntryData {
    name: string;
    date?: Date | string;
    mode?: number;
    prefix?: string;
  }

  interface ArchiverOptions {
    statConcurrency?: number;
    allowHalfOpen?: boolean;
    highWaterMark?: number;
    zlib?: ZlibOptions;
    gzip?: boolean;
    gzipOptions?: ZlibOptions;
    store?: boolean;
    comment?: string;
    forceLocalTime?: boolean;
    forceZip64?: boolean;
    namePrependSlash?: boolean;
  }

  class Archiver extends Transform {
    append(source: Buffer | string | NodeJS.ReadableStream, data?: EntryData): this;
    directory(dirpath: string, destpath: false | string, data?: Partial<EntryData>): this;
    file(filename: string, data: EntryData): this;
    glob(pattern: string, options?: object, data?: Partial<EntryData>): this;
    finalize(): Promise<void>;
    abort(): this;
    pointer(): number;
    symlink(filepath: string, target: string, mode?: number): this;
  }

  export class ZipArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }

  export class TarArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }

  export class JsonArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }

  export { Archiver };
}

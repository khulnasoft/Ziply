import { WriteStream } from 'fs';
export declare enum COMPRESSION_LEVEL {
    uncompressed = 0,
    medium = 5,
    high = 9
}
export type ZiplyOptions = {
    compression?: COMPRESSION_LEVEL;
    customWriteStream?: WriteStream;
    destPath?: string;
};
export declare class Ziply {
    static tar(src: string, tarFilePath: string | undefined, zipLyOptions?: ZiplyOptions): Promise<void | Error>;
    static zip(src: string, zipFilePath: string | undefined, zipLyOptions?: ZiplyOptions): Promise<void | Error>;
    private static compress;
}
export declare const zip: typeof Ziply.zip;
export declare const tar: typeof Ziply.tar;

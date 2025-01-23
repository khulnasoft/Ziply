'use strict';
import {WriteStream, createWriteStream} from 'fs';
import path from 'path';
import archiver from 'archiver';
import fs from 'fs/promises';
import isGlob from 'is-glob';
import {glob} from 'glob';
import {Stats} from 'node:fs';

export enum COMPRESSION_LEVEL {
    uncompressed = 0,
    medium = 5,
    high = 9,
}

/**
 * Options to pass in to zip a folder
 * compression default is 'high'
 */
export type ZiplyOptions = {
    compression?: COMPRESSION_LEVEL;
    customWriteStream?: WriteStream;
    destPath?: string;
};

export class Ziply {
    /**
     * Tars a given folder or a glob into a gzipped tar archive.
     * If no zipLyOptions are passed in, the default compression level is high.
     * @param src can be a string path or a glob
     * @param tarFilePath path to the zip file
     * @param zipLyOptions
     */
    static async tar(
        src: string,
        tarFilePath: string | undefined,
        zipLyOptions?: ZiplyOptions,
    ): Promise<void | Error> {
        const o: ZiplyOptions = zipLyOptions || {
            compression: COMPRESSION_LEVEL.high,
        };

        if (o.compression === COMPRESSION_LEVEL.uncompressed) {
            await Ziply.compress({src, targetFilePath: tarFilePath, format: 'tar', zipLyOptions});
        } else {
            await Ziply.compress({
                src,
                targetFilePath: tarFilePath,
                format: 'tar',
                zipLyOptions,
                archiverOptions: {
                    gzip: true,
                    gzipOptions: {
                        level: o.compression,
                    },
                },
            });
        }
    }

    /**
     * Zips a given folder or a glob into a zip archive.
     * If no zipLyOptions are passed in, the default compression level is high.
     * @param src can be a string path or a glob
     * @param zipFilePath path to the zip file
     * @param zipLyOptions
     */
    static async zip(
        src: string,
        zipFilePath: string | undefined,
        zipLyOptions?: ZiplyOptions,
    ): Promise<void | Error> {
        const o: ZiplyOptions = zipLyOptions || {
            compression: COMPRESSION_LEVEL.high,
        };

        if (o.compression === COMPRESSION_LEVEL.uncompressed) {
            await Ziply.compress({
                src,
                targetFilePath: zipFilePath,
                format: 'zip',
                zipLyOptions,
                archiverOptions: {
                    store: true,
                },
            });
        } else {
            await Ziply.compress({
                src,
                targetFilePath: zipFilePath,
                format: 'zip',
                zipLyOptions,
                archiverOptions: {
                    zlib: {
                        level: o.compression,
                    },
                },
            });
        }
    }

    private static async compress({
        src,
        targetFilePath,
        format,
        zipLyOptions,
        archiverOptions,
    }: {
        src: string;
        targetFilePath?: string;
        format: archiver.Format;
        zipLyOptions?: ZiplyOptions;
        archiverOptions?: archiver.ArchiverOptions;
    }): Promise<void | Error> {
        let output: WriteStream;
        const globList: string[] = [];

        if (!zipLyOptions?.customWriteStream && targetFilePath) {
            const targetBasePath: string = path.dirname(targetFilePath);

            if (targetBasePath === src) {
                throw new Error('Source and target folder must be different.');
            }

            try {
                if (!isGlob(src)) {
                    await fs.access(src, fs.constants.R_OK); //eslint-disable-line no-bitwise
                }
                await fs.access(targetBasePath, fs.constants.R_OK | fs.constants.W_OK); //eslint-disable-line no-bitwise
            } catch (e: any) {
                throw new Error(`Permission error: ${e.message}`);
            }

            if (isGlob(src)) {
                for (const globPart of src.split(',')) {
                    // @ts-ignore
                    globList.push(...(await glob(globPart.trim())));
                }
                if (globList.length === 0) {
                    throw new Error(`No glob match found for "${src}".`);
                }
            }

            output = createWriteStream(targetFilePath);
        } else if (zipLyOptions && zipLyOptions.customWriteStream) {
            output = zipLyOptions.customWriteStream;
        } else {
            throw new Error('You must either provide a target file path or a custom write stream to write to.');
        }

        const zipArchive: archiver.Archiver = archiver(format, archiverOptions || {});

        return new Promise(async (resolve, reject) => {
            output.on('close', resolve);
            output.on('error', reject);

            zipArchive.pipe(output);

            if (isGlob(src)) {
                for (const file of globList) {
                    if (((await fs.lstat(file)) as Stats).isFile()) {
                        const content = await fs.readFile(file);
                        zipArchive.append(content, {
                            name: file,
                        });
                    }
                }
            } else {
                zipArchive.directory(src, zipLyOptions?.destPath || false);
            }
            await zipArchive.finalize();
        });
    }
}

export const zip = Ziply.zip;
export const tar = Ziply.tar;

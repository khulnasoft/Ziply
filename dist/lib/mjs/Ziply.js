'use strict';
import { createWriteStream } from 'fs';
import path from 'path';
import archiver from 'archiver';
import fs from 'fs/promises';
import isGlob from 'is-glob';
import { glob } from 'glob';
export var COMPRESSION_LEVEL;
(function (COMPRESSION_LEVEL) {
    COMPRESSION_LEVEL[COMPRESSION_LEVEL["uncompressed"] = 0] = "uncompressed";
    COMPRESSION_LEVEL[COMPRESSION_LEVEL["medium"] = 5] = "medium";
    COMPRESSION_LEVEL[COMPRESSION_LEVEL["high"] = 9] = "high";
})(COMPRESSION_LEVEL || (COMPRESSION_LEVEL = {}));
export class Ziply {
    static async tar(src, tarFilePath, zipLyOptions) {
        const o = zipLyOptions || {
            compression: COMPRESSION_LEVEL.high,
        };
        if (o.compression === COMPRESSION_LEVEL.uncompressed) {
            await Ziply.compress({ src, targetFilePath: tarFilePath, format: 'tar', zipLyOptions });
        }
        else {
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
    static async zip(src, zipFilePath, zipLyOptions) {
        const o = zipLyOptions || {
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
        }
        else {
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
    static async compress({ src, targetFilePath, format, zipLyOptions, archiverOptions, }) {
        let output;
        const globList = [];
        if (!zipLyOptions?.customWriteStream && targetFilePath) {
            const targetBasePath = path.dirname(targetFilePath);
            if (targetBasePath === src) {
                throw new Error('Source and target folder must be different.');
            }
            try {
                if (!isGlob(src)) {
                    await fs.access(src, fs.constants.R_OK);
                }
                await fs.access(targetBasePath, fs.constants.R_OK | fs.constants.W_OK);
            }
            catch (e) {
                throw new Error(`Permission error: ${e.message}`);
            }
            if (isGlob(src)) {
                for (const globPart of src.split(',')) {
                    globList.push(...(await glob(globPart.trim())));
                }
                if (globList.length === 0) {
                    throw new Error(`No glob match found for "${src}".`);
                }
            }
            output = createWriteStream(targetFilePath);
        }
        else if (zipLyOptions && zipLyOptions.customWriteStream) {
            output = zipLyOptions.customWriteStream;
        }
        else {
            throw new Error('You must either provide a target file path or a custom write stream to write to.');
        }
        const zipArchive = archiver(format, archiverOptions || {});
        return new Promise(async (resolve, reject) => {
            output.on('close', resolve);
            output.on('error', reject);
            zipArchive.pipe(output);
            if (isGlob(src)) {
                for (const file of globList) {
                    if ((await fs.lstat(file)).isFile()) {
                        const content = await fs.readFile(file);
                        zipArchive.append(content, {
                            name: file,
                        });
                    }
                }
            }
            else {
                zipArchive.directory(src, zipLyOptions?.destPath || false);
            }
            await zipArchive.finalize();
        });
    }
}
export const zip = Ziply.zip;
export const tar = Ziply.tar;
//# sourceMappingURL=Ziply.js.map
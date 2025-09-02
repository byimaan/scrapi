/**
 * File system stage:
 *      Ensure output directory 
 */
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { downloadBinary } from "./download.js";
import { text } from "../../../../../util/log.js";
import { isSubPath, safeResolveOutDir } from "../../../../../util/fs.js";
import { ScrapePayload,ScrapeStages,FileWriteHistory, } from "../../types.js";
import { rephraseDirTemplate,createSavedRow,createFailedRow,createAndWriteHistoryLogFiles } from "./auxil.js";

//subject to changed in future!
const DOWNLOAD_MAX_TIMEOUT_MS = 10*1000;

export const fsManager = async (
    getPayload:()=>ScrapePayload
):Promise<ScrapeStages['fs-manager']['res']> => {
    const {
        globals:{
            cfg:{
                topic,
                out,
                output: {
                    folderTemplate,
                    fileTemplate,
                    meta
                }
            },
            page
        },
        stages: {
            filterer: {
                res: filtererRes
            }
        }
    } = getPayload();

    try {
        //Getting correct absolute out directory location
        const cwd = process.cwd();
        const absCWD = await safeResolveOutDir(out,cwd);
        const pageUrl = new URL(page?.url!);
        
        let outDirName = folderTemplate;
        for(let [searchValue,replaceWith] of [
            ["{topic}", topic],
            ["{hostname}",pageUrl.hostname.replace(/^www\./, '').split('.')[0]]
        ]){
            outDirName = rephraseDirTemplate(
                outDirName,
                {searchValue, replaceWith}
            );
        };
    
        const absOut = path.resolve(absCWD, outDirName); //merge
    
        if (!isSubPath(cwd, absOut)){
            text.icon(i=>i.warn).line(
                cx => cx.red.write('Heads up! Bad configuration:- ')
                        + cx.underline.yellow.write(absOut)
                        + cx.red.write(' exist outside the scope of ')
                        + cx.underline.yellow.write(cwd)
            ).log();
        };

        //Creating src folder where all the files will be stored!
        try {
            await mkdir(absOut,{recursive:true})
        } catch (error) {
            text.icon(i=>i.error).line(
                cx=>cx.red.write('Failed to create directory at ')
                     + cx.underline.yellow.write(absOut)
            ).log();
            throw error
        };

        text.icon(i=>i.success).line(
            cx=> cx.green.write('Downloads are set to be stored at ')
                    + cx.underline.green.write(absOut)
        ).log();

        let downloaded = 0, failed = 0, skipped = 0;
        const history:FileWriteHistory = {
            'saved':[], 'failed':[],'skipped':[]
        };

        // Download & Create manifest rows to maintain history
        if (filtererRes.ok){
            const {filteredCandidates} = filtererRes.returnValue;
            //downloading files 1 by 1.
            for(const candidate of filteredCandidates){
                try {
                    const dwd = await downloadBinary(
                        candidate.srcUrl, DOWNLOAD_MAX_TIMEOUT_MS
                    ); 
                    if (dwd.ok&&dwd.buffer){

                        const savedRow = createSavedRow(dwd, {
                            topic,
                            fileTemplate,
                            parentAbsDirPath: absOut,
                            candidate,
                        });

                        // if any parent-dir of filepath not exist then writeFile will throw an error!
                        await writeFile(savedRow.savedPath, dwd.buffer);
                        downloaded+=1

                        history['saved'].push(savedRow);
                    } 
                    else throw new Error(`Failed to download ${candidate.srcUrl}`);
                } catch (error) {
                    failed+=1;
                    history['failed'].push(
                        createFailedRow(error as Error, {
                            candidate,
                            topic
                        })
                    );   
                };
            };

            /************WRITING-HISTORY************/

        } else {
            text.icon(i=>i.info).line(
                cx => cx.cyan.write('Found')
                        + cx.red.write(' 0 ')
                        + cx.cyan.write('files to download!')
            ).log();
        };

        text.icon(i=>i.download).line(
            cx=> cx.bold.blue.write('Download statistics ')+cx.underline.green.write(absOut)
                + '\n'
                + "  ".repeat(4) + cx.green.write('Saved: ') + cx.yellow.write(downloaded)
                + '\n'
                + "  ".repeat(4) + cx.yellow.write('Skipped: ') + cx.yellow.write(skipped)
                + '\n'
                + "  ".repeat(4) + cx.red.write('Failed: ') + cx.yellow.write(failed)
        ).log();

        const absHistoryDir = path.resolve(absOut,`./history-${outDirName}`);
        try {
            const absLogFilePaths = await createAndWriteHistoryLogFiles(
                absHistoryDir, {
                    history,
                    ext:meta,
                    mkdirRecursive:false//because 'absOut' suppose to exist
                }
            );
            for(let filepath of absLogFilePaths){
                text.icon(i=>i.write).line(
                    cx=>cx.green.write('Writing logs at ')+cx.underline.green.write(filepath)
                ).log();
            };
        } catch {
            text.icon(i=>i.error+" "+i.folder).line(
                cx=>cx.red.write('Failed to create/write log files at ')
                        + cx.underline.yellow.write(absHistoryDir)
            ).log();
        };
        return {
            ok:true,
            returnValue: {
                outDirAbs:absOut,
                manifestOutAbs: absHistoryDir,
                history,
            },
            metadata: {
                stats: {
                    downloaded, failed, skipped
                }
            }
        }

    } catch (error) {
        return {
            ok:false,
            error:error as Error,
            metadata: {}
        };
    };
};
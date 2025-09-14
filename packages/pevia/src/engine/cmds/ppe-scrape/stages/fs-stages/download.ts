import { writeFile } from "node:fs/promises";
import { Candidate } from "../../../../types.js";
import { defineAsyncScrapeStage } from "../../ppe.js";
import { useScrapePipe } from "../../run.js";
import { downloadBinary, downloadSavedRow } from "./utils.js";
import { FILTERER_STAGE_NAME, ReturnTypeFiltererStage } from "../filterer/index.js";
import { ENSURE_SRC_DIR_STAGE_NAME, ReturnTypeEnsureSrcDirStage } from "./src-folder.js";

export const DOWNLOAD_STAGE_NAME = "DOWNLOAD_STAGE";

const WHAT_DOES_DOWNLOAD_STAGE_DO = 
    `
    "DOWNLOAD_STAGE" where each filtered candidate gets downloaded one by one.
            If strictly depends on  "${FILTERER_STAGE_NAME}" and "${ENSURE_SRC_DIR_STAGE_NAME}".
            It download and then write the files in the src folder defined by "${ENSURE_SRC_DIR_STAGE_NAME}".
    `;

const DOWNLOAD_MAX_TIMEOUT_MS = 10*1000;

export type DownloadSaved = {
    topic:string;
    ts:string;
    ms?:number;
    candidate:Candidate;
    hash8:string;
    ext:string;
    mime:string;
    bytes:number;
    savedPath:string;
};

export type DownloadFailed = {
    topic:string;
    srcUrl:string;
    ts:string;
    ms?:number;
    reason:string;
};

export type ReturnTypeDownloadStage = {
    absSrcDirPath:string;
    saved: DownloadSaved[];
    failed: DownloadFailed[];
};

export const DOWNLOAD_STAGE = defineAsyncScrapeStage<ReturnTypeDownloadStage>(
    SCRAPE_PIPE => (
        SCRAPE_PIPE.createStage(
            DOWNLOAD_STAGE_NAME
        ).whatDoesStageDo(
            WHAT_DOES_DOWNLOAD_STAGE_DO
        ).handledAsyncBy<ReturnTypeDownloadStage>(
            async ({getStageStateIfSuccessElseThrowError}) => {

                const {response:{absSrcDirPath}} = getStageStateIfSuccessElseThrowError<ReturnTypeEnsureSrcDirStage>(ENSURE_SRC_DIR_STAGE_NAME);
                const {response:{totalCandidates,extractedTags}} = getStageStateIfSuccessElseThrowError<ReturnTypeFiltererStage>(FILTERER_STAGE_NAME);
                const {usePipeTools, getSchemaConfig} = useScrapePipe();
                const {cli} = usePipeTools(), schema = getSchemaConfig();

                const {topic,output:{fileTemplate}} = schema;

                cli.text.icon(i=>i.file).line(
                    cx=> cx.green.write("There are")
                            +cx.yellow.write(` ${totalCandidates} `)
                            +cx.green.write(`files found to download`)
                ).log();

                const saved:DownloadSaved[]=[], failed:DownloadFailed[]=[];

                for(const htmlTag in extractedTags){
                    const {candidates} = extractedTags[htmlTag as keyof typeof extractedTags];
                    for(const candidate of candidates){
                        const dwd = await downloadBinary(
                            candidate.srcUrl, DOWNLOAD_MAX_TIMEOUT_MS
                        );
                        try {
                            if (dwd.ok){
                                const savedRow = downloadSavedRow(dwd,{
                                    topic,
                                    fileTemplate,
                                    absSrcDirPath,
                                    candidate
                                });
                                
                                // write download file
                                await writeFile(savedRow.savedPath,dwd.buffer);

                                saved.push(savedRow);
                            } else {
                                failed.push({
                                    topic,
                                    ts:new Date().toISOString(),
                                    ms:dwd.ms,
                                    srcUrl:candidate.srcUrl,
                                    reason:dwd.reason
                                })
                            };
                        } catch (e) {
                            // error during file write!
                            failed.push({
                                topic,
                                srcUrl:candidate.srcUrl,
                                ts:new Date().toISOString(),
                                reason: e instanceof Error ? e.message : `An unknown error while downloading and writing resource from "${candidate.srcUrl}" to "${absSrcDirPath}"`
                            });
                        };
                    };
                };

                return {
                    status:'success',
                    response: {
                        absSrcDirPath,
                        saved,
                        failed,
                    },
                    metadata:{}
                }
            }
        )
    )
);
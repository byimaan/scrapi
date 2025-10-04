import { writeFile } from "node:fs/promises";
import { Candidate } from "../../../../types.js";
import { defineAsyncScrapeStage } from "../../ppe.js";
import { useScrapePipe } from "../../run.js";
import { downloadBinary, downloadSavedRow, imgMetadata, sameOrigin } from "../../utils.js";
import { ENSURE_SRC_DIR_STAGE_NAME, ReturnTypeEnsureSrcDirStage } from "./src-folder.js";
import { EXTRACTOR_STAGE_NAME, ReturnTypeExtractorStage } from "../extractor/index.js";

export const DOWNLOAD_THEN_FILTER_STAGE_NAME = "DOWNLOAD_THEN_FILTER_STAGE";

const WHAT_DOES_DOWNLOAD_THEN_FILTER_STAGE_DO = 
    `
    "DOWNLOAD_THEN_FILTER_STAGE" where each filtered candidate gets downloaded one by one.
            If strictly depends on  "${EXTRACTOR_STAGE_NAME}" and "${ENSURE_SRC_DIR_STAGE_NAME}".
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

export type DownloadSkipped = DownloadFailed & {
    skipCode: 'UNWANTED_IMG_FORMAT'
            |'DIMENSION_TOO_SMALL'
            |'MAX_IMGS_THRESHOLD_EXCEED'
            |'IMG_FROM_EXTERNAL_ORIGIN_NOT_ALLOWED'
};

export type ReturnTypeDownloadThenFilterStage = {
    absSrcDirPath:string;
    saved: DownloadSaved[];
    failed: DownloadFailed[];
    skipped:DownloadSkipped[]
};

export const DOWNLOAD_THEN_FILTER_STAGE = defineAsyncScrapeStage<ReturnTypeDownloadThenFilterStage>(
    SCRAPE_PIPE => (
        SCRAPE_PIPE.createStage(
            DOWNLOAD_THEN_FILTER_STAGE_NAME
        ).whatDoesStageDo(
            WHAT_DOES_DOWNLOAD_THEN_FILTER_STAGE_DO
        ).handledAsyncBy<ReturnTypeDownloadThenFilterStage>(
            async ({getStageStateIfSuccessElseThrowError}) => {

                const {
                    response:{absSrcDirPath}
                } = getStageStateIfSuccessElseThrowError<ReturnTypeEnsureSrcDirStage>(
                    ENSURE_SRC_DIR_STAGE_NAME
                );
                const {
                    response:{totalCandidates,extractedTags}
                } = getStageStateIfSuccessElseThrowError<ReturnTypeExtractorStage>(
                    EXTRACTOR_STAGE_NAME
                );

                const {usePipeTools,getSchemaConfig} = useScrapePipe();
                const {cli} = usePipeTools(), {topic} = getSchemaConfig();

                cli.text.icon(i=>i.file).line(
                    cx=> `There are ${cx.yellow.write(totalCandidates)} files found to download`
                ).log();

                const saved:DownloadSaved[]=[];
                const skipped:DownloadSkipped[]=[];
                const failed:DownloadFailed[]=[];

                for(const htmlTag in extractedTags){
                    const {candidates} = extractedTags[htmlTag as keyof typeof extractedTags];
                    for(const candidate of candidates){
                        try {
                            const entry = await processDownloadButNotSaveFile(
                                candidate, {absSrcDirPath,savedImages:saved.length}
                            );
                            if ('saved' in entry){
                                const savedRow = entry['saved'];
                                await writeFile(savedRow.savedPath, entry.buffer);
                                saved.push(savedRow);
                            } else if ('skipped' in entry){
                                skipped.push(entry['skipped']);
                            } else {
                                failed.push(entry['failed'])
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
                        skipped,
                        failed,
                    },
                    metadata:{}
                }
            }
        )
    )
);



async function processDownloadButNotSaveFile(
    candidate:Candidate, opts:{absSrcDirPath:string, savedImages:number}
):Promise<{saved:DownloadSaved, buffer:Uint8Array} | {skipped:DownloadSkipped} | {failed:DownloadFailed}>{

    const {getSchemaConfig} = useScrapePipe();
    const {
        url,
        topic,
        filter:{
            maxImages,
            minHeight,
            minWidth,
            formats,
            excludeFormats,
            skipExternalImages
        },
        output:{fileTemplate}
    } = getSchemaConfig();

    if (opts.savedImages>=maxImages){
        return {
            'skipped':{
                topic,
                srcUrl:candidate.srcUrl,
                ts:new Date().toISOString(),
                reason: `Skipped because limit on maxIMages of ${maxImages} has been exceeded.`,
                skipCode:'MAX_IMGS_THRESHOLD_EXCEED'
            }
        }
    };

    if (skipExternalImages && !sameOrigin(url,candidate.srcUrl)){
        return {
            'skipped':{
                topic,
                srcUrl:candidate.srcUrl,
                ts:new Date().toISOString(),
                reason: `Image's srcUrl('${candidate.srcUrl}')'s origin is different from the origin of '${url}'`,
                skipCode:'IMG_FROM_EXTERNAL_ORIGIN_NOT_ALLOWED'
            }
        }
    };

    const dwd = await downloadBinary(
        candidate.srcUrl, DOWNLOAD_MAX_TIMEOUT_MS
    );

    if (dwd.ok){
        //Check format & dimension constraint
        // remember format by metadata can surpass 'jpeg' of exludeFormats & vice-versa
        const {format,width,height} = await imgMetadata(dwd.buffer); 
        if (
            excludeFormats.includes(format) 
            || ['*',format].every(fmt => !formats.includes(fmt))
        ){
            return {
                'skipped': {
                    topic,
                    ts:new Date().toISOString(),
                    ms:dwd.ms,
                    srcUrl:candidate.srcUrl,
                    reason:`Expected img format not to be type of ${format}`,
                    skipCode:'UNWANTED_IMG_FORMAT'
                }
            };
        };
        if (width<minWidth || height<minHeight){
            return {
                'skipped': {
                    topic,
                    ts:new Date().toISOString(),
                    ms:dwd.ms,
                    srcUrl:candidate.srcUrl,
                    reason:`Image dimension not satisfies min constraints ${width}:${height} < ${minWidth}:${minHeight}`,
                    skipCode:'DIMENSION_TOO_SMALL'
                }
            };
        }
        /**
         * could be a right spot to inject image-size/format validator!
         */
        return {
            'saved' : downloadSavedRow(dwd,{
                topic,
                fileTemplate,
                absSrcDirPath: opts.absSrcDirPath,
                candidate
            }),
            'buffer': dwd.buffer,
        };
    } else {
        return {
            'failed': {
                topic,
                ts:new Date().toISOString(),
                ms:dwd.ms,
                srcUrl:candidate.srcUrl,
                reason:dwd.reason
            }
        };
    };
}
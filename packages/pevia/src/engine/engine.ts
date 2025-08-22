/**
 * Orchestrate pipeline with consistent logging!
 */

import { logger } from "../util/log";
import { Job, NotImplementedError, Page, Candidate, Accepted } from "./types";

export interface EngineRunResult {
  pagesVisited: number;
  candidatesFound: number;
  saved: number;
  skipped: number;
  reasons: Record<string, number>; //rejection reason counts
};
type StageName =
  | "renderer"
  | "extractor"
  | "validator"
  | "downloader"
  | "store"
  | "crawler";

export interface EngineRunResult {
  pagesVisited: number;
  candidatesFound: number;
  saved: number;
  skipped: number;
  reasons: Record<string, number>; // rejection reason counts
}

const safeStage = async <T>(
    stage:StageName,fn:()=>Promise<T>
):Promise<{ok:true, value:T} | {ok:false, error:Error}> => {
    const t0 = Date.now();
    try {
        const value = await fn();
        logger('timestamp')
        .mid(clx=>clx.italic.cyan.write(` ms:${Date.now()-t0}`))
        .body(clx => `Stage: ${clx.underline.write(stage)} ok`).log();
        return {ok:true, value}
    } catch (e) {
        const err = e as Error, isNI = err instanceof NotImplementedError;
        logger()
        .icon(icons => isNI ? icons.warn : icons.error)
        .mid(clx=>clx.italic.cyan.write(` ms:${Date.now()-t0}`))
        .heading(
            isNI ? clx => clx.yellow.write('Feature unavailable')
                : clx => clx.red.write(`Oops! Error occurred during "${clx.underline.write(stage)}" stage`)
        ).nl().pd(4).body(' - ' + err.message).log()
        return {ok:false, error: err}
    }
};

export const runJob = async (job:Job):Promise<EngineRunResult> => {
    let pagesVisited = 0;
    let candidatesFound = 0;
    let saved = 0;
    let skipped = 0;
    const reasons: Record<string, number> = {};

    //Stage-1, render (Html, Headless)
    const pageRes = await safeStage(
        'renderer',
        async () => {
            const page = {} as Page; //pseudo-code
            return page
        }
    );

    if (!pageRes.ok) throw pageRes.error;
    pagesVisited+=1;
    
    //Stage-2, extract (html, og, css)
    const extractRes = await safeStage(
        'extractor',
        async () => {
            const candidates: Candidate[] = []; //pseudo
            return candidates
        }
    );
    if (!extractRes.ok) throw extractRes.error;
    const candidates = extractRes.value
    candidatesFound += candidates.length;

    //Stage-3, validation
    const validateRes = await safeStage(
        'validator',
        async () => {
            const accepted = candidates;
            const rejected: Array<{candidate:Candidate; reason:string}> = [];
            return {accepted, rejected}
        }
    );
    if (!validateRes.ok) throw validateRes.error;
    const { accepted, rejected } = validateRes.value;
    for(let r of rejected){
        reasons[r.reason] = (reasons?.[r.reason] ?? 0) + 1;
    };
    skipped += rejected.length

    //Stage-4, Download
    const downloadRes = await safeStage(
        'downloader',
        async () => {
            const files:Accepted[] = []; //pseudo
            return files
        }
    );
    if (!downloadRes.ok) throw downloadRes.error;
    const files = downloadRes.value;
    saved += files.length;

    //Stage-5 store (manifestation and db related work)
    const storeRes = await safeStage(
        'store',
        async () => {
            //TODO: write manifest and update db
            return true //pseudo
        }
    );
    if (!storeRes.ok) throw storeRes.error;

    const result = {pagesVisited,candidatesFound,saved,skipped,reasons};
    
    // --- final (summary) ---
    const gap = 4, wrapAfter = 10;
    logger()
    .icon(icons => icons.folder)
    .heading(clx => clx.br.blue.write('Result Summary:-'))
    .nl().pd(0)
    .body(
        clx => {
            let summary = '';
            for(let key in result){
                summary += ' '.repeat(gap)
                if (key === 'reasons'){
                    if (!result[key].length) break;
                    
                    summary += clx.underline.magenta.write('reasons') + " : " + '\n';
                    let i=0;
                    for(let reason in result[key]){
                        summary += ' '.repeat(gap*2)
                        if (i>wrapAfter){
                            summary += clx.red.write('...')
                            break
                        }
                        summary += ''
                        + clx.italic.red.write(reason)
                        + ' : ' + clx.yellow.write(result[key][reason])
                        i += 1
                        summary += '\n'
                    };
                } else {
                    summary += clx.underline.magenta.write(key) + ' : ' + clx.yellow.write(result[key])
                };
                summary += '\n'
            }
            return summary;
        }
    ).log()

    return result; 
}
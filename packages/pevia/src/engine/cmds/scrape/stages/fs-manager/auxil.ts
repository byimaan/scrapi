
import path from "node:path";
import { Candidate } from "../../../../types";
import { DownloadOK,FileWriteHistory } from "../../types";
import { extFromMime } from "../../../../../util/fs";
import { slugify, randomHash, sha256, hash8 } from "../../../../../util/crypt";
import { mkdir, writeFile } from "node:fs/promises";

export const rephraseDirTemplate = (
    folderTemplate:string,
    opts:{searchValue:string; replaceWith:string}
) => {
    return folderTemplate.replace(
        opts.searchValue, 
        opts.replaceWith
            ? slugify(opts.replaceWith, {def:`T404${randomHash(3)}`,winSafe:true})
            : 'D404-'+slugify(randomHash(4))
    );
};

export const rephraseFileTemplate = (
    fileTemplate:string,
    filenames:Record<string,string>, // e.g. filenames[hash8] =  7q81wzx0
    rgx=/\{(\w+)\}/g
) => {
    return fileTemplate.replace(
        rgx,
        (_,valBtwBrackets)=>filenames?.[valBtwBrackets] || `${valBtwBrackets}404-`+randomHash(3)
    )
};

export const createSavedRow = (
    dwd:DownloadOK,
    opts: {
        topic:string;
        fileTemplate:string;
        parentAbsDirPath:string;
        candidate:Candidate;
        fileName?:string;
    }
):FileWriteHistory['saved'][number] => {
    const hash = sha256(dwd.buffer), hashEight = hash8(hash);
    const extFromUrl = (
        opts.candidate.fileNameHint || opts.candidate.srcUrl
    ).split('.').pop()?.split('?')[0]?.toLowerCase();
    const ext = extFromMime(dwd.mime,extFromUrl);
    const fileName =  opts.fileName || rephraseFileTemplate(
        opts.fileTemplate,
        {
            hash8:hashEight,
            hash:hashEight,
            ext,
            basename:opts.candidate.fileNameHint||"",
        }
    );

    return {
        ...opts.candidate,
        srcUrl:dwd.finalUrl||opts.candidate.pageUrl,
        topic:opts.topic,
        hash8:hashEight,
        ext,
        mime:dwd.mime||'',
        bytes:dwd.buffer.byteLength,
        ts: new Date().toISOString(),
        ms:dwd.metadata.ms,
        savedPath: path.join(opts.parentAbsDirPath, fileName),
        status:'saved',
    }
};

export const createFailedRow = (
    error:Error,
    opts:{
        candidate:Candidate;
        topic:string;
    }
):FileWriteHistory['failed'][number] => {
    return {
        ...opts.candidate,
        topic:opts.topic,
        ts: new Date().toISOString(),
        status:'failed',
        reason: error.message || error.name || 'unknown',
    }
};


const parseCSVEntry = (val:any):string => {
    const entry = String(val);
    return /[",\n]/.test(entry) //target comma,double-quote,newline?
    ? `"${entry.replace(/"/g, '""')}"`//wrap target in quotes 
    : entry;
};
export const parseCSVRow = (col:(string|number)[]):string => {
    return col.map(elem => parseCSVEntry(elem)).join(',')
};

export const createAndWriteHistoryLogFiles = async (
    absDir:string, // ~/tvs/history-tvs
    opts:{
        history:FileWriteHistory,
        ext:'json'|'csv',
        mkdirRecursive?:boolean
    }
):Promise<string[]> => {
    const absLogFiles:string[] = [], {history, mkdirRecursive, ext} = opts;

    if (
        Object.keys(history).reduce(
            (prev,key) => prev || !!history[key].length, false)
        ) // At least some data should exist before creating/writing files
    {
        //Will automatically throw error if 'absDir' is not correct.
        await mkdir(absDir, {recursive:!!mkdirRecursive}); 

        for(let fileName in history){
            if (!history[fileName].length) continue;

            const absFilePath = path.resolve(
                absDir, `./${fileName}.${ext}`
            );
            if (ext==='json'){
                const JSON_DATA = JSON.stringify(
                    {[fileName]:history[fileName]},
                    null,
                    2
                );
                await writeFile(
                    absFilePath, JSON_DATA
                );
            } else {
                const csvHeader = parseCSVRow(
                    Object.keys(history[fileName][0])
                );
                const csvLines = [csvHeader];
                for(let row of history[fileName]){
                    csvLines.push(
                        parseCSVRow(Object.values(row))//csvline
                    );
                };
                await writeFile(
                    absFilePath, Buffer.from(csvLines.join('\n'))
                );
            };
            absLogFiles.push(absFilePath);

        };
    };

    return absLogFiles
}
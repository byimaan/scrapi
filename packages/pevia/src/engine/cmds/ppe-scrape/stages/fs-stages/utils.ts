import path from "node:path";
import { fetch as undiciFetch } from "undici";
import { realpath,access,constants } from "node:fs/promises";
import { hash8, randomHash, sha256 } from "../../../../../util/crypt.js";
import { DownloadSaved } from "./download.js";
import { Candidate } from "../../../../types.js";

export const isSubPath = (
    absParent:string,
    absChild:string
):boolean => {
    const rel = path.relative(
        /**
        *  path.relative -> suppose cwd is at absParent.
        *  get the relative path which will lead to absChild.
        *  cd <out> -> absChild is now cwd
        */
        absParent,absChild
    );
    return !rel.startsWith('..') && !path.isAbsolute(rel)
};

export const exists = async(
    absPath:string
):Promise<boolean> => {
    try {
        await access(absPath, constants.F_OK);
        return true;
    } catch{
        return false
    }
}

export const safeResolveOutDir = async (
    outRaw:string, // can be valid or corrupted
    cwd=process.cwd()
) => {
    const abs = path.isAbsolute(outRaw)
                ? path.normalize(outRaw)
                : path.resolve(cwd,outRaw)/*merge*/;
    try {
        return await realpath(abs)//realpath:absolute path of file/dir
    } catch {
        return abs // not exist yet but it is at least absolute
    }
};

type DownloadSavedRow = {
    ok:true;
    buffer:Uint8Array;
    mime?:string;
    finalUrl?:string;
    ms:number;
    bytes:number;
};
type DownloadFailedRow = {
    ok:false;
    error:Error;
    reason:string;
    ms:number;
}

type ReturnTypeDownloadBinary = DownloadSavedRow | DownloadFailedRow;

export const downloadBinary = async (
    url:string,
    timeoutMs?:number
):Promise<ReturnTypeDownloadBinary> => {
    const ctrl = new AbortController();
    const timer = typeof timeoutMs === 'number'
    ?  setTimeout(
            ()=>ctrl.abort(), Math.max(1,timeoutMs)
        ) 
    : undefined;
    const t0 = Date.now();
    try {
        const res = await undiciFetch(
            url, {
                redirect:'follow',
                signal: timer ? ctrl.signal : undefined
            }
        );
        const mime = res.headers.get('content-type')||undefined;
        const buffer = new Uint8Array(await res.arrayBuffer());

        return {
            ok:true,
            buffer,
            mime,
            finalUrl:res.url||url,
            ms:Date.now()-t0,
            bytes:buffer.byteLength
        };
    } catch (e) {
        const error = e instanceof Error ? e : new Error(`An unknown error occurred while downloading resource form "${url}"`)
        return {
            ok:false,
            error,
            reason: error.name === 'AbortError' ? `Time limit exceeded, resource at "${url}" exceeded limit of ${timeoutMs} ms.` : error.message,
            ms:Date.now()-t0
        }
    } finally {
        if (timer) clearTimeout(timer);
    }
};

const rephraseFileTemplate = (
    fileTemplate:string,
    replacers : Record<string,string>
) => {
    const regex = /\{(\w+)\}/g;
    return fileTemplate.replace(
        regex,
        (_,inBracket) => {
            if (typeof inBracket === 'string'){
                inBracket=inBracket.trim();
                if (inBracket in replacers && replacers[inBracket] !== undefined){
                    return replacers[inBracket]
                };
                return inBracket
            }
            throw new Error(`Unknown file template was found, ${inBracket} is not defined in fileTemplate replacers.`)
        } 
    );
};

const extFromMime = (
    mime?:string,fallback?:string
) => {//e.g. mime = "image/jpeg; charset=utf-8"
    if (!mime) return fallback || 'bin';
    const m = mime.split(";")[0].trim().toLowerCase();
    if (m === "image/jpeg" || m === "image/jpg") return "jpg";
    if (m === "image/png") return "png";
    if (m === "image/webp") return "webp";
    if (m === "image/gif") return "gif";
    if (m === "image/svg+xml") return "svg";
    if (m === "image/avif") return "avif";
    return fallback || (m.split("/")[1] ?? "bin");
};

export const downloadSavedRow = (
    downloadRow:DownloadSavedRow,
    opts:{
        topic:string;
        fileTemplate:string;
        absSrcDirPath:string;
        candidate:Candidate;
        fileName?:string;
    }
):DownloadSaved => {
    const hash = sha256(downloadRow.buffer),h8=hash8(hash);
    const extFromUrl = (
        opts.candidate.fileNameHint || opts.candidate.srcUrl
    ).split('.').pop()!.split('?')[0].toLowerCase();
    const ext = extFromMime(downloadRow.mime, extFromUrl);
    const fileName = opts.fileName || rephraseFileTemplate(
        opts.fileTemplate, {
            hash8:h8,
            hash:h8,
            ext,
            basename:opts.candidate.fileNameHint||`bn404${h8}.${ext}`
        }
    );
    return {
        topic:opts.topic,
        candidate: {...opts.candidate},
        ts:new Date().toISOString(),
        ms:downloadRow.ms,
        hash8:h8,
        ext,
        mime:downloadRow.mime||"",
        bytes:downloadRow.bytes,
        savedPath: path.join(opts.absSrcDirPath,fileName),
    }
}




import path from "node:path";
import sharp from "sharp";
import { fetch as undiciFetch } from "undici";
import { realpath,access,constants } from "node:fs/promises";
import { hash8, sha256 } from "../../../util/crypt.js";
import { DownloadSaved } from "./stages/fs-stages/download-then-filter.js";
import { Candidate } from "../../types.js";

export const absolutizeUrl = (
    mayBeRel:string, base:string
) : string|undefined => {
    /**
     * Fetched html can use any kind of URLs
     * e.g. 
     *     -> https://abc.com/img/pic.png',
     *     -> /img/pic.png, 
     *     -> ../images/img/pic.png,
     *     -> //cdn.abc.com/pic.png and more...
     * So need a way to normalize URL that can be fetched!
     */
    try {
        if (mayBeRel.startsWith('//')){ // '//cdn.abc.com'
            const b = new URL(base);
            return `${b.protocol}${mayBeRel}`
        };
        return new URL(mayBeRel, base).toString();
    } catch {
         return undefined
    };
};


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
};

export const imgMetadata = async (buff:Uint8Array) => {
    return await sharp(buff).metadata()
};
export const safeImgMetadata = async (buff:Uint8Array) => {
    try {
        return await imgMetadata(buff)
    } catch (e) {
        const err = e instanceof Error ? e : new Error(`sharp.metadata unknowingly thrown an error`);
        return err;
    };
};

export const sameOrigin = (
    x:string,y:string
):boolean => {
    try {
        const [X,Y] = [x,y].map(z => new URL(z));
        return X.origin === Y.origin;
    } catch {
        return false
    }
};




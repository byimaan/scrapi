import {createHash, randomBytes} from "node:crypto";
import { windowSafe } from "./fs.js";

//produce safe slugs for files
export const slugify = (
    s:string,opts={def:'',winSafe:true}
):string => {
    const base = s
        .normalize("NFKD") // must be a consistent unicode form
        .replace(/[^\p{Letter}\p{Number}]+/gu, "-") //non-letters->'-'
        .replace(/^-+|-+$/g, "") // trim('-') if exist
        .toLowerCase() || opts.def || "not-defined";
    return opts.winSafe ? windowSafe(base) : base
};


//compute sha256 & short hash for filenames
export const sha256 = (
    buf:Uint8Array
):string => {
    return createHash('sha256').update(buf).digest('hex')
};
export const hash8 = (
    hex:string
):string => {
    return hex.slice(0,8)
};

export const randomHash = (bytes=4) => {
    return randomBytes(bytes).toString('hex')
}

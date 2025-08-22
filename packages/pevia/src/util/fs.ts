import path from "node:path";
import { realpath, constants, access } from "node:fs/promises";

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

export const extFromMime = (
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
}

//remove chars that can potentially cause conflicts in window system especially during fil/dir naming
export const windowSafe = (s:string,replaceValue="") => {
    return s.replace(/[<>:"/\\|?*]/g, replaceValue);
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
    //In case if absParent = absChild will lead to false 
    return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel)
};

export const safeResolveOutDir = async (
    outRaw:string, cwd=process.cwd()
) => {
    const abs = path.isAbsolute(outRaw)
                ? path.normalize(outRaw)
                : path.resolve(cwd,outRaw)/*merge*/;
    try {
        return await realpath(abs)//realpath:absolute path of file/dir
    } catch {
        return abs
    }
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
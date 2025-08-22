
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
}
export const isPlainObject = <V=any>(x: any) : x is Record<string,V> =>
    Object.prototype.toString.call(x) === "[object Object]";

export const isUndefined = <T>(x:any): x is T => x===undefined
export const boolParse = (s?:string, falsy=undefined) => (
    s?.toLowerCase()?.trim() === 'true' ? true : falsy
);
export const intParse = (s?:string, falsy=undefined) => (
    s && !isNaN(parseInt(s)) ? parseInt(s) : falsy
);
export const numParse = (s?: string, falsy = undefined) => ( //decimals
    s && !isNaN(Number(s)) ? Number(s) : falsy
);
export const csvParse =  (s?:string, sep?:string, falsy=undefined) => {
    if (typeof s === 'string'){
        if (isUndefined<undefined>(sep)) sep = s.includes(';') ? ';' : ',';
        return s.split(sep).map(x=>x.trim()).filter(Boolean)
    };
    return false
};
import clx from "@consify/ansi";
import { isPlainObject } from "./funcs.js";
export const displayConfig = (obj:Record<string,any>,pb:number,pa=5) => {
    for(let [k,v] of Object.entries(obj)){
        let val = v;
        if (typeof v === 'string') val = `"${clx.green.write(v)}"`;
        else if (typeof v === 'boolean') val = v ? clx.green.write(`${v}`) : clx.red.write(`${v}`);
        else if (Array.isArray(v)) val = [...v].map(x => clx.green.write(`${x}`));
        else if (typeof v === 'number') val = clx.magenta.write(v)
        
        if (isPlainObject(v)){
            clx.bold.magenta.log(' '.repeat(pb) + `${k} configuration \n`.toUpperCase())
            displayConfig(v,pb*2,pa)
        } else {
            console.log(' '.repeat(pb) + clx.italic.blue.write(k) + ':' + ' '.repeat(pa) + val)
        }
    }
}
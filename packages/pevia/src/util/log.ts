/**
 * Fns to help logging the info on CLI.
 */
import clx from '@consify/ansi';
import { isPlainObject } from './funcs.js';
import { ICONS } from './icons.js';

// const timeStamp = ( cfb = (ts:string)=>ts ) => cfb(new Date().toISOString());

export const wrapText = (str:string, maxLength?:number) => {
    if (maxLength===undefined) maxLength = str.length;
    if (str.length>Math.max(0,maxLength)) return str.substring(0,maxLength) + " ...";
    return str
}

//Responsive for boolean, array, number, string!
const beautifyElem = (elem:any,strLimit?:number) => {
    const elemType = typeof elem;
    switch (elemType) {
        case 'boolean':
            return elem ? clx.blue.write(`${elem}`) : clx.red.write(`${elem}`)
        case 'string':
            return clx.green.write(wrapText(`"${elem}"`,strLimit))
        case 'number':
            return clx.yellow.write(elem)
        case 'object':
            if (Array.isArray(elem)){
                const array:string[] = []
                for(const x of elem){
                    if (typeof x === 'object') array.push(
                        clx.yellow.write('<'+x+'>')
                    );
                    else array.push(
                        beautifyElem(x,strLimit)
                    );
                };
                return [
                    clx.cyan.write('[')
                    +array.join(', ')
                    +clx.cyan.write(']')
                ].join(' ')
            };
            
            return clx.yellow.write('<'+elemType+'>')
        default:
            return clx.yellow.write('<'+elemType+'>')
    };
};

export const beautifyObjLog = (obj:any,depth=0,strLimit?:number) => {
    if (isPlainObject(obj)){
        for(let key in obj){
            beautifyKeyValLog(key, obj[key],depth+1,strLimit)
        }
    } else {
        const pd = "  ".repeat(depth);
        console.log(pd+beautifyElem(obj,strLimit))
    }
};


export function beautifyKeyValLog(
    keyname:string, 
    value:any,
    depth:number,
    strLimit?:number
){
    const pd = "  ".repeat(depth);
    if (isPlainObject(value)){
        if (Object.keys(value).length){
            console.log(pd + clx.magenta.write(`"${keyname}":`))
            beautifyObjLog(value,depth+1,strLimit)
        } else {
            console.log(pd+beautifyElem(keyname,strLimit)+': '+clx.blue.write('{}'))
        }
    } else {
        console.log(pd+beautifyElem(keyname,strLimit)+': '+beautifyElem(value,strLimit))
    }
};

class TextLog {
    private str:string = '';
    icon(
        arg:string|((icons:typeof ICONS)=>string)
    ){
        if (typeof arg === 'function') this.str += arg(ICONS);
        else this.str += arg;
        this.str += '  '; //gap
        return this;
    };
    line(arg:string|((cfn:typeof clx)=>string)){
        if (typeof arg === 'function') this.str += arg(clx);
        else this.str += arg;
        return this
    };
    log(){
        console.log(this.str)
        this.str='';
    }
};

export const text = new TextLog()
/**
 * Fns to help logging the info on CLI.
 */
import clx from '@consify/ansi';
import { isPlainObject } from './funcs';
import { ICONS } from './icons';

type LogType =  'unknown' | 'timestamp';

const timeStamp = ( cfb = (ts:string)=>ts ) => cfb(new Date().toISOString());

class Logger {
    private _header = '';
    private _body = '';
    private _margin=0; // dist of heading from the left
    private _padding=1; // dist of body from heading 
    private _middle='';
    private _newline='';
    private _icon = ''
    constructor(
        public logType:LogType = 'unknown',
    ){
        this.logType=logType;
    };
    mr(x:number){
        this._margin=x;
        return this;
    };
    pd(x:number){
        this._padding=x;
        return this;
    };
    nl(){
        this._newline='\n';
        return this
    };
    mid(arg:((x:typeof clx)=>string)|string){
        if (typeof arg === 'function') arg = arg(clx)
        this._middle=arg;
        return this
    };
    icon(x:string|((icons:typeof ICONS)=>string)){
        if (typeof x === 'function') x = x(ICONS)
        this._icon=x;
        return this
    }
    heading(
        arg:((x:typeof clx)=>string)|string|number
    ){
        if (typeof arg === 'function'){
            arg = arg(clx);
            this._header=arg
        } else {
           
            if (this.logType === 'timestamp'){
                if (!arg) arg = timeStamp()
                this._header = clx.magenta.write('[ ') + clx.cyan.write(arg) + clx.magenta.write(' ]')
            } else {
                this._header = `${arg}`
            };
        };
        return this
    };

    body(arg:((x:typeof clx)=>string)|string|number|Array<any>){
        if (typeof arg === 'function'){
            arg = arg(clx);
            this._body = arg as string
        } else {
            if (['string','number'].includes(typeof arg)){
                this._body = `${arg}`
            }
            else if (typeof arg === 'boolean'){
                if (arg) this._body = clx.green.write(`${arg}`);
                else this._body = clx.red.write(`${arg}`)
            }
            else if (Array.isArray(arg)){
                const data = ['[ ']
                for(let x of arg){
                    if (typeof x === 'number') data.push(clx.magenta.write(x));
                    else if (typeof x === 'string') data.push(`'${clx.green.write(x)}'`);
                    else data.push(clx.blue.write(typeof x))
                };
                data.push(' ]');
                this._body = data.join(', ')
            }
            else {
                this._body = clx.blue.write(typeof arg)
            }
        }
        return this
    };
    reset(){
        this._header = '';
        this._body = '';
        this._margin=0; // dist of heading from the left
        this._padding=1; // dist of body from heading 
        this._middle='';
        this._newline='';
        this.logType='unknown';
        this._icon='';
        return this
    };
    log(){
        if (!this._header) this.heading(''); //init default built-in behavior (if any)
        if (!this._body) this.body(''); //init default built-in behavior (if any)
        let data = 
            ' '.repeat(this._margin)
            + (this._icon ? this._icon + ' ' : '')
            + this._header 
        data += this._middle
        if (this._newline){
            data += this._newline
            data += ' '.repeat(this._margin)
        };
        data += ' '.repeat(this._padding) + this._body;
        this.reset()
        console.log(data)
    }
};

//Single source of truth (only one logger)
const ins = new Logger('unknown');
export const logger = (type:LogType= 'unknown') => {
    ins.reset()
    ins.logType=type
    return ins
};

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
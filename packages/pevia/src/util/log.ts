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

export const displayConfig = (obj:Record<string,any>,pb:number,pa=2) => {
    for(let [k,v] of Object.entries(obj)){
        let val = v;
        if (typeof v === 'string') val = `"${clx.green.write(v)}"`;
        else if (typeof v === 'boolean') val = v ? clx.green.write(`${v}`) : clx.red.write(`${v}`);
        else if (Array.isArray(v)) val = [...v].map(x => clx.green.write(`${x}`));
        else if (typeof v === 'number') val = clx.magenta.write(v)
        
        if (isPlainObject(v)){
            clx.bold.magenta.log('\n' + ' '.repeat(pb) + `${k} configuration`.toUpperCase())
            displayConfig(v,pb*2,pa)
        } else {
            if (Array.isArray(val)) val = '[' + val.join(', ') + ']'
            console.log(' '.repeat(pb) + clx.italic.blue.write(k) + ':' + ' '.repeat(pa) + val)
        }
    }
}
/**
 * To handle, control and inject plugins more effectively
 */

export type HookContext = {
    topic:string; url:string;
};

export type PeviaPlugin = {
    name:string; 
    onStart?(ctx:HookContext):void|Promise<void>;
    onFinish?(ctx:HookContext):void|Promise<void>;
    shouldVisit?(url:URL,ctx:HookContext):boolean;
    extract?(
        $:any, //cheerio
        pageUrl:URL,
        ctx:HookContext,
    ): Array<any/*{src:string; alt?:string; source?:string}*/>;
};

// To be covered and introduced later after the beta version
export const loadPlugin = ():PeviaPlugin[] => {
    return []
}
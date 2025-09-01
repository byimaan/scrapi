/**
 * Download image as Buffer with per-request timeout
 * note: Assumes server's content-type is not corrupted.
 */

import {fetch as uFetch} from 'undici';
import { DownloadReturnType } from '../../types';


export const downloadBinary = async (
    url:string,
    timeoutMs?:number
):Promise<DownloadReturnType> => {
    const ctrl = new AbortController();
    const timer = typeof timeoutMs === 'number'
        ?  setTimeout(
                ()=>ctrl.abort(), Math.max(1,timeoutMs)
            ) 
        : undefined;
    const t0 = Date.now();

    try{
        const res = await uFetch(
            url, {
                redirect:'follow',
                signal: timer ? ctrl.signal : undefined
            }
        );

        const mime = res.headers.get('content-type')||undefined;
        const buff = await res.arrayBuffer();

        return {
            ok:true,
            buffer: new Uint8Array(buff),
            mime,
            finalUrl:res.url||url,
            metadata: {
                ms:Date.now()-t0
            }
        };

    } catch (error) {
        return {
            ok:false,
            error,
            metadata:{
                ms:Date.now()-t0
            }
        };

    } finally {
        if (timer) clearTimeout(timer);
    };
};
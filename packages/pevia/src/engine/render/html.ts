/*
* Fetch HTML page and produce normalized page ready for extractor
*/

import {CheerioAPI, load as loadHtml} from "cheerio";
import {Page} from "../types";
import { fetch as uFetch } from "undici";


// later better not to put hardcoded headers!
const HEADERS = { 
    'User-Agent': "Mozilla/5.0 (compatible; MediaFetcher/1.x)",
    'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

export const renderHtml = async (url:string,opts:{timeoutMs:number}):Promise<Page & {$:CheerioAPI}> => {
    const ctrl = new AbortController();
    const timer = setTimeout(
        ()=>ctrl.abort(), Math.max(1, opts.timeoutMs)
    );
    try {
        const res = await uFetch(
            url, {
                redirect:"follow",
                signal:ctrl.signal,
                headers: HEADERS
            }
        );
        const status = res.status, html = await res.text();
        /**
         * Using res's content-type we can also find that res is indeed a html not something else like pdf.
         * Though, ignoring this step now but can be implemented in future!
         */
        const $ = loadHtml(html);
        const text = $(
            'body'
        ).text().replace(
            /\s+/g, " " //remove all whitespaces
        ).trim().slice(0,5000); //later can make limit dynamic!

        return {url:res.url || url, status, html, text, $}
    } finally {
        clearTimeout(timer);
    };
}
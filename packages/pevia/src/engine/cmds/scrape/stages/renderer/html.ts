
import { load as loadHtml } from "cheerio";
import { fetch as udFetch } from "undici";

import { ScrapeStages, ScrapePayload } from "../../types.js";

// later better not to put hardcoded headers!
const HEADERS = { 
    'User-Agent': "Mozilla/5.0 (compatible; MediaFetcher/1.x)",
    'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

export const renderHTML = async (
    getPayload:()=>ScrapePayload
):Promise<ScrapeStages['renderer']['res']> => {
    const {globals:{url,cfg}} = getPayload();

    const ctrl = new AbortController();
    const timer = setTimeout(
        ()=>ctrl.abort(), Math.max(1, cfg.crawl.timeoutMs)
    );

    try {
        const res = await udFetch(
            url, {
                redirect:"follow",
                signal:ctrl.signal,
                headers: HEADERS
            }
        );
        const html = await res.text();
        
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

        return {
            ok:true,
            returnValue: {
                $,
                html,
                text
            },
            metadata: {
                res
            }
        } 
    } catch (error) {
        return {
            ok:false,
            error:error as Error,
        }
    } finally {
        clearTimeout(timer)
    }
}
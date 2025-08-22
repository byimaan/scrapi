/**
 * Once when 've <HTML> text extract <img> candidates from HTML:
 *      {src, srcset, lazy-attrs}
 */
import { CheerioAPI, load as loadHtml } from "cheerio";
import { Candidate,Page } from "../types";
import { absolutizeUrl } from "../../util/fs";

// subject to be changed in future if needed!
const attrs = ['alt', 'srcset'];

//Use of lazy attrs can be clue that JS rendering. So this can be better handled using `--render headless` 
const lazyAttrs = ['data-src', 'data-original', 'data-lazy-src'];
export const extractFromHtmlImages = (page:Page, $:CheerioAPI) : Candidate[] => {
    const out: Candidate[] = [];

    const seen = new Set<string>(); //dedupe: remove duplicates 

    $('img').each(
        (_,el) => {
            const $el = $(el);

            const [alt, srcset] = attrs.map(
                attrName => $el.attr(attrName)
            ).map(
                x => (x || "").trim() || undefined 
            );
            
            let lazySrc = "";
            for(let attrName of lazyAttrs){
                lazySrc ||= ($el.attr(attrName) || "").trim()
            };

            const src = $el.attr("src") || "";
            
            //priority: srcset > src > lazySrc
            let chosen:string|undefined = undefined;

            if (srcset){
                /** [Standard of 'srcset']
                 *   srcset="cat-small.jpg 480w,
                 *          cat-medium.jpg 800w,
                 *          cat-large.jpg 1200w"
                 */
                const parts = srcset.split(',').map(
                    s=>s.trim()
                ).filter(Boolean);

                let bestUrl = "", bestW = -1;
                for(let part of parts){
                    const [u,desc] = part.split(/\s+/);
                    if (!u) continue;
                    const w =  desc && (
                           //dgt_followed_by_w_or_x 
                           /(\d+)w/.exec(desc)?.[1]  
                           || /(\d+)x/.exec(desc)?.[1]  
                        ) 
                        ? parseInt(
                            /(\d+)w/.exec(desc)![1]
                            || /(\d+)x/.exec(desc)![1] 
                            , 10
                        )
                        : NaN;
                    
                    if (!isNaN(w) && w>bestW){
                        bestW=w; bestUrl=u;
                    };
                    if (isNaN(w)) bestUrl=u; //initial default fallback
                };
                chosen = bestUrl || src || lazySrc
            } else {
                chosen = src || lazySrc
            };

            if (!chosen) return;
            
            //chosen: arbitrary-path, base-path: page.url
            const abs = absolutizeUrl(chosen,page.url); //normalizing url path
            /*Ignore 'data:' -> embedded inline image resources */
            if (!abs || abs.startsWith('data:')) return;

            // e.g. https://abc.com/page/data.png or https://abc.com/page/data.png?p=12&q=def
            // <data.png> is  our target
            const fileNameHint = abs.split('/').pop()?.split('?')[0] || undefined;

            if (!seen.has(abs)){
                seen.add(abs);
                out.push({
                    pageUrl:page.url,
                    srcUrl:abs,
                    source: srcset ? 'srcset' : (lazySrc ? 'data' : 'html'),
                    alt,
                    fileNameHint
                });
            };
        }
    );

    
    return out;
}
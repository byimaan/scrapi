
import { load as loadHTML } from "cheerio";
import { Candidate,Page } from "../../../../types.js";
import { absolutizeUrl } from "../../../../../util/fs.js";

// subject to be changed in future if needed!
const attrs = ['alt', 'srcset'];

//Use of lazy attrs can be clue that JS rendering. So this can be better handled using `--render headless` 
const lazyAttrs = ['data-src', 'data-original', 'data-lazy-src'];

type ExtractHtmlImgReturnType = {
    ok: true;
    candidates: Candidate[];
    metadata: {}
} | {
    ok: false;
    candidates:Candidate[]
    error: Error;
    metadata: {}
};

export const extractFromHtmlImages =  (
    page:Page
):ExtractHtmlImgReturnType => {

    //Ignoring timeout here! not really needed
    const out :Candidate[] = [], seen = new Set<string>();

    try {
        const $ = page?.$ || loadHTML(page.html);

        $('img').each(
            (_,el) => {
                const $el = $(el);
                const [alt,srcset] = attrs.map(
                    attrName => $el.attr(attrName)
                ).map(val => (val||"").trim() || undefined);

                let lazySrc = "";//Priority: data-src > data-original > data-lazy-src
                for(let lazyAttrName of lazyAttrs){
                    lazySrc ||= ($el.attr(lazyAttrName)||"").trim()
                };

                const src = $el.attr("src")||"";
                //Priority: srcset > src > lazySrc
                let chosen:string|undefined = undefined;

                if (srcset){
                    /** [Standard of 'srcset']
                     *   srcset="cat-small.jpg 480w,
                     *          cat-medium.jpg 800w,
                     *          cat-large.jpg 1200w"
                     */
                    const parts = srcset.split(',').map(
                        part=>part.trim()
                    ).filter(Boolean);

                    let bestUrl = "", bestW = -1; //srcset has multiple images, would prefer largest one.
                    for(let part of parts){
                        const [url,desc] = part.split(/\s+/); //split by empty-gaps
                        if (!url) continue;

                        //extract size digit can be followed by 'w' or 'x'.
                        const getSize = () => /(\d+)w/.exec(desc)?.[1] || /(\d+)x/.exec(desc)?.[1];
                        const w = desc && (
                                    getSize()
                                )
                                ? parseInt(
                                    getSize()!, 10
                                )
                                : NaN;

                        if (!isNaN(w) && w>bestW){
                            bestW=w; bestUrl=url;
                        };
                        if (isNaN(w)) bestUrl=url; //initial default fallback
                    };
                    chosen = bestUrl || src || lazySrc;
                } else {
                    chosen = src || lazySrc;
                };

                if (!chosen) return;

                const abs = absolutizeUrl(
                    chosen, //arbitrary-path
                    page.url //page.url would act as base path
                );

                //Handle if img is imbedded & not coming from any url
                if (!abs || abs.startsWith('data:')) return;

                
                //Filter e.g. https://abc.com/page/data.png / https://abc.com/page/data.png?p=12&q=def
                const fileNameHint = abs.split('/').pop()?.split('?')[0] || undefined;

                if (!seen.has(abs)){
                    seen.add(abs);
                    out.push({
                        pageUrl:page.url,
                        srcUrl:abs,
                        source: srcset ? 'srcset' : (lazySrc ? 'data' : 'html'),
                        alt,
                        fileNameHint
                    })
                };
            }
        );

        return {
            ok:true,
            candidates:out,
            metadata: {}
        };

    } catch (error) {
        return {
            ok:false,
            error:error as Error,
            candidates:out,
            metadata: {}
        }
    }
};
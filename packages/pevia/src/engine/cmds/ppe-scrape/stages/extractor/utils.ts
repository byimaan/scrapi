import { Candidate, Page } from "../../../../types.js";
import { absolutizeUrl }  from "../../utils.js";

const selectBestSrcUrlFromSrcSet = (
    /* e.g.
     * srcset="cat-small.jpg 480w,
     *         cat-medium.jpg 800w,
     *         cat-large.jpg 1200w"
     */
    srcset:string
):string|""=> {
    const parts = srcset.split(',').map(p=>p.trim()).filter(Boolean);
    let bestUrl = "", bestScore = -1;
    for(const part of parts){
        const [url,desc]=part.split(/\s+/);// use whitespace/gap to split
        if (!url) continue;
        // size could followed by 'w'|'x'
        const getSize = () => /(\d+)w/.exec(desc)?.[1] || /(\d+)x/.exec(desc)?.[1];
        const score = desc && (getSize()) 
                    ? (
                        parseInt(getSize()!,10)
                    )
                    : NaN;
        if (isNaN(score)){ // *FUTURE_DEBUG_REF*
            bestUrl=url;//Just default callback value
        } else if (score>bestScore){
            bestScore=score; bestUrl=url
        };
    };
    return bestUrl
};

// most widely used attrs by <img/> tag
const HTML_IMG_ATTRS = ['alt','srcset'];// order matters!
// some webpages prefers to load images lazily
const HTML_LAZY_ATTRS = ['data-src', 'data-original', 'data-lazy-src'];// order matters!

export const extractHtmlImgTagsIntoCandidates = (
    {$,url}:Required<Page>,
):({candidates:Candidate[],error?:Error}) => {
    const candidates:Candidate[] = [], seen = new Set<string>();
    try {
        $('img').each(
            (_,el) => {
                const $el = $(el);

                const [alt,srcset] = HTML_IMG_ATTRS.map(
                    attrName => $el.attr(attrName)
                ).map(val => (val||"").trim() || undefined);

                let lzySrc = "";
                for(const lzy of HTML_LAZY_ATTRS) lzySrc ||= ($el.attr(lzy)||"").trim();

                const src = $el.attr("src")||"";

                // priority: srcset > src > lazySrc
                let chosen:string|undefined = undefined;

                if (srcset){
                    chosen = selectBestSrcUrlFromSrcSet(srcset)||src||lzySrc;
                } else {
                    chosen = src||lzySrc;
                };

                if (!chosen) return;

                const abs = absolutizeUrl(
                    chosen, // arbitrary path
                    url, // base path
                );

                if (!abs || abs.startsWith('data:')) return; // "data:" imbedded image

                // e.g. https://abc.com/page/data.png?p=12&q=def where data.png is filename hint
                const fileNameHint = abs.split('/').pop()?.split('?')[0] || undefined;

                if (!seen.has(abs)){
                    seen.add(abs);
                    candidates.push({
                        pageUrl:url,
                        srcUrl:abs,
                        source: srcset ? 'srcset' : (lzySrc ? 'data' : 'html'),
                        alt,
                        fileNameHint
                    })
                };
            }
        );

        return {
            candidates,
            error:undefined
        };
        
    } catch (e) {
        return {
            candidates,
            error: e instanceof Error ? e : new Error(`An unknown error was occurred while extracting and creating image-candidates out of <img/> tags from "${url}"`)
        }
    };
};

const META_HEAD_ATTRS = [
    "meta[property='og:image'], meta[name='og:image'], meta[property='og:image:url'], meta[property='og:image:secure_url']",
    "meta[name='twitter:image'], meta[name='twitter:image'], meta[name='twitter:image:src']"
];

export const extractHtmlHeadMetaTagsIntoCandidates = (
    {$,url}:Required<Page>
):({candidates:Candidate[],error?:Error}) => {
    const candidates :Candidate[] = [], data = new Set<string>();
    try {
        for(let attr of META_HEAD_ATTRS){
            $(attr).each(
                (_,el) => {
                    const x = $(el).attr('content');
                    if (x && typeof x === 'string') data.add(x)
                }
            )
        };

        for(let arbitraryURL of data){
            const abs = absolutizeUrl(arbitraryURL, url);
            if (!abs || abs.startsWith('data:')) continue;
            const fileNameHint = abs.split('/').pop()?.split('?')[0] || undefined;
            candidates.push({
                pageUrl:url,
                srcUrl:abs,
                source:'og',
                fileNameHint
            });
        };

        return {
            candidates,
            error:undefined
        };

    } catch (e) {
        return {
            candidates,
            error: e instanceof Error ? e : new Error(`An unknown error was occurred while extracting and creating image-candidates out of "<head><meta/></head>" tags from "${url}"`)
        }
    };
};
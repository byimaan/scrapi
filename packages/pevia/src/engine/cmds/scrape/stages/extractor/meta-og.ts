/**
 * (og|twitter) meta attrs
 * When we share link, we get a nice preview box of that link with:-
 *      - image
 *      - title
 *      - description & more...
 * All this happens because of defined og/twitter meta attributes at the target link.
 * Here we would extract them out of head section.
 */

import { load as loadHTML} from "cheerio";
import { Candidate, Page } from "../../../../types";
import { absolutizeUrl } from "../../../../../util/fs";

type ExtractMetaOGReturnType = {
    ok: true;
    candidates: Candidate[];
    metadata: {}
} | {
    ok: false;
    error: Error;
    candidates: Candidate[];
    metadata: {}
};

const ATTRS = [
    "meta[property='og:image'], meta[name='og:image'], meta[property='og:image:url'], meta[property='og:image:secure_url']",
    "meta[name='twitter:image'], meta[name='twitter:image'], meta[name='twitter:image:src']"
];

export const extractFromMetaOG = (
    page:Page
):ExtractMetaOGReturnType => {
    const out :Candidate[] = [], data = new Set<string>();

    try {
        const $ = page?.$ || loadHTML(page.html);
        for(let atr of ATTRS){
            $(atr).each(
                (_,el) => {
                    const val = $(el).attr('content');
                    if (val && typeof val === 'string') data.add(val)
                }
            )
        };

        for(let arbitraryUrl of data){
            const abs = absolutizeUrl(arbitraryUrl, page.url);
            if (!abs || abs.startsWith('data:')) continue;
            const fileNameHint = abs.split('/').pop()?.split('?')[0] || undefined;
            out.push({
                pageUrl:page.url,
                srcUrl:abs,
                source:'og',
                fileNameHint
            })
        };

        return {
            ok:true,
            candidates:out,
            metadata: {}
        };

    } catch (error) {
        return {
            ok:false,
            error,
            candidates:out,
            metadata: {}
        }
    }
};
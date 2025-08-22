/**
 * (og|twitter) meta attrs
 * When we share link, we get a nice preview box of that link with:-
 *      - image
 *      - title
 *      - description & more...
 * All this happens because of defined og/twitter meta attributes at the target link.
 * Here we would extract them out of head section.
 */

import { CheerioAPI } from "cheerio";
import { Candidate, Page } from "../types";
import { absolutizeUrl } from "../../util/url";

export const extractFromMetaOG = (page:Page, $:CheerioAPI):Candidate[] =>{
    const out:Candidate[] = [];

    const attrs = [
        "meta[property='og:image'], meta[name='og:image'], meta[property='og:image:url'], meta[property='og:image:secure_url']",
        "meta[name='twitter:image'], meta[name='twitter:image'], meta[name='twitter:image:src']"
    ];
    const data = new Set<string>();
    for(let attr of attrs){
        $(attr).each(
            (_,el) => {
                const val = $(el).attr('content');
                if (val && typeof val === 'string') data.add(val)
            }
        )
    };

    for(let val of data){
        const abs = absolutizeUrl(val, page.url);
        if (!abs ||  abs.startsWith('data:')) continue;
        const fileNameHint = abs.split('/').pop()?.split('?')[0] || undefined;
        out.push({
            pageUrl:page.url,
            srcUrl:abs,
            source:'og',
            fileNameHint
        })
    }

    return out
}
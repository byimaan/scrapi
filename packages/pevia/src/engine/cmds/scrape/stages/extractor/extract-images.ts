
import { ScrapeStages, ScrapePayload } from "../../types.js";
import { extractFromHtmlImages } from "./html-images.js";
import { extractFromMetaOG } from "./meta-og.js";
import { text, wrapText } from "../../../../../util/log.js";

//Some util fns limited to this file only
const logUrlAndCount = (cnt:number,url:string) => {
    text.icon(i=>i.info).line(
        cx => cx.green.write('Found')
            + " " + (
            cnt 
                ? cx.yellow.write(cnt)
                : cx.red.write(cnt)
            )
            + " " 
            + cx.green.write('image urls from ') 
            + cx.underline.green.write(url)
    ).log();
};
const logExtractError = (error:Error,url:string) => {
    text.icon(i=>i.warn).line(
        cx => cx.yellow.write('Encountered error during extraction of html-images from ') + cx.underline.green.write(url)
    ).log();
    text.line(
        cx => " ".repeat(4) 
                + cx.red.write(`<${error.name}>: `) 
                + cx.yellow.write(wrapText(error.message||"",28))
    ).log();
}

export const extractImages = async (
    getPayload: ()=>ScrapePayload
):Promise<ScrapeStages['extractor']['res']> => {
    const {page,cfg} = getPayload().globals as Required<ScrapePayload['globals']>;

    text.icon(i=>i.search).line(
        cx => cx.blue.write('Extracting data from </img> elements at ')
                + cx.underline.green.write(page.url)
    ).log();

    const htmlImgRes = extractFromHtmlImages(page);

    //log html-images count
    logUrlAndCount(htmlImgRes.candidates.length,page.url);
    
    let candidates = htmlImgRes.candidates;

    //Don't throw but only log the error on CLI
    if (!htmlImgRes.ok) logExtractError(htmlImgRes.error,page.url);

    if (cfg.extract.opengraph){
        text.icon(i=>i.search).line(
            cx => cx.blue.write('Extracting data from </meta> [og:image|twitter:image] at ')
                    + cx.underline.green.write(page.url)
        ).log();

        const metaOgRes = extractFromMetaOG(page);

        logUrlAndCount(metaOgRes.candidates.length, page.url);

        if (!metaOgRes.ok) logExtractError(metaOgRes.error,page.url);

        candidates = [...candidates, ...metaOgRes.candidates]
    };

    return {
        ok:true,
        metadata: {},
        returnValue: {
            candidates,
        }
    }
};
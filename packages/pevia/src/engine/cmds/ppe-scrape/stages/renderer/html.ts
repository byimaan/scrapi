import { useScrapePipe } from "../../run.js";
import { fetch as undiciFetch } from "undici";
import { load as loadHTML } from "cheerio";
import { StageAsyncHandler } from "../../../../../util/ppe.js";
import { ReturnTypeRendererStage } from "./index.js";

// later better not to put hardcoded headers!
const HEADERS = { 
    'User-Agent': "Mozilla/5.0 (compatible; MediaFetcher/1.x)",
    'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};
const MAX_HTML_BODY_LENGTH = 5000;

export const renderByHtmlAsyncHandler:StageAsyncHandler<ReturnTypeRendererStage> = async () => {
    const {getSchemaConfig} = useScrapePipe();
    const {url, crawl:{timeoutMs}} = getSchemaConfig();

    const ctrl = new AbortController(), timer = setTimeout(
        () => ctrl.abort(), Math.max(1,timeoutMs)
    );

    try {
        const res = await undiciFetch(
            url, {
                redirect:'follow',
                signal:ctrl.signal,
                headers:HEADERS
            }
        ), html = await res.text();

        const $ = loadHTML(html);
        const text = $('body').text().replace(
            /\s+/g, " " //remove all whitespaces
        ).trim().slice(0,MAX_HTML_BODY_LENGTH);

        return {
            status: 'success',
            response: {
                $,
                html,
                text,
                url,
                status:res.status,
            },
            metadata: {
                explicitStageName: "RENDERER_BY_HTML_STAGE",
            }
        };

    } catch (e) {
        if (e instanceof Error && e.name === "AbortError"){ //Better to have a error clue of AbortError
            return {
                status: 'failed',
                reason: `Timeout! because "RENDERER_BY_HTML_STAGE" took more than expected time of ${timeoutMs} ms.`,
                error: e,
                metadata: {
                    explicitStageName: "RENDERER_BY_HTML_STAGE",
                }
            }
        };
        //returning {status:"failed",...} is an optional because pipe could handle error by itself!
        throw e instanceof Error ? e : new Error(
            `An unknown error occurred in "RENDERER_BY_HTML_STAGE" while fetching or parsing </> HTML from the source url:${url}`
        );
    } finally {
        clearTimeout(timer);
    };
};


import { ScrapeGlobals, ScrapeStages } from "./types.js";
import { renderHTML } from "./stages/renderer/html.js";
import { extractImages } from "./stages/extractor/extract-images.js";
import { filterCandidates } from "./stages/filterer/filter-candids.js";
import { pipeline } from "../../../util/pipeline.js";
import { text } from "../../../util/log.js";
import { ResolveConfig } from "../../../config/schema.js";
import { fsManager } from "./stages/fs-manager/file-system.js";

/**
 * This pipeline work per Page not handles multiple Pages!
 */

const PIPELINE_NAME = 'ScrapePipeline';
const PIPELINE_DESCRIPTION =   
       `
        A pipeline that scrapes <url> by obeying configuration with following stages
            - Renderer: fetch the HTML from target <url>.
            - Extractor: extract images/videos out of HTML.
            - Filter: filter desired images according topic and configuration.
            - Download/FsSTORE: Handles file-system and downloading logic & maintain state logs.
        `;

const defaultStage = (stageName:string) => {
    return {
        description: `<${stageName}-description>`,
        res: {
            ok:false,
            error: new Error(`Pipeline-${PIPELINE_NAME}; Stage-${stageName} Stage was defined but its response was never set/updated.`),
            metadata: {}
        }
    } as const
};


export const scrapePipeline = async (url:string,cfg:ResolveConfig) => {
    /**
     * IMPORTANT: In beta-version we working on only depth=0
     *      So consider a major change in future in PIPELINE's state.
     */
    const pl = pipeline<ScrapeGlobals,ScrapeStages>(PIPELINE_NAME)(PIPELINE_DESCRIPTION)({
        globals: {
            page:undefined,
            url,
            cfg
        },
        stages: {
            'renderer': defaultStage('renderer'),
            'extractor':defaultStage('extractor'),
            'filterer':defaultStage('filterer'),
            'fs-manager':defaultStage('fs-manager'),
        },
    });

    // ==================== RENDERER ====================

    text.icon(i=>i.pipeline).line(
        cx => cx.cyan.write(`Setting up <${PIPELINE_NAME}> pipeline`)
    ).log();
    
    text.icon(i=>i.network).line(
        cx => cx.cyan.write('Trying to fetch </> HTML from ') + cx.underline.green.write(url)
    ).log();

    await pl.stage( // version-beta not yet covers headless fetching
        'renderer',
        `Fetch HTML from <url:${url}>`,
        renderHTML
    );

    
    await pl.middleware(// Update Global attrs from <renderer> & do some logs
        async (getPayload) => {
            const payload = getPayload();
            const res = payload.stages.renderer.res;

            if (res?.metadata?.ms !== undefined){ //log execution time
                text.icon(i=>i.timer).line(
                    cx=>cx.italic.yellow.write('' + (res.metadata?.ms || 0) + ' ms')
                ).log();
            };

            if (res.ok){ // Set Global attrs that may needed by other stages
                text.icon(i=>i.success).line(
                    cx=>cx.green.write('Fetched </> HTML from ')+cx.underline.green.write(url)
                ).log();

                const {$,html,text:htmlText} = res.returnValue;
                payload.globals.page = {
                    $,
                    html,
                    text:htmlText,
                    url,
                    status:res?.metadata?.res?.status!
                };
                
            } else { 
                /**
                 * IMPORTANT : In future, we an do better logging and handling of Abort Error <Timeout>
                 *      Will just throw error for now! 
                 */
                text.icon(i=>i.error).line(
                    cx=>cx.red.write('Failed to fetch </> HTML from ')+cx.underline.green.write(url)
                ).log();
                text.icon(i=>i.back).line(
                    cx => cx.yellow.write('exiting...\n')
                ).log();
                throw res.error;
            };
            return payload
        }
    );

    // ==================== EXTRACT ====================

    text.icon(i=>i.trace).line(
        cx=>cx.cyan.write(`Looking for images/videos to extract`)
    ).log();

    await pl.stage(
        'extractor',
        `Extract all the images/video from ${url}`,
        extractImages
    ); 
    //filterer 

    text.icon(i=>i.success).line(
        cx=>cx.green.write("'Extractor' stage completed!")
    ).log();


    // ==================== FILTERING ====================
    // Filter images according ext, alt and a lot more
    text.icon(i=>i.trim).line(
        cx=>cx.blue.write("Kicking up 'filterer' stage to refine the extracted images")
    ).log();

    text.icon(i=>i.warn).line(
        cx => cx.yellow.write(`Notice: `)+cx.cyan.write('Filtering images is not supported in beta-version')
    ).log();

    await pl.stage(
        'filterer',
        "'Filter' stage that filters out extracted images",
        filterCandidates
    );

    text.icon(i=>i.success).line(
        cx=>cx.green.write("'Filterer' stage completed!")
    ).log();

    text.icon(i=>i.info).line(
        cx=>cx.blue.write(`'fs-manager': `)+cx.cyan.write('Download and manage files')
    ).log()

    await pl.stage(
        'fs-manager',
        "Downloads and manage directories and their corresponding files",
        fsManager
    );

    return pl

};
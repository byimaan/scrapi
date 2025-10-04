import { createPipe,AsyncStageSkeleton,StageSkeleton } from "../../../util/ppe.js";

export const SCRAPE_PIPE  = createPipe(
    'SCRAPE_PIPELINE'
).whatDoesPipeDo(
    `
    "SCRAPE_PIPELINE" scrapes media content from provided <url>. It has following four stages/components.
        RENDERER: Fetch </> HTML from target <url>
        EXTRACTOR: Extract images/videos while excluding other html content
        FILTER: Filter the extracted media according to desired content type.
        FILE_MANAGER: Manages file system, how and where files will be stored.
    `
);


export const defineAsyncScrapeStage = <T>(
    cfb:((scrape_pipe:typeof SCRAPE_PIPE)=>AsyncStageSkeleton<T>)
) => {
    return {
        create: () => cfb(SCRAPE_PIPE)
    }
};

export const defineScrapeStage = <T>(
    cfb:((scrape_pipe:typeof SCRAPE_PIPE)=>StageSkeleton<T>)
) => {
    return {
        create: () => cfb(SCRAPE_PIPE)
    }
};

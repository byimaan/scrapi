import { ResolveConfig } from "../../../config/schema.js";
import { SCRAPE_PIPE } from "./ppe.js";
import { scrapeSummaryFollowupCallback } from "./followups.js";

import { RENDERER_STAGE,ReturnTypeRendererStage } from "./stages/renderer/index.js";
import { EXTRACTOR_STAGE, ReturnTypeExtractorStage } from "./stages/extractor/index.js";
import { ENSURE_SRC_DIR_STAGE, ReturnTypeEnsureSrcDirStage } from "./stages/fs-stages/src-folder.js";
import { DOWNLOAD_THEN_FILTER_STAGE, ReturnTypeDownloadThenFilterStage } from "./stages/fs-stages/download-then-filter.js";
import { AUDIT_LOGS_STAGE, ReturnTypeAuditLogStage } from "./stages/fs-stages/audit-logs.js";


let schemaConfig:undefined|ResolveConfig & {url:string} = undefined;

export const useScrapePipe = () => ({
    getSchemaConfig: () => {
        if (schemaConfig===undefined){
            throw new Error(
                `Expected 'schemaConfig' to be of type ResolveConfig but found undefined.
                    It might could have happened because 'useScrape' was invoked before running the 'SCRAPE_PIPE'.
                `)
        };
        return schemaConfig
    },
    usePipeTools: () => SCRAPE_PIPE.useTools()
});

export const scrapePipe = {
    run: async (cfg:ResolveConfig&{url:string}) => {
        schemaConfig = cfg;
        
        const {getSchemaConfig} = useScrapePipe();
        const {render} = getSchemaConfig();

        
        await SCRAPE_PIPE.fromMustAsyncStage<ReturnTypeRendererStage>(
            RENDERER_STAGE.setBy(render).create()
        );

        SCRAPE_PIPE.onlyThenStage<ReturnTypeExtractorStage>(
            EXTRACTOR_STAGE.create()
        );

        await SCRAPE_PIPE.onlyThenAsyncStage<ReturnTypeEnsureSrcDirStage>(
            ENSURE_SRC_DIR_STAGE.create() // ensure srcfolder exist and applies folderTemplate customization
        );

        await SCRAPE_PIPE.onlyThenAsyncStage<ReturnTypeDownloadThenFilterStage>(
            DOWNLOAD_THEN_FILTER_STAGE.create() // download each candidate and write them in file
        );

        await SCRAPE_PIPE.onlyThenAsyncStage<ReturnTypeAuditLogStage>(
            AUDIT_LOGS_STAGE.create()
        );

        const stats = SCRAPE_PIPE.finish();
        
        SCRAPE_PIPE.withFollowUp( // just an extra add-on
            createFollowup => createFollowup(
                'printScrapePipeInsights',
                'This followup prints status of each stage and more insights about pipe.',
            )(
                scrapeSummaryFollowupCallback
            )
        )

        //At end could reset 'schemaConfig' back to undefined!
        schemaConfig = undefined;

        return stats
    },
};
import path from "node:path";
import { defineAsyncScrapeStage } from "../../ppe.js";
import { useScrapePipe } from "../../run.js";
import { DOWNLOAD_STAGE_NAME, ReturnTypeDownloadStage } from "./download.js";
import { writeFile } from"node:fs/promises";

export const AUDIT_LOGS_STAGE_NAME = "AUDIT_LOGS_STAGE";

const WHAT_DOES_AUDIT_LOGS_STAGE_DO = 
    `
    "AUDIT_LOGS_STAGES" is one of the final stages of "SCRAPE_PIPE" with the responsibility to log how much content was saved or was failed during the the download phase.
        It depends on "DOWNLOAD_STAGE" to continue its work to write logs.
        In beta version it might would only use 'json' format to write logs and will skip the 'csv' format.
    `;

export type ReturnTypeAuditLogStage = {
    absAuditLogsPath:string
};

export const AUDIT_LOGS_STAGE = defineAsyncScrapeStage<ReturnTypeAuditLogStage>(
    SCRAPE_PIPE => (
        SCRAPE_PIPE.createStage(
            AUDIT_LOGS_STAGE_NAME
        ).whatDoesStageDo(
            WHAT_DOES_AUDIT_LOGS_STAGE_DO
        ).handledAsyncBy<ReturnTypeAuditLogStage>(
            async ({getStageStateIfSuccessElseThrowError}) => {
                const {getSchemaConfig, usePipeTools} = useScrapePipe();
                const {output:{meta}}  = getSchemaConfig(), {cli} = usePipeTools();
                const {response:{absSrcDirPath,saved,failed}} = getStageStateIfSuccessElseThrowError<ReturnTypeDownloadStage>(DOWNLOAD_STAGE_NAME);
        
                if (meta !== 'json'){
                    cli.text.icon(i=>i.info).line(
                        cx=>cx.yellow.write(`"${meta}" format is not yet implemented. So switching back to "json" format to write audit logs.`)
                    ).log()
                };
        
                const absAuditLogsPath = path.resolve(absSrcDirPath,`./audit-logs.json`)
        
                const json = JSON.stringify(
                    {saved, failed},
                    null, 
                    2
                );
        
                cli.text.icon(i=>i.file).line(
                    cx=>cx.green.write(`Audit logs has got set to be written at "${cx.underline.write(absAuditLogsPath)}".`)
                ).log();
        
                await writeFile(absAuditLogsPath,json)
        
                return {
                    status:'success',
                    response: {
                        absAuditLogsPath,
                    },
                    metadata: {},
                }
            }
        )
    )
)

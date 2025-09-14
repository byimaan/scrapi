import { defineScrapeStage } from "../../ppe.js";
import { useScrapePipe } from "../../run.js";
import { EXTRACTOR_STAGE_NAME, ReturnTypeExtractorStage } from "../extractor/index.js";

export const FILTERER_STAGE_NAME = "FILTERER_STAGE";

const WHAT_DOES_STAGE_DO = 
    `
    "FILTERER_STAGE" depends on "${EXTRACTOR_STAGE_NAME}" with responsibility to filter data according to desired outcome and provided schema constraints.
        It's response is same as of "${EXTRACTOR_STAGE_NAME}" but filtered.
        Note: The actual filtering logic is not yet implemented in beta version.
    `;

export type ReturnTypeFiltererStage = ReturnTypeExtractorStage;


export const FILTERER_STAGE = defineScrapeStage<ReturnTypeFiltererStage>(
    SCRAPE_PIPE => (
        SCRAPE_PIPE.createStage(
            FILTERER_STAGE_NAME
        ).whatDoesStageDo(
            WHAT_DOES_STAGE_DO
        ).handledBy<ReturnTypeFiltererStage>(
            ({getStageStateIfSuccessElseThrowError}) => {
                const extractorState = getStageStateIfSuccessElseThrowError<ReturnTypeExtractorStage>(EXTRACTOR_STAGE_NAME);
                const {usePipeTools} = useScrapePipe(), {cli} = usePipeTools();

                cli.text.icon(i=>i.info).line(
                    cx=>`${cx.yellow.write('"'+FILTERER_STAGE_NAME+'"')}: Actual filtering logic is not covered in beta-version.`
                ).log();
                
                cli.text.icon(i=>i.info).line(
                    cx => cx.green.write('There were total of ') +cx.yellow.write(extractorState.response.totalCandidates)+ cx.green.write(' candidates were extracted.')
                ).log();
                return extractorState;
            }
        )
    )
)
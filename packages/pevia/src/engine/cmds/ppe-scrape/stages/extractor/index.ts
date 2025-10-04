import { Candidate } from "../../../../types.js";
import { defineScrapeStage } from "../../ppe.js";
import { useScrapePipe } from "../../run.js";
import { RENDERER_STAGE_NAME, ReturnTypeRendererStage } from "../renderer/index.js";
import { extractHtmlHeadMetaTagsIntoCandidates, extractHtmlImgTagsIntoCandidates } from "./utils.js";

export const EXTRACTOR_STAGE_NAME = "EXTRACTOR_STAGE";

const WHAT_DOES_STAGE_DO = 
    `
    "EXTRACTOR_STAGE" depends on "${RENDERER_STAGE_NAME}" and extracts media content according to </> HTML tags.
        At current it is capable to extracts data from two main sources:
            [1] <img/> tags are set to always be extracted.
            [2] <meta/> (optional only if '--opengraph' set to true) to extract opengraph (og:twitter) images.
    `;

export type ReturnTypeExtractorStage = {
    totalCandidates: number,
    extractedTags: {
        "img": {
            wasInvoked: true
            candidates:Candidate[],
            suppressedError?:Error
        };
        "opengraph": {
            wasInvoked:boolean,
            candidates:Candidate[],
            suppressedError?:Error
        }
    }
};

export const EXTRACTOR_STAGE = defineScrapeStage<ReturnTypeExtractorStage>(
    SCRAPE_PIPE => (
        SCRAPE_PIPE.createStage(
            EXTRACTOR_STAGE_NAME
        ).whatDoesStageDo(
            WHAT_DOES_STAGE_DO
        ).handledBy<ReturnTypeExtractorStage>(
            ({getStageStateIfSuccessElseThrowError}) => {
                const {getSchemaConfig} = useScrapePipe();
                const rendererState = getStageStateIfSuccessElseThrowError<ReturnTypeRendererStage>(RENDERER_STAGE_NAME);
        
                const {response:page} = rendererState;
                const {extract:{opengraph:includeOpengraph}} = getSchemaConfig();
        
                // <img/>
                const extractedImgTags = extractHtmlImgTagsIntoCandidates(page);
                const img:ReturnTypeExtractorStage['extractedTags']['img'] = {
                    wasInvoked:true,
                    candidates:extractedImgTags.candidates,
                    suppressedError:extractedImgTags.error
                };
        
        
                let opengraph:ReturnTypeExtractorStage['extractedTags']['opengraph'] = {
                    wasInvoked:false,
                    candidates:[],
                    suppressedError:undefined
                };
        
                if (includeOpengraph){
                    const extractedMetaTags = extractHtmlHeadMetaTagsIntoCandidates(page);
        ;           opengraph = {
                        wasInvoked:true,
                        candidates:extractedMetaTags.candidates,
                        suppressedError:extractedMetaTags.error
                    }
                };
                
                let totalCandidates = img.candidates.length+opengraph.candidates.length;
        
                const response:ReturnTypeExtractorStage = {
                    totalCandidates,
                    extractedTags: {img, opengraph}
                };
                
                const suppressedError = img.suppressedError || opengraph.suppressedError;
                if (!totalCandidates && suppressedError instanceof Error){// zero candidates
                    // If there is no image candidate and an suppressed error exist then error must no longer be suppressed
                    throw suppressedError
                };
        
                return {
                    status:'success',
                    response,
                    metadata: {
                        includeOpengraph,
                    }
                };
            }
        )
    )
);
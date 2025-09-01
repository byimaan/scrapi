/**
 * Ignoring for beta version.
 * For beta will simply return back the already extracted images
 */

import { ScrapePayload, ScrapeStages } from "../../types";

export const filterCandidates = async (
    getPayload:()=>ScrapePayload
):Promise<ScrapeStages['filterer']['res']> => {

    try {
        const {stages:{extractor:{res}}} = getPayload();
        
        //skipping filtering for prototype version
        const filteredCandidates = res.ok ? res.returnValue.candidates : [];
        return {
            ok:true,
            returnValue:{
                filteredCandidates
            },
            metadata: {}
        }
    } catch (error) {
        return {
            ok:false,
            error,
            metadata:{},
        }
    }
    
}
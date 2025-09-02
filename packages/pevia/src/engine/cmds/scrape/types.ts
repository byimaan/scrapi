import { CheerioAPI } from "cheerio";
import { Response as UResponse } from "undici";
import { Candidate,Page, } from "../../types.js";
import { ResolveConfig } from "../../../config/schema.js";
import { PipelineStage,PipelinePayload } from "../../../util/pipeline.js";


/*****************************SCRAPE-PIPELINE*****************************/

export type ScrapeGlobals = {
    page?:Page;
    url:string;
    cfg:ResolveConfig;
};

export type ScrapeStages =  {
    'renderer': 
        PipelineStage<
            {$:CheerioAPI,html:string,text:string},/*RETURN-VALUE*/
            {res?:UResponse}/*OPTIONAL-METADATA*/
        >;
    'extractor':
        PipelineStage<
            {candidates:Candidate[]},/*RETURN-VALUE*/
            {}/*METADATA*/
        >;
    'filterer':
        PipelineStage<
            {filteredCandidates:Candidate[]},/*RETURN-VALUE*/
            {}/*METADATA*/
        >;
    'fs-manager':
        PipelineStage<
            {outDirAbs:string;manifestOutAbs:string,history:FileWriteHistory}, /*RETURN-VALUE*/
            {stats?:{downloaded:number;failed:number;skipped:number}}/*OPTIONAL-METADATA*/
        >;
};

export type ScrapePayload = PipelinePayload<ScrapeGlobals,ScrapeStages>



/*****************************FILESYSTEM*****************************/
export type DownloadOK = { 
    ok:true;
    buffer:Uint8Array;
    mime?:string;
    finalUrl?:string;
    metadata: {ms:number}
};

export type DownloadNotOK = {
    ok:false;
    error:Error;
    metadata:{ms:number}
};
//downloadBinary
export type DownloadReturnType = DownloadOK | DownloadNotOK;

type ManifestRow = Candidate & {
    topic:string;
    ts:string;
    ms?:number;
};

export type SavedRow = ManifestRow & {
    status:'saved',
    hash8:string;
    ext:string;
    mime:string;
    bytes:number;
    savedPath:string
}

export type FileWriteHistory = {
    'saved': SavedRow[];
    'failed': (ManifestRow&{status:'failed',reason:string,})[];
    'skipped': (ManifestRow&{status:'skipped',topic?:string,reason:string})[]
}
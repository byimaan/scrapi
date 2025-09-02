
export type PipelinePayload<G,S> = {
    pipeName: string,
    pipeDescription:string,
    globals : G,
    stages: S
};

export type StageResult<T, M> = 
  | { ok: true;  returnValue: T; metadata?: {ms?:number} & M }
  | { ok: false; error: Error;  metadata?: {ms?:number} & M };


export type StageCallback<P,T,M> = (getPayload:()=>P) => Promise<
    StageResult<T,M>
>;

export type PipelineStage<T/*ReturnType*/,M/*METADATA*/> = {
    description:string;
    res: StageResult<T,M>
};

class Pipeline <
    G,/**GLOBALS*/
    S/**STAGES*/
> {
    constructor(public payload:PipelinePayload<G,S>){
        this.payload=payload;
    };

    async middleware(
        //Main purpose of middleware is to update payload before it get passed to upcoming stages
        // & can do any type of verification check 
        cfn: (getPayload:() => typeof this.payload) => Promise<typeof this.payload>
    ){
        this.payload = await cfn(
            () => {return this.payload}
        )
        return this;
    };

    async stage<T,M>(
        name:string,
        description:string,
        cfn:StageCallback<typeof this.payload,T,M>,
        handleError=(error:Error)=>{throw error}
    ){
        const t0 = Date.now();
        try { 
            const res = await cfn(
                () => {return this.payload}
            );
            
            if (res.metadata === undefined) res.metadata = {} as {}&M;
            res.metadata.ms = Date.now()-t0;
            
            //@ts-ignore
            this.payload.stages[name]  = {
                description,
                res
            }
            
        } catch (error) {
            //@ts-ignore
            this.payload.stages[name]  = {
                description,
                res:{
                    ok:false,
                    error:error as Error,
                    metadata: {
                        ms: Date.now()-t0
                    }
                }
            }
            handleError(error as Error); //Easily pluggable error handler 
        };

        return this
    };

    async launch(){
        return this.payload
    }
};

export const pipeline = <G,S>(pipeName:string) => {
    return (pipeDescription:string) => {
        return (
            args:{globals:G;stages:S}
        ) => (
            new Pipeline<G,S>({
                pipeName,
                pipeDescription,
                globals:args.globals,
                stages:args.stages,
            })
        )
    }
};

import { text } from "./log.js";

type FailedState = {
    status: 'failed';
    reason: string;
    error: Error;
    metadata: Record<string,string|number|boolean>;
};

type UnsetState = {
    status: 'unset';
    reason: string;
    metadata: Record<string,string|number|boolean>;
};

type SuccessState<T> = {
    status: 'success';
    response: T;
    metadata: Record<string,string|number|boolean>;
};

type SkippedState = {
    status: 'skipped';
    reason: string;
    metadata: Record<string,string|number|boolean>;
}


type Stage<T> = {
    idx:number;
    name:string;
    desc:string;
    isMust:boolean;
    dependency: {
        isDependent: true;
        dependsOn: string;
        dependsOnIdx: number;
    } | {
        isDependent: false
    };
    state: UnsetState | SuccessState<T> | FailedState | SkippedState;
};

const cloneStage = <T>(stage:Stage<T>):Stage<T> => {
    return {
        ...stage,
        dependency: {
            ...stage.dependency
        },
        state: {
            ...stage.state
        }
    }
};

// type HandlerProps = {
//     getStageState: <U>(stageNameOrIdx:string|number) => Stage<U>['state'], 
//     getStageStateIfSuccessElseThrowError: <U>(id:number|string) =>  SuccessState<U>;
// };

export type StageHandler<T> = (args:PipeUseTools) => Stage<T>['state'];

export type StageAsyncHandler<T> = (args:PipeUseTools) => Promise<Stage<T>['state']>;

export type StageSkeleton<T> = {unassignedStage:Omit<Stage<T>,'idx'>,handler:StageHandler<T>};
export type AsyncStageSkeleton<T> = {unassignedStage:Omit<Stage<T>,'idx'>,asyncHandler:StageAsyncHandler<T>};

export type PipeUseTools = {
    cli:{
        text:typeof text
    },
    getStageState:<U>(idxOrName:string|number)=>Stage<U>['state'],
    getPrevStageState:<U>()=>Stage<U>['state'],
    getPrevStageStatus:()=>Stage<any>['state']['status'],
    getStageStateIfSuccessElseThrowError: <U>(idxOrName:string|number)=>SuccessState<U>,
    getStages: () => Stage<unknown>[]
} 

export type FollowUseToolsCallback = (
    tools:PipeUseTools
) => void

export type FollowupCallback = (name:string,whatDoesItDo:string) => (
    UseTools: FollowUseToolsCallback
) => FollowUseToolsCallback;

export class Pipeline {
    private stages:Stage<unknown>[] = [];
    private idxMap: Record<string,number> = {};
    private mustStageIds:number[] = [];
    private isFromInvoked = false;
    // private handlerProps:HandlerProps = { //depreciated...
    //     getStageState: <T>(id: number | string) => this.getStageState<T>(id),
    //     getStageStateIfSuccessElseThrowError: <T>(id:number|string) => this.getStageStateIfSuccessElseThrowError<T>(id),
    // };
    private stats:Record<'success'|'failed'|'skipped'|'unset',number[]> = {
        success:[],failed:[],skipped:[], unset:[]
    };
    constructor(
        private name:string,
        private desc:string
    ){
        this.name=name;
        this.desc=desc;
    };

    description(){
        return this.desc;//may would describe what does it do!
    };

    private getStage<T>(
        stageNameOrIdx:number|string
    ):Stage<T>{
        const idx = typeof stageNameOrIdx === 'string'
                    ? (this.idxMap[stageNameOrIdx] ?? -1)
                    : stageNameOrIdx;

        if (idx>=0 && idx<this.stages.length){
            return cloneStage<any>(this.stages[idx]) as Stage<T>;
        } else {
            throw new Error(`Pipeline:${this.name} not yet have stage with stageNameOrIdx equals ${stageNameOrIdx}`)
        };
    };
    private getStageState<T>(stageNameOrIdx:number|string):Stage<T>['state']{
        return this.getStage<T>(stageNameOrIdx).state;
    };

    private getStageStateIfSuccessElseThrowError<T>(stageNameOrIdx:number|string):SuccessState<T>{
        const state = this.getStageState<T>(stageNameOrIdx);
        if (state.status!=='success'){
            throw new Error(`Expected status of stageNameOrIdx:${stageNameOrIdx} to be 'success' but found ${state.status}`)
        };
        return state
    };

    private updateStatsAfterPush(
        idx:number
    ){
        const {status} = this.getStageState<any>(idx);
        this.stats[status].push(idx);
    };

    private pushStageWithIdx<T>(
        unassignedStage:Omit<Stage<T>,'idx'>
    ):Stage<T>{
        if (!this.isFromInvoked){
            throw new Error(`Pipeline's first stage must only be defined by either 'fromStage' or 'fromAsyncStage'. It seems like a different method was used to define first stage`)
        };
        if (unassignedStage.name in this.idxMap){
            throw new Error(`Each Pipeline's stageName should be unique but found duplicate of '${unassignedStage.name}'`)
        };
        //Object.freeze can be a option in future.
        const stage:Stage<T> = {
            ...unassignedStage,
            idx: this.stages.length,
        };
        this.idxMap[stage.name] = stage.idx;
        if (stage.isMust) this.mustStageIds.push(stage.idx);
        this.stages.push(
            cloneStage<T>(stage)
        );
        this.updateStatsAfterPush(stage.idx);
        return stage
    };

    private filterStageBeforeExec<T>( //useful to identify if a stage should be skipped
        unassignedStage:Omit<Stage<T>,'idx'>,
        overwrites?:Partial<Stage<T>>
    ):Omit<Stage<T>,'idx'>{
        if (overwrites && Object.keys(overwrites).length){
            unassignedStage = {
                ...unassignedStage, 
                ...(overwrites),
            };
        };

        const isIndependent = !unassignedStage.dependency.isDependent;
        const m = this.mustStageIds.length;


        if (isIndependent && m>0){
            const dependsOnStage = this.getStage<any>(this.mustStageIds[m-1]);
            unassignedStage.dependency = {
                isDependent:true,
                dependsOn: dependsOnStage.name,
                dependsOnIdx: dependsOnStage.idx
            }
        };  

        if (unassignedStage.dependency.isDependent){
            const {dependsOnIdx} = unassignedStage.dependency;
            const {name, state:{status}} = this.getStage<any>(dependsOnIdx);
            if (status !== 'success'){
                const reason = `${unassignedStage.name} was skipped (not executed) because the stage it depends on, named '${name}' is not successful and set to '${status}'`;
                unassignedStage.state = {
                    status:"skipped",
                    reason,
                    metadata:{}
                };
            }
        };
        return unassignedStage
    };
    private ThenStage<T>(
        skeleton:StageSkeleton<T>,
        overwrites?:Partial<Stage<T>>
    ){
        const {unassignedStage:ufs,handler} = skeleton;
        const unassignedStage = this.filterStageBeforeExec<T>(ufs,overwrites);
        try {
            if (unassignedStage.state.status === 'unset'){
                unassignedStage.state = handler(this.useTools())
            }
        } catch (e) {
            const reason = `Expected Stage<T> but ${unassignedStage.name}'s handler threw an error.`
            unassignedStage.state = {
                status: "failed",
                error: e instanceof Error ? e : new Error(reason),
                reason,
                metadata:{}
            }
        };
        this.pushStageWithIdx<T>(unassignedStage);
        return this
    };
    thenStage<T>(
        skeleton:StageSkeleton<T>
    ){
        return this.ThenStage<T>(skeleton)
    };

    thenMustStage<T>(
        skeleton:StageSkeleton<T>
    ){
        return this.ThenStage<T>(skeleton, {isMust:true})
    };

    onlyThenStage<T>(
        skeleton:StageSkeleton<T>,
    ){
        // const dependsOnStage = this.stage  Will continue from here...
        const n = this.stages.length;
        if (!n){
            throw new Error(`Pipeline's first stage must only be defined by either 'fromStage' or 'fromAsyncStage'. It seems like a different method was used to define first stage`)
        };
        const dependsOnStage = this.getStage<any>(n-1);
        const dependency:Stage<T>['dependency'] = {
            isDependent: true,
            dependsOn: dependsOnStage.name,
            dependsOnIdx: dependsOnStage.idx
        };
        return this.ThenStage<T>(skeleton, {dependency})
    };

    async onlyThenAsyncStage<T>(
        skeleton:AsyncStageSkeleton<T>
    ){
        const n = this.stages.length;
        if (!n){
            throw new Error(`Pipeline's first stage must only be defined by either 'fromStage' or 'fromAsyncStage'. It seems like a different method was used to define first stage`)
        };
        const dependsOnStage = this.getStage<any>(n-1);
        const dependency:Stage<T>['dependency'] = {
            isDependent: true,
            dependsOn: dependsOnStage.name,
            dependsOnIdx: dependsOnStage.idx
        };
        return await this.ThenAsyncStage<T>(skeleton,{dependency})
    }

    private async ThenAsyncStage<T>(
        skeleton:AsyncStageSkeleton<T>,
        overwrites?:Partial<Stage<T>>
    ){
        const {unassignedStage:ufs,asyncHandler} = skeleton;
        const unassignedStage = this.filterStageBeforeExec<T>(ufs,overwrites);
        try {
            if (unassignedStage.state.status === 'unset'){
                unassignedStage.state = await asyncHandler(this.useTools())
            };
        } catch (e) {
            const reason = `Expected ${unassignedStage.name}['state'] but ${unassignedStage.name}'s handler threw an error.`
            unassignedStage.state = {
                status: "failed",
                error: e instanceof Error ? e : new Error(reason),
                reason,
                metadata:{}
            }
        };
        this.pushStageWithIdx<T>(unassignedStage);
        return this
    };

    async thenAsyncStage<T>(skeleton:AsyncStageSkeleton<T>){
        return await this.ThenAsyncStage<T>(skeleton)
    };
    async thenMustAsyncStage<T>(skeleton:AsyncStageSkeleton<T>){
        return await this.ThenAsyncStage<T>(skeleton, {isMust:true})
    };

    private FromStage<T>(
        skeleton:StageSkeleton<T>,
        overwrites?:Partial<Stage<T>>
    ){
        if (this.isFromInvoked){
            throw new Error(`Pipeline's 'fromStage'/'fromMustStage'/'fromAsyncStage'/'fromMustAsyncStage' method must only be used once.`)
        };
        this.isFromInvoked=true;
        return this.ThenStage<T>(skeleton,overwrites)
    };

    fromStage<T>(
        skeleton:StageSkeleton<T>,
    ){
        return this.FromStage<T>(skeleton)
    };

    fromMustStage<T>(
        skeleton:StageSkeleton<T>,
    ){
        return this.FromStage<T>(skeleton, {isMust:true})
    };

    private async FromAsyncStage<T>(
        skeleton:AsyncStageSkeleton<T>,
        overwrites?:Partial<Stage<T>>
    ){
        if (this.isFromInvoked){
            throw new Error(`Pipeline's 'fromAsyncStage'/'fromMustAsyncStage'/'fromStage'/'fromMustStage' method must only be used once.`)
        };
        this.isFromInvoked=true; 
        return await this.ThenAsyncStage<T>(skeleton,overwrites)
    };

    async fromAsyncStage<T>(
        skeleton:AsyncStageSkeleton<T>
    ){
        return await this.FromAsyncStage(skeleton)
    };
    async fromMustAsyncStage<T>(
        skeleton:AsyncStageSkeleton<T>,
    ){
        return await this.FromAsyncStage<T>(skeleton, {isMust:true});
    };

    useTools = () => {
        const tools:PipeUseTools = {
            cli: {
                text
            },
            getStageState:(idxOrName)=>this.getStageState(idxOrName),
            getPrevStageState: <U>()=>this.getStageState<U>(this.stages.length-1),
            getPrevStageStatus: <U>()=>this.getStageState<U>(this.stages.length-1)['status'],
            getStageStateIfSuccessElseThrowError: <U>(idxOrName:string|number)=>this.getStageStateIfSuccessElseThrowError<U>(idxOrName),
            getStages: () => this.stages.map(stage => cloneStage(stage)),
        };
        return tools
    };

    withFollowUp(
        createFollowup:(createFollowUp:FollowupCallback) => FollowUseToolsCallback
    ){
        const cfu : FollowupCallback = (name,whatDoesItDo) => (fn:FollowUseToolsCallback) => fn
        createFollowup(cfu)(this.useTools())
        return this
    };

    when(bool:boolean){

        const thenStages = () => ({//opts: each returns inner callback so that stage does not gets ran immediately
            thenStage:<T>(skeleton:StageSkeleton<T>)=>()=>this.thenStage<T>(skeleton) as Pipeline,
            thenMustStage:<T>(skeleton:StageSkeleton<T>)=>()=>this.thenMustStage<T>(skeleton) as Pipeline,
            onlyThenStage:<T>(skeleton:StageSkeleton<T>)=>()=>this.onlyThenStage<T>(skeleton) as Pipeline,

            // 'from...' only to conditionally decide very Ist stage else get error
            // fromStage:<T>(skeleton:StageSkeleton<T>)=>()=>this.fromStage<T>(skeleton),
            // fromMustStage:<T>(skeleton:StageSkeleton<T>)=>()=>this.fromMustStage<T>(skeleton)
        });
        const thenAsyncStages = () => ({//asyncOpts
            thenAsyncStage:<T>(asyncSkeleton:AsyncStageSkeleton<T>)=>async()=>await this.thenAsyncStage<T>(asyncSkeleton) as Pipeline,
            thenMustAsyncStage:<T>(asyncSkeleton:AsyncStageSkeleton<T>)=>async()=>await (this.thenMustAsyncStage<T>(asyncSkeleton)) as Pipeline,
            onlyThenAsyncStage:<T>(asyncSkeleton:AsyncStageSkeleton<T>)=>async()=>await this.onlyThenAsyncStage<T>(asyncSkeleton) as Pipeline,

            // 'from...' only to conditionally decide very Ist stage else get error
            // fromAsyncStage:<T>(asyncSkeleton:AsyncStageSkeleton<T>)=>async()=>await this.fromAsyncStage<T>(asyncSkeleton),
            // fromMustAsyncStage:<T>(asyncSkeleton:AsyncStageSkeleton<T>)=>async()=>await this.fromMustAsyncStage<T>(asyncSkeleton),
        });

        
        return {
            thenSwitchTo: (
                callback:(opts: ReturnType<typeof thenStages>) => () => Pipeline
            ) => {
                return {
                    orElseSwitchTo: (
                        elseCallback:(opts:ReturnType<typeof thenStages>) => () => Pipeline
                    ):Pipeline => {
                        return !!bool ? callback(thenStages())() : elseCallback(thenStages())();
                    },
                    orElseAsyncSwitchTo: async (
                        elseAsyncCallback:(opts:ReturnType<typeof thenAsyncStages>) => () => Promise<Pipeline>
                    ):Promise<Pipeline> => {
                        return !!bool ? callback(thenStages())() : await elseAsyncCallback(thenAsyncStages())()
                    }
                }
            },
            thenAsyncSwitchTo: (
                callback:(opts:ReturnType<typeof thenAsyncStages>) => () => Promise<Pipeline>
            ) => {
                return {
                    orElseSwitchTo: async (
                        elseCallback:(opts:ReturnType<typeof thenStages>) => () => Promise<Pipeline>
                    ):Promise<Pipeline> => {
                        return  !!bool ? await callback(thenAsyncStages())() : elseCallback(thenStages())()
                    }, 
                    orElseAsyncSwitchTo: async (
                        elseAsyncCallback:(opts:ReturnType<typeof thenAsyncStages>) => () => Promise<Pipeline>
                    ):Promise<Pipeline> => {
                        return  !!bool ? await callback(thenAsyncStages())() : await elseAsyncCallback(thenAsyncStages())()

                    },
                }
            }
        }
    };

    finish(){
        const statsCount = {
            'totalStages':this.stages.length,
            'totalMustStages':this.mustStageIds.length,
            'completeSuccess': this.stages.length === this.stats.success.length,
            'success':this.stats.success.length,
            'failed':this.stats.failed.length,
            'skipped':this.stats.skipped.length,
            'unset':this.stats.unset.length
        };
        return statsCount;
    };

    //API
    createStage(stageName:string){
        return {
            whatDoesStageDo: (stageDesc:string) => {
                
                return {
                    //<T> is what handler would return as response's type if 'successful' 
                    handledBy: <T>(handler:StageHandler<T>):StageSkeleton<T> => {
                        return {
                            unassignedStage: {
                                name:stageName,
                                desc:stageDesc,
                                dependency:{
                                    isDependent:false
                                },
                                isMust:false,
                                state: {
                                    status: 'unset',
                                    reason: `Stage named ${stageName} is not yet been assigned in pipeline named ${this.name}`,
                                    metadata: {}
                                },
                            },
                            handler,
                        }
                    },

                    handledAsyncBy: <T>(asyncHandler:StageAsyncHandler<T>):AsyncStageSkeleton<T> => {
                        return {
                            unassignedStage: {
                                name:stageName,
                                desc:stageDesc,
                                dependency:{
                                    isDependent:false
                                },
                                isMust:false,
                                state: {
                                    status: 'unset',
                                    reason: `Stage named ${stageName} is not yet been assigned in pipeline named ${this.name}`,
                                    metadata: {}
                                },
                            },
                            asyncHandler,
                        }
                    },
                }
            }
        };
    };
};

export const createPipe = (pipeName:string) => {
    return {
        whatDoesPipeDo: (desc:string) => new Pipeline(pipeName,desc),
    }
};

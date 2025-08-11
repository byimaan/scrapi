import clx from "@consify/ansi";
import {cosmiconfig} from "cosmiconfig";
import * as F from "../constants/flags";
import { ConfigSchema,ResolveConfig } from "./schema";
import { boolParse,intParse,numParse,csvParse,isUndefined,isPlainObject } from "../util/funcs";

type PartialConfig = Partial<ResolveConfig>;

// read environment configurations, env. variables must start with 'PEVIA_*'
async function loadEnvConfig(
    env=process.env,
    prefix='PEVIA_'
):Promise<PartialConfig>{
    const eVar = (k:string,trim=true) =>  trim ? env?.[prefix+k]?.trim() : env?.[prefix+k];
    let envCfg:PartialConfig = {
        topic: eVar(F.TOPIC),
        media: eVar(F.MEDIA) as any,
        out: eVar(F.OUT) as string,
        render: eVar(F.RENDER) as any,
        robots:eVar(F.ROBOTS) as any,

        crawl: {
            depth: intParse(eVar(F.CRAWL_DEPTH)) as number,
            maxPages: intParse(eVar(F.CRAWL_MAX_PAGES)) as number,
            sameOrigin: boolParse(eVar(F.CRAWL_SAME_ORIGIN)) as boolean,
            domains: csvParse(eVar(F.CRAWL_DOMAINS)) as string[],
            concurrency: intParse(eVar(F.CRAWL_CONCURRENCY)) as number,
            rateLimit: numParse(eVar(F.CRAWL_RATE_LIMIT)) as number,
            timeoutMs: intParse(eVar(F.CRAWL_TIMEOUT_MS)) as number,
            retry: intParse(eVar(F.CRAWL_RETRY)) as number,
            retryDelayMs: intParse(eVar(F.CRAWL_RETRY_DELAY_MS)) as number,
            sitemap: boolParse(eVar(F.CRAWL_SITEMAP)) as boolean,
        },

        extract: {
            attrs: csvParse(eVar(F.EXTRACT_ATTRS)) as string[],
            css: boolParse(eVar(F.EXTRACT_CSS)) as boolean,
            opengraph: boolParse(eVar(F.EXTRACT_OPENGRAPH)) as boolean,
        },

        filter: {
            minWidth: intParse(eVar(F.FILTER_MIN_WIDTH)) as number,
            minHeight: intParse(eVar(F.FILTER_MIN_HEIGHT)) as number,
            formats: csvParse(eVar(F.FILTER_FORMATS)) as string[],
            altIncludes: csvParse(eVar(F.FILTER_ALT_INCLUDES)) as string[],
            altExcludes: csvParse(eVar(F.FILTER_ALT_EXCLUDES)) as string[],
            maxImages: intParse(eVar(F.FILTER_MAX_IMAGES)) as number,
            contentHash: boolParse(eVar(F.FILTER_CONTENT_HASH)) as boolean,
            skipExternalImages: boolParse(eVar(F.FILTER_SKIP_EXTERNAL_IMAGES)) as boolean,
            probeBytes: intParse(eVar(F.FILTER_PROBE_BYTES)) as number,
        },

        output: {
            folderTemplate: eVar(F.OUTPUT_FOLDER_TEMPLATE) as string,
            fileTemplate: eVar(F.OUTPUT_FILE_TEMPLATE) as string,
            meta: eVar(F.OUTPUT_META) as any,
            state: eVar(F.OUTPUT_STATE) as string,
        },
        
        plugins: csvParse(eVar(F.PLUGINS)) as string[],
    };
    //prune: keep the undefined values completely untouched
    const prune = (cfg:any) => { 
        if (isPlainObject(cfg)){
            const subCfg:any = {};
            for(let [k,v] of Object.entries(cfg)){
                const prv = prune(v);
                if (!isUndefined(prv)) subCfg[k]=prv;
            };
            return Object.keys(subCfg).length ? subCfg : undefined;
        };
        return cfg
    };
    envCfg = prune(envCfg) ?? {};
    return envCfg;
};

// read the configurations from '.peviarc.json'
async function loadConfigFile(
    cwd=process.cwd()
):Promise<PartialConfig>{ 
    const explorer = cosmiconfig('pevia', {
        searchPlaces: [
            "package.json",
            ".peviarc",
            ".peviarc.json",
            ".peviarc.yaml",
            ".peviarc.yml",
            ".peviarc.js",
            ".peviarc.cjs",
            "pevia.config.js",
            "pevia.config.cjs",
            "pevia.config.ts",
        ]
    });
    const expRes = await explorer.search(cwd);
    const fileCfg = expRes?.config ?? {};
    return fileCfg
};

const overwrite = (defCfg:Record<string,any>) => {
    return {
        with: (cfg:Record<string,any>) => {
            const out = {...defCfg};
            for(let [k,v] of Object.entries(cfg)){
                if (isUndefined(v) || ["__proto__","constructor","prototype"].includes(k)) continue;
                else if (Array.isArray(v)) out[k]=v.slice();
                else if (isPlainObject(v)){
                    if (!isPlainObject(out?.[k])) out[k]={};
                    out[k] = overwrite(out[k]).with(v);
                }
                else out[k]=v;
            };
            return out
        }
    }
};

export async function resolveConfig(
    cliPartials:PartialConfig,
    cwd=process.cwd()
){
    // default schema
    const defCfg = ConfigSchema.parse({});

    // config file and environment variables
    const fileCfg = await loadConfigFile(cwd);
    const envCfg = await loadEnvConfig();

    // priority --> [cliPartials > envCfg > fileCfg > defCfg]
    let mergedCfg = overwrite(defCfg).with(fileCfg);
    mergedCfg = overwrite(mergedCfg).with(envCfg);
    mergedCfg = overwrite(mergedCfg).with(cliPartials)

    const parsed = ConfigSchema.safeParse(mergedCfg); // merged config
    if (!parsed.success){
        const msg = parsed.error.issues.map(
            issue => clx.red.write(` - ${issue.path.join('.')}: ${issue.message}`)
        ).join('\n');
        const badConfigError = new Error(
            clx.underline.red.write('Invalid Configuration:\n')
            + msg
        );
        (badConfigError as any).issues = parsed.error.issues; // attaching extra error data...
        throw badConfigError;
    }
    return parsed.data; // parsed configuration 'cfg'
}
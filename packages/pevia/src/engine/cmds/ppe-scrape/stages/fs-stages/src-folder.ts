import path from "node:path";
import { mkdir } from "node:fs/promises";
import { defineAsyncScrapeStage } from "../../ppe.js";
import { useScrapePipe } from "../../run.js";
import { safeResolveOutDir, isSubPath, exists } from "../../utils.js";
import { randomHash } from "../../../../../util/crypt.js";
import { RENDERER_STAGE_NAME, ReturnTypeRendererStage } from "../renderer/index.js";

export const ENSURE_SRC_DIR_STAGE_NAME = "ENSURE_SRC_DIR";

const WHAT_DOES_SRC_DIR_STAGE_DO = 
    `
    "ENSURE_SRC_DIR" is one of stages which deals with file system. It make sure that src dir path where all the download will be stored is valid and do exist.
        It returns a unique absolute src path as a guide path where downloads will get stored.
        It rephrases/renames the dirname according if the customization such from '--folder-template' was defined.
        If dirPath already exist then a new unique dir would be created.
        To wrap up, it validates and creates absolute src dir path.
    `;

export type ReturnTypeEnsureSrcDirStage = {
    absSrcDirPath:string;
};

export const ENSURE_SRC_DIR_STAGE = defineAsyncScrapeStage<ReturnTypeEnsureSrcDirStage>(
    SCRAPE_PIPE => (
        SCRAPE_PIPE.createStage(
            ENSURE_SRC_DIR_STAGE_NAME
        ).whatDoesStageDo(
            WHAT_DOES_SRC_DIR_STAGE_DO
        ).handledAsyncBy<ReturnTypeEnsureSrcDirStage>(
            async ({getStageStateIfSuccessElseThrowError}) => {

                const {getSchemaConfig, usePipeTools} = useScrapePipe();
                const {out, topic, output: {folderTemplate}} = getSchemaConfig();
                const cwd = process.cwd(), swd = await safeResolveOutDir(out, cwd); // swd to which dir user pointing to store downloads.
                const {response:page} = getStageStateIfSuccessElseThrowError<ReturnTypeRendererStage>(RENDERER_STAGE_NAME);
                const pageUrl = new URL(page.url); 
                const {cli} = usePipeTools();

                // dirTemplate rephrase, in future can provide numerous template options e.g. "{#}:count"
                let dir = folderTemplate.replace("{topic}",topic||"topic").replace(
                    "{hostname}", pageUrl.hostname.replace(/^www\./, '').split('.')[0]
                );

                let absSrcDirPath = path.resolve(swd, dir);

                if (!isSubPath(cwd,absSrcDirPath)){
                    cli.text.icon(i=>i.warn).line(
                        cx=>cx.yellow.write(`Having 'absSrcDirPath' out of scope of cwd/(current working directory) is considered as anti-pattern.`)
                    ).log()
                    cli.text.icon(i=>i.warn).line(
                        cx=>cx.underline.yellow.write(`"${absSrcDirPath}"`)+" found to be not a subpath of "+cx.underline.yellow.write(`"${cwd}"`)
                    ).log();
                };

                if (await exists(absSrcDirPath)){ // then need to make it unique that does not exist yet!
                    const newAbsSrcDirPath = absSrcDirPath+randomHash(2)
                    cli.text.icon(i=>i.folder).line(
                        cx => cx.underline.green.write(`"${absSrcDirPath}"`)
                                +" already exist so it will renamed to "
                                + cx.underline.green.write(`"${newAbsSrcDirPath}"`)
                    ).log();
                    absSrcDirPath = newAbsSrcDirPath
                };

                try {
                    if (await exists(absSrcDirPath)){
                        throw new Error(`"${absSrcDirPath}" already exist!`)
                    };
                    await mkdir(absSrcDirPath,{recursive:true});
                    cli.text.icon(i=>i.success).line(
                        cx=> `Downloads of ` 
                            +cx.underline.green.write(`"${page.url}"`)
                            +` has got set to be stored at `
                            +cx.underline.green.write(`"${absSrcDirPath}"`)
                    ).log();

                    return {
                        status:'success',
                        response:{absSrcDirPath},
                        metadata:{}
                    };
                } catch (e) {
                    const reason = `An error occurred when tried to create absSrcDirPath as "${absSrcDirPath}"`
                    return {
                        status:'failed',
                        reason,
                        error: e instanceof Error ? e : new Error(reason),
                        metadata: {}
                    }
                };
            }
        )
    )
);
import {z} from "zod"
import { isPlainObject } from "../util/funcs";
import { DEFAULT_IMG_FORMATS, EXTRACT_ATTRIBUTES, MEDIAS, RENDER_MODES, SWITCHES } from "../constants/literals";
/**
 * Schema is buildup using following pieces:-
 *  [1] Base props (topic, media, out, ...)
 *  [2] Crawl Schema (depth, maxPages, sameOrigin, ...)
 *      - Controls how bot will traverse over the webpage and define its restrictions.
 *  [3] Extract Schema (attrs, css, opengraph)
 *      - Define potential src that can lead to target image/video
 *  [4] Filter Schema (minWidth, formats, altIncludes ...)
 *      - Define how to filter the target content
 *  [5] Output Schema (folder/file template, meta ...)
 *      - Define how and where store the scrapped content
 *  [6] Plugins schema (what plugs to addon?)
 */

const CrawlSchema = z.preprocess(
    csm => isPlainObject(csm) ? csm : {},
    z.object({
        depth:z.number().int().min(0).default(0), //e.g. abc.org -> depth=0 & abc.org/feat -> depth=1
        maxPages: z.number().int().positive().default(25),
        sameOrigin: z.boolean().default(false), // if false bot is allowed to go out of website's origin
        domains: z.array(z.string()).default([]), // explicit domains were bot can freely go with restriction
        concurrency: z.number().int().min(1).default(2), // Too early to implement for early versions
        rateLimit: z.number().min(0).default(0),
        timeoutMs: z.number().int().default(30000),
        retry: z.number().int().min(0).default(2),
        retryDelayMs: z.number().int().min(0).default(500),
        sitemap: z.boolean().default(false), // If website offers a sitemap url, could be useful to scan website
    })
);

const ExtractSchema = z.preprocess(
    esm => isPlainObject(esm) ? esm : {},
    z.object({
        attrs: z.array(z.string()).default(EXTRACT_ATTRIBUTES as any as string[]),
        css: z.boolean().default(false),
        opengraph: z.boolean().default(true), // og:image | twitter:image ... open-graph imgs in metadata
    }),
);

const FilterSchema = z.preprocess(
    fsm => isPlainObject(fsm) ? fsm : {},
    z.object({
        minWidth: z.number().int().default(256),
        minHeight: z.number().int().default(256),
        formats: z.array(z.string()).default(DEFAULT_IMG_FORMATS as any as string[]),
        altIncludes: z.array(z.string()).default([]),
        altExcludes:z.array(z.string()).default([]),
        maxImages: z.number().positive().default(100),
        contentHash: z.boolean().default(true),
        skipExternalImages: z.boolean().default(false),
        //probeBytes: only get defined range of bytes enough to determine the type of data we will receive.
        probeBytes: z.number().int().default(2048),
    }),
);

const OutputSchema = z.preprocess(
    osm => isPlainObject(osm) ? osm : {},
    z.object({
        folderTemplate: z.string().default("{topic}"),
        fileTemplate: z.string().default("{hash8}.{ext}"),
        meta: z.enum(['csv','json']).default('csv'),
        //state: maintain info e.g. visited-pages, img-hashes, resume related info
        state: z.string().default("{out}/.pevia/pevia.db")
    }),
);

const PluginSchema = z.preprocess(
    psm => Array.isArray(psm) ? psm : [],
    z.array(z.string())
)

// Core default CLI state
export const ConfigSchema = z.object({
    topic: z.string().default(""),
    media: z.enum(MEDIAS).default('image'),

    out: z.string().default("."), //outDir
    render: z.enum(RENDER_MODES).default('auto'), //How src render HTML- SSR, JS
    robots: z.enum(SWITCHES).default('on'), // Should respect website's scrapping policy?

    crawl: CrawlSchema,

    extract: ExtractSchema,

    filter: FilterSchema,

    output: OutputSchema,
    
    plugins: PluginSchema,
})

export type ResolveConfig = z.infer<typeof ConfigSchema>;
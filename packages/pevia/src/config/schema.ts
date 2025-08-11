import {z} from "zod"

// Core default CLI state
export const ConfigSchema = z.object({
    topic: z.string().default(""),
    media: z.enum(['image','video']).default('image'),

    out: z.string().default("."), //outDir
    render: z.enum(['auto','html','headless']).default('auto'), //How src render HTML- SSR, JS
    robots: z.enum(['on','off']).default('on'), // Should respect website's scrapping policy?

    // control/define how we crawl to other URLs
    crawl: z.object({
        depth:z.number().int().min(0).default(0), //e.g. abc.org -> depth=0 & abc.org/feat -> depth=1
        maxPages: z.number().int().positive().default(25),
        sameOrigin: z.boolean().default(true), // if false bot is allowed to go out of website's origin
        domains: z.array(z.string()).default([]), // explicit domains were bot can freely go with restriction
        concurrency: z.number().int().min(1).default(2), // Too early to implement for early versions
        rateLimit: z.number().min(0).default(0),
        timeoutMs: z.number().int().default(30000),
        retry: z.number().int().min(0).default(2),
        retryDelayMs: z.number().int().min(0).default(500),
        sitemap: z.boolean().default(false), // If website offers a sitemap url, could be useful to scan website
    }),

    // What are the sources?
    extract: z.object({
        attrs: z.array(z.string()).default(['src','srcset','data-src','data-original']),
        css: z.boolean().default(false),
        opengraph: z.boolean().default(true), // og:image | twitter:image ... open-graph imgs in metadata
    }),

    filter: z.object({
        minWidth: z.number().int().default(256),
        minHeight: z.number().int().default(256),
        formats: z.array(z.string()).default(['jpg','jpeg','png','webp']),
        altIncludes: z.array(z.string()).default([]),
        altExcludes:z.array(z.string()).default([]),
        maxImages: z.number().positive().default(100),
        contentHash: z.boolean().default(true),
        skipExternalImages: z.boolean().default(false),
        //probeBytes: only get defined range of bytes enough to determine the type of data we will receive.
        probeBytes: z.number().int().default(2048),
    }),

    output: z.object({
        folderTemplate: z.string().default("{topic}"),
        fileTemplate: z.string().default("{hash8}.{ext}"),
        meta: z.enum(['csv','json']).default('csv'),
        //state: maintain info e.g. visited-pages, img-hashes, resume related info
        state: z.string().default("{out}/.pevia/pevia.db")
    }),
    
    plugins: z.array(z.string()).default([]),
})

export type ResolveConfig = z.infer<typeof ConfigSchema>;
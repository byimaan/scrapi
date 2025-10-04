import type { Command } from "commander";
import { scrapePipe } from "../../engine/cmds/ppe-scrape/run.js";
import { parseCliFlagsIntoPartialConfig, resolveConfig } from "../../config/loader.js";
import { beautifyKeyValLog } from "../../util/log.js";
export default function scrape(program:Command){
    return program.command(
            "scrape"
        ).description(
            "Crawl/extract/download images"
        ).argument(
            '<url>', 'Site-url to scrap'
        )
        //OPTIONS
        .requiredOption(
            '-t, --topic <topic>',  'Topic/label (used for filtering and output folder)'
        )
        .option(
            '--media <type>', 'Media type (image|video): v1 image only'
        ).option(
            '-o, --out <dir>', 'Output directory'
        ).option(
            '--render <mode>', 'Define how src-url renders html by SSR or JS (auto|html|headless)', 
        ).option(
            '--robots <on|off>', 'Respect robot.txt policy of src'
        )
        //Crawl
        .option(
            '-d, --depth <n>', 'Maximum crawl depth', 
        ).option(
            '--max-pages <n>', 'Hard cap on pages crawled', 
        ).option(
            '--same-origin', 'Restrict to stay on same origin'
        ).option(
            '--domains [list]', 'Allowed domains (csv)'
        ).option(
            '--concurrency <n>', 'Parallel fetches', 
        ).option(
            '--rate-limit <rps>', 'Requests per second', 
        ).option(
            '--timeout-ms <ms>', 'Per-request timeout (ms)', 
        ).option(
            '--retry <n>', 'Retry count', 
        ).option(
            '--retry-delay-ms <ms>', 'Delay between retries', 
        ).option(
            '--sitemap', 'Explore from sitemap.xml if present'
        )
        //extract
        .option(
            '--attrs [list]', 'HTML attributes to check for image URLs (comma separated)'
        ).option(
            '--include-css', 'Parse CSS  for background image URLs'
        ).option(
            '--no-opengraph', 'Disable og:image/twitter:image'
        )
        //filter
        .option(
            '--formats [csv]', 'Allowed image formats, csv (*,jpg,png,webp,...)'
        ).option(
            '--exclude-formats [csv]', 'Restricted images formats (jpg,png,webp,...)'
        ).option(
            '--min-width <px>', 'Minimum width', 
        ).option(
            '--min-height <px>', 'Minimum height', 
        ).option(
            '--alt-includes [csv]', 'Accept if alt/URL/filename contains any (csv)'
        ).option(
            '--alt-excludes [csv]', 'Reject if alt/URL/filename contains any (csv)'
        ).option(
            '--max-images <n>', 'Maximum images cap', 
        ).option(
            '--content-hash', 'Enable content hash de-dup'
        ).option(
            '--probe-bytes <n>', 'Bytes to fetch for content-type probe', 
        ).option( // Think later if will need to implement this
            '--skip-external-images', 'Only download same-origin images'
        )
        //output
        .option(
            '--folder-template <tpl>', 'Folder template e.g. {topic} or {topic}/{hostname}'
        ).option(
            '--file-template <tpl>', 'File template e.g. {hash8}.{ext}'
        ).option(  
            '--meta <fmt>', 'Manifest format'
        ).option(
            '--state <path>', 'Path to state DB (sqlite)'
        )
        //plugins
        .option(
            '--plugins [csv]', 'Comma separated plugin package names'
        )
        //dx
        .option(
            '--dry-run', 'Execute without saving files'
        ).option(
            '--json', 'JSON output for summaries'
        ).option( // Not very imp at the moment
            '-v --verbose', 'Verbose logs' 
        ).option( // Not very important at the moment
            '-q --quiet', 'Only errors'
        )
        
        .action(
            async (url: string, flags: Record<string, unknown>) => {
                const cliCfg = parseCliFlagsIntoPartialConfig(flags);
                const cfg = await resolveConfig(cliCfg);
                
                if (flags.json)  beautifyKeyValLog(`PeviaConfiguration`,cfg,0);

                /**
                 * Later need to put value guards over file and folderTemplate in configuration.
                 */
                const data = await scrapePipe.run({url, ...cfg})
                beautifyKeyValLog('Stats:', data, 0, 32)

                process.exit(0);
            }
        )
};

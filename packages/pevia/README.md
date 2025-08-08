
## PEVIA: `Scrap what matters!`

## Blueprint to build `@scarpi/pevia`
Building Steps:
- 1. CLI entrypoint
- 2. Parse & validate CLI args
- 3. Load & merge config
- 4. Discover & init plugins
- 5. Crawl/fetch page(s)
- 6. Extract candidate images
- 7. Apply filtering & validation
- 8. Optional AI verification
- 9. Download & persist
- 10. Finish hooks + summary

## Ideal Command Layout
- pevia scrape <url> — main command. Crawl/extract/download.

- pevia dry-run <url> — do everything except saving files; prints summary/JSON.

- pevia plugins — list/discover installed plugins; show hook coverage.

- pevia cache — inspect/clear resume DB and content cache.

- pevia config — print merged config, or --init to scaffold a config file.

## Ideal Flags
- --topic, -t <string>: label/topic (used for filtering + output dir).

- --out, -o <dir>: base output directory (default: .).

- --depth, -d <n>: max link depth (default: 0 single page).

- --same-origin / --domains <csv>: restrict crawling (default: --same-origin).

- --max-pages <n>: hard cap on pages crawled (default: 50).

- --max-images <n>: hard cap on images saved (default: 500).

- --render <auto|html|headless>: choose renderer (default: auto).

- --timeout <ms>: per-request timeout (default: 15000).

- --retry <n> and --retry-delay <ms>: backoff on failures.

- --user-agent <string>: UA to send (default includes pevia + version).

- --headers <k=v,...>: extra request headers.

- --rate-limit <rps> and --delay-ms <ms>: throttle politely.

- --no-cookies: disable cookie jar (default: enabled per origin).

### Extraction related flags
- --include-attrs <csv>: attributes to probe for lazy images (default: src,srcset,data-src,data-original).

- --include-css: also parse CSS for background-image:url(...).

- --opengraph: consider og:image/twitter:image (default: on).

- --min-width <px> / --min-height <px>: skip tiny assets (default: 256x256).

- --formats <csv>: only allow certain MIME/extensions (e.g., jpg,png,webp).

- --alt-includes <csv> / --alt-excludes <csv>: keyword heuristics on alt text/filenames/URL

### Filtering & Validation
- --content-hash <on|off>: de-dupe by content hash (default: on).

- --skip-external-images: allow offsite pages but only download same-origin images.

- --probe-bytes <n>: bytes to fetch before full download to inspect content-type (default: 2048).

- --max-size-mb <n>: max image size to download (default: 15).

### AI Verification (optional)
- --ai <off|local|remote>: gate images through AI (default: off).

- --ai-threshold <0..1>: accept if score ≥ threshold (default: 0.65).

- --ai-model <name>: e.g., clip-vit-b32 (local) or provider model name.

- --ai-batch <n>: batch size for scoring (default: 8).

- --ai-cache <on|off>: cache (hash,topic)→score (default: on).

### Output/Metadata
- --folder-template <tpl>: e.g., "{topic}" (default) or "{topic}/{hostname}".

- --file-template <tpl>: tokens: {hash8}, {basename}, {ext}, {counter}.

- --meta <csv|json>: write a manifest with provenance and scores (default: csv as <topic>.csv).

- --resume: continue from previous state DB (default: on if DB exists).

- --state <path>: path to sqlite/JSONL state (default: .pevia/pevia.db under --out).

- --dry-run: do everything except writing files (same as pevia dry-run)

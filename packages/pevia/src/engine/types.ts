/**
 * Types only!
 * Stable interfaces/types for pipeline
 */

import { CheerioAPI } from "cheerio";
import { ResolveConfig } from "../config/schema.js";

export enum ExitCode {
  OK = 0,
  INVALID_USAGE = 2,
  NETWORK_ERROR = 3,
  ROBOTS_BLOCKED = 4,
  PLUGIN_ERROR = 5,
  UNKNOWN_ERROR = 1
};

export type MediaType = "image" | "video";
export type RenderMode = "auto" | "html" | "headless";

export type Job = {
  seedUrl:string; topic?:string; media:MediaType; config: ResolveConfig
};

export type Page = {
  $?:CheerioAPI;
  url:string; status:number; html:string;
  text:string; // could be useful for heuristics.
};

export type Candidate = {
  pageUrl:string;
  srcUrl:string; //abs-path
  source: 'html'|'srcset'|'data'|'og'|'twitter'|'css';
  renderer?:'html'|'headless'; 
  alt?:string; fileNameHint?:string; mimeHint?:string;
  widthHint?:number; heightHint?:number;
};

export type Accepted = {
  candidate:Candidate; hash:string,
  ext:string; mime:string; width?:number; height?:number
  bytes?:number; finalPath:string; //relative to "out"
};


export type Renderer = {
  name: 'html'|'headless';
  fetch(
    url:string,
    opts: {timeoutMs:number,signal?:AbortSignal}
  ):Promise<Page>
};

export type Extractor = {
  name:string; 
  run(page:Page):Candidate[];
}

export type Validator = {
  name:string,
  test(
    candidate:Candidate,
    ctx: {cfg:ResolveConfig}
  ):Promise<true | {reason:string}>
}

export type Downloader = {
  probe(
    url:string,
    bytes:number
  ): Promise<{ok:boolean; mime?:string}>;
  download(
    url: string,
    opts: { timeoutMs: number; signal?: AbortSignal }
  ): Promise<{ok: boolean; buffer: Uint8Array; mime?: string}>;
};

type WriteEntryDB = {
  url:string; status:number; depth:number
};

export type Store = {
  ensureTopicFolder(topic:string):Promise<string>;
  writeFile(relPath:string, data:Uint8Array):Promise<string>;
  writeManifest(rows:WriteEntryDB[], fmt:'csv'|'json'):Promise<void>;
  state: StateDB
};

type ImageEntryDB = {
  hash:string; srcUrl:string; pageUrl:string; width?:number; height?:number;
  bytes?:number; mime?:string; savedPath?:string; 
  topic:string; firstSeenAt:number;
}

export type StateDB = {
  hasPage(url:string):boolean;
  addPage(row:WriteEntryDB):void;
  hasImageHash(hash:string):boolean;
  addImage(row:ImageEntryDB):void;
};

/**
 * If any internal feature need to call something which has n't yet implemented or skipped for current version1
 */
export class NotImplementedError extends Error {
  constructor(public feature:string, msg?:string, currVersion='current'){
    super(msg ?? `${feature} is not yet implemented in ${currVersion} version`);
    this.name = 'NotImplementedError';
  };
};

// export const Caps = {} // may need later



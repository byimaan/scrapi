import { Page } from "../../../../types.js";
import { defineAsyncScrapeStage } from "../../ppe.js";
import { renderByHeadlessAsyncHandler } from "./headless.js";
import { renderByHtmlAsyncHandler } from "./html.js";

export type ReturnTypeRendererStage = Required<Page>;

export const RENDERER_STAGE_NAME = "RENDERER_STAGE";
const WHAT_DOES_RENDERER_STAGE_DO = 
    `
    "RENDERER_STAGE" fetches and renderers </> HTML from provided url. It has two distinct working strategies:
        [1] "RENDERER_STAGE_BY_HTML" subtype of "RENDERER_STAGE" which uses simple fetch and efficient for most of webpages.
            - It currently sends request to the src with predefined headers and waits for response.
            - It primarily relies on "cheerio" to parse and extract text from HTML.
            - It possibly could've limit on maximum length to the size of HTML content.
        [2] "RENDERER_BY_HEADLESS_STAGE" subtype of "RENDERER_STAGE" whose primary job is to fetch and parse </> HTML from src <url> as of "RENDERER_BY_HTML_STAGE" but with key differences.
            - It sends request to src as a virtual browser and src possibly would assume receiving it from a real browser.
            - It primarily relies on "puppeteer" to parse and extract text from HTML.
    `;

export const RENDERER_STAGE = {
    setBy: (render:'auto'|'html'|'headless') => (
        defineAsyncScrapeStage<ReturnTypeRendererStage>(
            SCRAPE_PIPE => (
                SCRAPE_PIPE.createStage(
                    RENDERER_STAGE_NAME
                ).whatDoesStageDo(
                    WHAT_DOES_RENDERER_STAGE_DO
                ).handledAsyncBy<ReturnTypeRendererStage>(
                    render === 'headless' ? renderByHeadlessAsyncHandler : renderByHtmlAsyncHandler
                )
            )
        )
    )
};

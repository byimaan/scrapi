#!/usr/bin/env node
import "dotenv/config";
import {Command} from 'commander';
import scrape from './cmds/scrape.js';


const program = new Command();
program.name(
    'pevia'
).description(
    'Topic-focused media scraper (v1: image only)'
).version(
    '1.0.0'
).allowUnknownOption(
    false
).allowExcessArguments(
    false
).showSuggestionAfterError();

const inject = (
    cfn:(p:Command)=>Command
) => ({
    into: (ref:Command) => cfn(ref)
});

inject(scrape).into(program);
program.parse()




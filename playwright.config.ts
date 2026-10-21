import {defineConfig} from '@playwright/test';
// These scenarios already open multiple WebGL clients and Monte Carlo workers.
// Run files sequentially so competing audits don't starve keyboard steering.
export default defineConfig({testDir:'./tests',timeout:180000,fullyParallel:false,workers:1,use:{channel:'chrome',viewport:{width:1440,height:1050},headless:true,actionTimeout:15000},reporter:'list',outputDir:'.qa/test-results'});

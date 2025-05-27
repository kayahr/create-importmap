/*
 * Copyright (C) 2025 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import { readFile, writeFile } from "node:fs/promises";

import { writeImportmaps } from "@jsenv/importmap-node-module";
import { program } from "commander";
import fileUrl from "file-url";

import packageJSON from "../../package.json" with { type: "json" };

interface Options {
    dev: boolean;
    js: boolean;
    base: string;
    out?: string;
}

program
    .name("create-importmap")
    .option("-D, --dev", "include dev dependencies in importmap", false)
    .option("-S, --js", "write the importmap as JavaScript instead of JSON", false)
    .option("-B, --base <path>", "the base directory where to find the package.json to create an importmap from", ".")
    .option("-O, --out <path>", "output path and filename of the importmap (default: \"./importmap.json\" or \"./importmap.js\" depending on '--js' option)")
    .version(packageJSON.version);

program.parse();

const options = program.opts<Options>();
const out = options.out ?? (options.js ? "importmap.js" : "importmap.json");

// Create JSON import map
await writeImportmaps({
    logLevel: "warn",
    directoryUrl: new URL(fileUrl(options.base)),
    importmaps: {
        [ out ]: {
            nodeMappings: {
                devDependencies: options.dev
            }
        }
    }
});

// If JS option is set then rewrite import map to JavaScript
if (options.js) {
    await writeFile(out, `(() => {
        const baseUrl = new URL(".", document.currentScript.src).href;
        const prefixUrl = url => url.startsWith(".") ? \`\${baseUrl}\${url}\` : url;
        const prefixUrls = obj => Object.entries(obj).reduce(
            (obj, [ key, value ]) => {
                obj[prefixUrl(key)] = typeof value === "string"
                    ? obj[key] = prefixUrl(value)
                    : typeof value === "object"
                        ? obj[key] = prefixUrls(value)
                        : value;
                return obj;
            },
            {}
        );
        const importMap = document.createElement("script");
        importMap.type = "importmap";
        importMap.textContent = JSON.stringify(prefixUrls(${JSON.stringify(JSON.parse(await readFile(out, "utf-8")), undefined, 4)}));
        document.currentScript.after(importMap);
    })()\n`);
}

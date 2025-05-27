/*
 * Copyright (C) 2025 Klaus Reimer <k@ailis.de>
 * See LICENSE.md for licensing information
 */

import assert from "node:assert";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { describe, it } from "node:test";

import packageJSON from "../../package.json" with { type: "json" };

interface Result {
    stdout: string;
    stderr: string;
    exitCode: number | null;
}

interface Importmap {
    imports: Record<string, string>;
    scopes?: Record<string, unknown>;
}

function run(...args: string[]): Promise<Result> {
    return new Promise<Result>((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        const child = spawn("node", [ "lib/main/create-importmap.js", ...args ]);
        child.stdout?.on("data", (data: Buffer) => {
            stdout += data.toString("utf-8");
        });
        child.stderr?.on("data", (data: Buffer) => {
            stderr += data.toString("utf-8");
        });
        child.on("exit", exitCode => resolve({ stdout, stderr, exitCode }));
        child.on("error", reject);
    });
}

async function withTmp<T>(fn: (tmp: string) => T): Promise<T> {
    const dir = await mkdtemp("lib/test/tmp");
    try {
        return await fn(dir);
    } finally {
        await rm(dir, { recursive: true });
    }
}

interface Element {
    tagName: string;
    textContent: string;
    type: string;
}

function evalOutput(output: string, src: string): Element {
    const document = {
        addedScript: null as Element | null,
        currentScript: {
            src,
            after: (element: Element) => { document.addedScript = element; }
        },
        createElement: (tagName: string) => ({ tagName })
    };
    eval(output);
    assert(document.addedScript != null);
    return document.addedScript;
}

describe("create-importmap", () => {
    it("shows command line help when --help option is used", async () => {
        const { stdout, stderr, exitCode } = await run("--help");
        assert.equal(exitCode, 0);
        assert.equal(stderr, "");
        assert.match(stdout, /Usage: create-importmap \[options\]/);
    });

    it("shows version when --version option is used", async () => {
        const { stdout, stderr, exitCode } = await run("--version");
        assert.equal(exitCode, 0);
        assert.equal(stderr, "");
        assert.equal(stdout, `${packageJSON.version}\n`);
    });

    it("creates './import.json' when no --out option is specified", async () => {
        const { stdout, stderr, exitCode } = await run();
        try {
            assert.equal(exitCode, 0);
            assert.equal(stderr, "");
            assert.equal(stdout, "");
            const output = JSON.parse(await readFile("importmap.json", "utf-8")) as Importmap;
            assert.equal(output.imports["commander"], "./node_modules/commander/esm.mjs");
        } finally {
            await rm("importmap.json");
        }
    });

    it("creates './import.js' when --js option is specified but no --out option", async () => {
        const { stdout, stderr, exitCode } = await run("--js");
        try {
            assert.equal(exitCode, 0);
            assert.equal(stderr, "");
            assert.equal(stdout, "");
            const script = evalOutput(await readFile("importmap.js", "utf-8"), "https://localhost/root/importmap.js");
            assert.equal(script.tagName, "script");
            assert.equal(script.type, "importmap");
            const importmap = JSON.parse(script.textContent) as Importmap;
            assert.equal(importmap.imports["commander"], "https://localhost/root/./node_modules/commander/esm.mjs");
        } finally {
            await rm("importmap.js");
        }
    });

    it("creates JSON importmap for runtime dependencies", async () => {
        await withTmp(async tmp => {
            const { stdout, stderr, exitCode } = await run("--out", `${tmp}/output.json`);
            assert.equal(stdout, "");
            assert.equal(stderr, "");
            assert.equal(exitCode, 0);
            const output = JSON.parse(await readFile(`${tmp}/output.json`, "utf-8")) as Importmap;
            assert.equal(output.imports["commander"], "../../../node_modules/commander/esm.mjs");
            assert.equal(output.imports["typescript"], undefined);
        });
    });

    it("creates JSON importmap with dev dependencies", async () => {
        await withTmp(async tmp => {
            const { stdout, stderr, exitCode } = await run("--out", `${tmp}/output.json`, "--dev");
            assert.equal(stdout, "");
            assert.equal(stderr, "");
            assert.equal(exitCode, 0);
            const output = JSON.parse(await readFile(`${tmp}/output.json`, "utf-8")) as Importmap;
            assert.equal(output.imports["commander"], "../../../node_modules/commander/esm.mjs");
            assert.equal(output.imports["typescript"], "../../../node_modules/typescript/lib/typescript.js");
        });
    });

    it("creates JavaScript importmap for runtime dependencies", async () => {
        await withTmp(async tmp => {
            const { stdout, stderr, exitCode } = await run("--out", `${tmp}/output.js`, "--js");
            assert.equal(stdout, "");
            assert.equal(stderr, "");
            assert.equal(exitCode, 0);
            const script = evalOutput(await readFile(`${tmp}/output.js`, "utf-8"), "https://localhost/root/lib/test/importmap.js");
            assert.equal(script.tagName, "script");
            assert.equal(script.type, "importmap");
            const importmap = JSON.parse(script.textContent) as Importmap;
            assert.equal(importmap.imports["commander"], "https://localhost/root/lib/test/../../../node_modules/commander/esm.mjs");
            assert.equal(importmap.imports["typescript"], undefined);
        });
    });

    it("creates JavaScript importmap with dev dependencies", async () => {
        await withTmp(async tmp => {
            const { stdout, stderr, exitCode } = await run("--out", `${tmp}/output.js`, "--dev", "--js");
            assert.equal(stdout, "");
            assert.equal(stderr, "");
            assert.equal(exitCode, 0);
            const script = evalOutput(await readFile(`${tmp}/output.js`, "utf-8"), "https://localhost/root/lib/test/importmap.js");
            assert.equal(script.tagName, "script");
            assert.equal(script.type, "importmap");
            const importmap = JSON.parse(script.textContent) as Importmap;
            assert.equal(importmap.imports["commander"], "https://localhost/root/lib/test/../../../node_modules/commander/esm.mjs");
            assert.equal(importmap.imports["typescript"], "https://localhost/root/lib/test/../../../node_modules/typescript/lib/typescript.js");
            assert.deepEqual(importmap.scopes?.["https://localhost/root/lib/test/../../../node_modules/@jsenv/importmap-node-module/"], {
                "@babel/traverse/": "https://localhost/root/lib/test/../../../node_modules/@babel/traverse/",
                "@babel/traverse": "https://localhost/root/lib/test/../../../node_modules/@babel/traverse/lib/index.js"
            });
        });
    });
});

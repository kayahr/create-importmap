declare module "@jsenv/importmap-node-module" {
    export function writeImportmaps(options: {
        logLevel?: "off" | "error" | "warn" | "info" | "debug";
        directoryUrl: URL;
        importmaps: {
            [ output: string ]: {
                nodeMappings?: {
                    devDependencies?: boolean;
                };
            };
        };
    }): Promise<void>;
}

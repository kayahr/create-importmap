interface PackageJSON {
    version: string;
}

declare module "*/package.json" {
    const value: PackageJSON;
    export default value;
}

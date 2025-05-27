# create-importmap

[GitHub] | [NPM]

Command-line tool to create a dependency ESM importmap in JSON or JavaScript format from the project's package.json.

Internally this project uses [@jsenv/importmap-node-module] for generating the JSON importmap.

## Usage

Install the tool as a development dependency:

```sh
npm install -D @kayahr/create-importmap
```

Run from command-line:

```sh
npx create-importmap --out lib/importmap.json
```

Run from package.json (run with `npm run importmap`):

```json
"scripts": {
    "importmap": "create-importmap --out lib/importmap.json"
}
```

## Options

The following options can be specified, none is required:

Option               |Description
---------------------|------------------------------------------------------------------------------------------------------------------------
<nobr>`-D`, `--dev`</nobr>       | Include dev dependencies in importmap (default: false)
<nobr>`-S`, `--js`</nobr>        | Write the importmap as JavaScript instead of JSON (default: false)
<nobr>`-B`, `--base` *PATH*</nobr> | The base directory where to find the package.json to create an importmap from (default: `.`)
<nobr>`-O`, `--out` *PATH*</nobr>  | Output path and filename of the importmap (default: `./importmap.json` or `./importmap.js` depending on `--js` option)
<nobr>`-V`, `--version`</nobr>   | Output the version number
<nobr>`-h`, `--help`</nobr>      | Display help for command

## JavaScript importmap

Currently no browser supports loading an external JSON importmap. That's why `create-importmap` can write a scripted importmap by specifying the `--js` option. The generated importmap script dynamically creates a new inline script tag with the JSON importmap as content so the browser actually loads an inline importmap. The script also does some magic to rebase relative links in the importmap to match the URL from which the script was loaded.

Example usage in HTML (assuming HTML is at `src/demo/test.html` and importmap was generated at `lib/importmap.json`):


```html
<!DOCTYPE html>
<html>
  <head>
    <script src="../../lib/importmap.js"></script>
  </head>
</html>
```

[GitHub]: https://github.com/kayahr/create-importmap
[NPM]: https://www.npmjs.com/package/@kayahr/create-importmap
[@jsenv/importmap-node-module]: https://www.npmjs.com/package/@jsenv/importmap-node-module

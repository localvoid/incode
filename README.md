# [incode](https://github.com/localvoid/incode) &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/localvoid/incode/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/incode.svg)](https://www.npmjs.com/package/incode) [![codecov](https://codecov.io/gh/localvoid/incode/branch/master/graph/badge.svg)](https://codecov.io/gh/localvoid/incode) [![CircleCI Status](https://circleci.com/gh/localvoid/incode.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/localvoid/incode) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/localvoid/incode)

`incode` is a library for building code injectors.

## Example

Code with injectable regions:

```js
class User {
  // inj:emit("User", "pck")
  // inj:end
}
```

Code injector:

```js
import { createDirectiveMatcher, inject } from "incode";

const s = inject(
  text, // code with injectable regions
  createDirectiveMatcher("inj"),
  (region) => {
    return `${region.args[1]}() { console.log("${region.args[0]} injected method"); }`;
  },
);
```

Result after injection:

```js
// inj:assign({ schema: "User" })
class User {
  // inj:emit("pck")
  pck() { console.log("User injected method"); }
  // inj:end
}
```

## Features

- Block-scoped variables
- Indentation autodection for injectable regions
- Automatic removal of existing code in injectable regions

## Directives

- `begin` - begin local scope
- `end` - end region
- `assign(data: JSON)` - assign data to a local scope `Object.assign`
- `merge(data: JSON)` - merge data to a local scope `_.merge`
- `emit(...args: Array<JSON>)` - emit code

## API

```ts
function createDirectiveMatcher(prefix: string): RegExp;
```

`createDirectiveMatcher` creates a `RegExp` object that will be used as a directive matcher.

```ts
interface InjectableRegion {
  readonly args: any[];
  readonly data: {};
  readonly padding: string;
  readonly start: number;
  readonly end: number;
}

function extractRegions(
  text: string,
  directiveMatcher: RegExp,
  data = {},
): InjectableRegion[];
```

`extractRegions` extracts `InjectableRegions` from `text`.

```ts
function inject(
  text: string,
  directiveMatcher: RegExp,
  cb: (region: InjectableRegion) => string,
  data = {},
): string;
```

`inject` invokes `cb` function and injects its result into a text.

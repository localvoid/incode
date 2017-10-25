`incode` is a library for building code injectors.

## Example

Code with injectable regions:

```js
// inj:assign({ schema: "User" })
class User {
  // inj:emit("pck")
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
    return `${region.type}() { console.log("${region.data.schema} injected method"); }`;
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
- `assign(data: {})` - assign data to a local scope `Object.assign`
- `merge(data: {})` - merge data to a local scope `_.merge`
- `emit(type: string)` - emit code

## API

```ts
function createDirectiveMatcher(prefix: string): RegExp;
```

`createDirectiveMatcher` creates a `RegExp` object that will be used as a directive matcher.

```ts
interface InjectableRegion {
  readonly type: string;
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

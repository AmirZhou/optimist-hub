# The War of the Module Systems: How JavaScript Learned to Share Code

---

## Chapter 1: The Lawless Years (1995–2009)

**1995. Netscape headquarters.**

Brendan Eich built JavaScript to do small things — validate a form field, make a button change color. Nobody imagined writing 100,000 lines of JavaScript. So he gave the language **no way to split code into files**.

Every script you loaded shared one giant global namespace:

```html
<script src="utils.js"></script>
<script src="app.js"></script>
```

```js
// utils.js
var formatDate = function(d) { return d.toISOString() }

// app.js
var formatDate = function(x) { return x + "!!!" }  // Overwrites the first one. No warning.
```

This was like a kitchen where 50 chefs share one countertop. Somebody's souffle is sitting right next to somebody's raw chicken. Chaos.

Developers hacked around it with the **IIFE pattern** (Immediately Invoked Function Expression) — a genuinely ugly workaround:

```js
var MyApp = (function() {
  // private stuff here, invisible to the outside
  var secret = 42

  // only expose what you return
  return {
    getSecret: function() { return secret }
  }
})()
```

That `(function() { ... })()` creates a function and calls it *immediately*, forming a private scope. It worked. It was also miserable to write, debug, and maintain. The entire JavaScript ecosystem was held together with duct tape and prayer.

For **14 years**, this was the state of the art.

---

## Chapter 2: Node.js and the Birth of `require()` (2009)

**May 27, 2009. JSConf EU, Berlin.**

A 28-year-old programmer named **Ryan Dahl** walked on stage and showed the world **Node.js** — JavaScript running *outside* the browser, on servers. The crowd went silent, then erupted.

But Ryan had a problem. Server-side code is *big*. You need hundreds of files — database drivers, HTTP handlers, utility libraries. The browser's "just dump everything in global scope" approach would be suicide.

So Node.js adopted a module system that a group called **CommonJS** had been designing. The idea was dead simple:

### How `require()` Works

**Exporting** — you attach things to a special `module.exports` object:

```js
// math.js
const PI = 3.14159

function circleArea(r) {
  return PI * r * r
}

module.exports = { circleArea, PI }
```

**Importing** — you call `require()` with a file path:

```js
// app.js
const math = require('./math')

console.log(math.circleArea(5))  // 78.539...
console.log(math.PI)             // 3.14159
```

### What Happens Under the Hood When You Call `require('./math')`

This is the part most tutorials skip. Here's what Node.js actually does, step by step:

**Step 1 — Resolve the path.**
Node looks at `'./math'` and figures out the actual file. It tries:
- `./math.js`
- `./math/index.js`
- `./math.json`
- `./math.node` (C++ addon)

The `./` means "relative to the current file." Without it — like `require('express')` — Node searches the `node_modules` folder instead (more on that later).

**Step 2 — Check the cache.**
Node keeps a cache of every module it's already loaded. If `math.js` was required before, it returns the cached version *instantly*. It does NOT read the file again. This is why `require()` is safe to call 100 times — the file only executes once.

```js
require('./math') === require('./math')  // true — same object in memory
```

**Step 3 — Read and wrap the file.**
Node reads `math.js` from disk, then wraps your code in a secret function:

```js
(function(exports, require, module, __filename, __dirname) {
  // YOUR CODE from math.js goes here
  const PI = 3.14159
  function circleArea(r) { return PI * r * r }
  module.exports = { circleArea, PI }
})
```

That's why `__dirname` and `__filename` magically exist in every Node file — they're parameters injected by this wrapper. Your code never runs in global scope. It runs inside this function, which gives it a private scope automatically.

**Step 4 — Execute the function.**
Node calls this wrapper function, passing in a fresh `module` object with an empty `exports` property. Your code fills in `module.exports`. When the function returns, Node grabs `module.exports` and caches it.

**Step 5 — Return `module.exports` to the caller.**
The `require()` call returns whatever `module.exports` points to. Done.

### The Key Trait: Synchronous

`require()` is **synchronous**. It blocks. When Node hits `const math = require('./math')`, it stops everything, reads the file from disk, executes it, and only then moves to the next line.

On a server, this is fine — you `require` everything at startup, and after that the files are cached. In a browser, this would be *catastrophic*. Imagine your webpage freezing while it downloads 200 JavaScript files one by one over the network.

This single fact — `require()` is synchronous — is why it was never suitable for browsers, and why a second module system had to be born.

---

## Chapter 3: The `node_modules` Rabbit Hole

When you write `require('express')` (no `./`), Node doesn't look at a relative path. Instead, it searches up the directory tree for a `node_modules` folder:

```
/Users/sarah/projects/myapp/node_modules/express/index.js    <- tries here first
/Users/sarah/projects/node_modules/express/index.js          <- then here
/Users/sarah/node_modules/express/index.js                   <- then here
/Users/node_modules/express/index.js                         <- then here
/node_modules/express/index.js                               <- last resort
```

This climbing-up-the-tree algorithm is how `npm install` works. When you run `npm install express`, npm downloads Express into `./node_modules/express/`, and `require('express')` finds it there.

Each package can have its *own* `node_modules` folder with its *own* dependencies, which can have *their own* `node_modules`... This is why `node_modules` famously becomes deeper than the Mariana Trench and heavier than a black hole:

```
node_modules/
  express/
    node_modules/
      accepts/
        node_modules/
          mime-types/
            node_modules/
              ...oh no
```

The joke in the JavaScript community: "the heaviest object in the universe is `node_modules`." It's funny because it's painfully true.

---

## Chapter 4: The Standards Body Steps In — ES Modules (2015)

**June 2015. TC39 committee (the group that governs JavaScript) finalizes ES6 — officially called ES2015.**

"ES" stands for **ECMAScript**. Here's why:

In the mid-1990s, Netscape submitted JavaScript to an international standards organization called **ECMA International** (European Computer Manufacturers Association) to make it an official standard. But Sun Microsystems owned the trademark "Java" (and "JavaScript" contained "Java"), so the standard couldn't be called "JavaScript." They named it **ECMAScript** instead.

So: **JavaScript** is the language everyone uses. **ECMAScript** is the official specification that defines it. When people say "ES6" or "ES2015," they mean the 6th edition of this specification, released in 2015. "ES modules" = the module system defined in the ECMAScript specification.

ES6 was the biggest update in JavaScript's history. It gave us `let`/`const`, arrow functions, classes, template literals, destructuring, and — finally — a **native module system** built into the language itself.

### The Syntax: `import` and `export`

**Named exports** — export multiple things by name:

```js
// math.js
export const PI = 3.14159

export function circleArea(r) {
  return PI * r * r
}
```

```js
// app.js
import { circleArea, PI } from './math.js'

console.log(circleArea(5))  // 78.539...
```

**Default export** — export one "main" thing:

```js
// Logger.js
export default class Logger {
  log(msg) { console.log(`[LOG] ${msg}`) }
}
```

```js
// app.js
import Logger from './Logger.js'   // no curly braces — it's the default
import { something } from './other.js'  // named exports use curly braces
```

You can mix both:

```js
// api.js
export default function fetchData() { ... }
export const BASE_URL = "https://api.example.com"

// app.js
import fetchData, { BASE_URL } from './api.js'
```

### How ES Modules Work Under the Hood

This is fundamentally different from `require()`. Here's what happens:

**Phase 1 — Parse (static analysis).**
Before *any* code runs, the JavaScript engine reads all `import` and `export` statements. This happens at parse time, not runtime. The engine builds a complete dependency graph — it knows every module your app needs before executing a single line.

This is why `import` must be at the top level:

```js
// ILLEGAL — can't put import inside an if block
if (needsMath) {
  import { circleArea } from './math.js'  // SyntaxError!
}

// require() can go anywhere — it's just a function call
if (needsMath) {
  const { circleArea } = require('./math')  // totally fine
}
```

**Phase 2 — Fetch.**
The engine downloads/reads all the module files. In a browser, this happens over the network (asynchronously!). In Node.js, it reads from disk.

**Phase 3 — Link.**
The engine connects the imports to the exports. Here's the magic: **ES module imports are live bindings**, not copies.

```js
// counter.js
export let count = 0
export function increment() { count++ }

// app.js
import { count, increment } from './counter.js'
console.log(count)    // 0
increment()
console.log(count)    // 1 — it updated! It's a live reference, not a snapshot.
```

With `require()`, you get a *copy* of the value at the time you required it:

```js
// counter.js (CommonJS)
let count = 0
module.exports = { count, increment: () => { count++ } }

// app.js (CommonJS)
const counter = require('./counter')
console.log(counter.count)    // 0
counter.increment()
console.log(counter.count)    // 0 — still 0! You got a copy of the number.
```

**Phase 4 — Evaluate.**
Finally, the engine executes the module code in dependency order (deepest dependencies first).

### Why Static Analysis Matters

Because the engine knows all imports/exports before running any code, tools can do incredible things:

**Tree shaking** — if you import only `circleArea` from a library that exports 200 functions, bundlers like Webpack, Rollup, or esbuild can *delete the other 199 functions* from your final bundle. With `require()`, this is impossible — the engine can't know what you'll require at runtime.

```js
// With ES modules, a bundler sees this:
import { circleArea } from './math.js'
// "They only need circleArea. Delete PI, squareArea, and everything else."

// With require, a bundler sees this:
const math = require('./math')
// "They might use math.anything at any point. Keep everything."
```

This is why the industry moved toward ES modules. Smaller bundles = faster websites.

---

## Chapter 5: The Awkward Transition (2016–2023)

The standard was done in 2015, but here's the problem: **Node.js already had 300,000+ packages on npm using `require()`**. You can't just delete that.

What followed was one of the messiest transitions in programming history.

### In Browsers

Browsers added support for ES modules with a special script tag:

```html
<script type="module" src="app.js"></script>
```

Without `type="module"`, the browser treats it as a classic script (global scope, no imports). With it, you get the module system. Chrome shipped this in 2017, Firefox and Safari followed.

### In Node.js

Node had to support *both* systems simultaneously. They chose a... complicated approach:

**Option A — Use `.mjs` extension** for ES modules:
```
math.mjs  -> treated as ES module (import/export)
math.js   -> treated as CommonJS (require/module.exports)
```

**Option B — Add `"type": "module"` to `package.json`:**
```json
{
  "type": "module"
}
```
Now ALL `.js` files in the project are ES modules. If you need CommonJS, use `.cjs`.

This caused mass confusion. Error messages like `"Cannot use import statement outside a module"` became one of the most Googled JavaScript errors of all time.

### The Interop Headache

Can you `require()` an ES module? Can you `import` a CommonJS module?

```js
// You CAN import a CommonJS module from an ES module
import express from 'express'  // express uses require internally — Node handles it

// You CANNOT require() an ES module (until Node 22, 2024)
const math = require('./math.mjs')  // Error!
```

This one-way incompatibility caused years of pain. Library authors had to publish *two versions* of their packages — one for `require()`, one for `import`. The `package.json` grew a new field:

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "exports": {
    "require": "./dist/index.cjs",
    "import": "./dist/index.mjs"
  }
}
```

### Node 22 — The Truce (2024)

In 2024, Node.js 22 finally allowed `require()` to load ES modules (with a flag, then unflagged in later versions). The war isn't over, but the ceasefire is holding.

---

## Chapter 6: Dynamic `import()` — The Best of Both Worlds (2020)

There's one more piece to the story. Remember how `import` must be at the top level? What if you genuinely need to load a module conditionally or lazily?

**Dynamic `import()`** — not a statement, but a *function* that returns a Promise:

```js
// Load a module only when the user clicks a button
button.addEventListener('click', async () => {
  const { heavyFunction } = await import('./heavy-module.js')
  heavyFunction()
})
```

This works everywhere — in ES modules, in CommonJS files, in browsers. It's asynchronous (returns a Promise), so it doesn't block. It's the way to do code splitting — load what you need, when you need it.

---

## Chapter 7: Where We Are Today (2026)

The ecosystem has mostly settled:

| Context | What to use | Status |
|---|---|---|
| **New projects** | `import` / `export` (ES modules) | The standard. Use this. |
| **Legacy Node.js code** | `require()` (CommonJS) | Still works. Not going away. |
| **Browsers** | `<script type="module">` or bundlers | Universal support since 2017. |
| **Lazy loading** | `await import('./module.js')` | Works everywhere. |
| **Config files** | Varies (`.mjs`, `.cjs`, `.ts`) | Still a mess, honestly. |
| **Convex, Next.js, Vite** | ES modules | Modern frameworks assume ESM. |

### The Cheat Sheet

```js
// ===== ES Modules (the present and future) =====
export const x = 1                       // named export
export default function foo() {}         // default export
import { x } from './file.js'           // named import
import foo from './file.js'              // default import
import * as everything from './file.js'  // namespace import
const mod = await import('./file.js')    // dynamic import

// ===== CommonJS (the legacy system, still everywhere) =====
module.exports = { x: 1 }               // export
module.exports = function foo() {}       // export (default-style)
const { x } = require('./file')         // import
```

### The One-Paragraph Summary

JavaScript had no module system for 14 years. Node.js invented `require()` in 2009 — synchronous, simple, and designed for servers. The language standard introduced `import`/`export` in 2015 — asynchronous-friendly, statically analyzable, and designed for everywhere. The two systems coexisted awkwardly for a decade. Today, ES modules won, but CommonJS isn't going anywhere because 2 million npm packages still use it.

---

*Every time you write `import { something } from './somewhere'`, you're using the result of a 15-year journey from global scope chaos to a real module system. It took mass confusion, a heavyweight standards body, and a community that refused to give up. Not bad for a language built in 10 days.*

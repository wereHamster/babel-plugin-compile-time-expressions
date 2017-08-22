# Evaluating expressions at compile-time

This babel plugin allows you to evaluate selected expressions at compile-time.
It is much more capable than `babel-plugin-minify-constant-folding` for two
reasons:

 - It can consume and generate arbitrary expressions, not just constants.
 - It doesn't have to guess whether it should apply to an AST node or not.
   The decision is shifted to the developer.


# Motivation

Doing expensive work once at compile time is more efficient that doing
it repeatedly at run time. We currently have a few options:

 - Generate JavaScript files in a pre-build step and load them using
   the normal mechanism (`import` or `require` statement).
 - Use [webpack](http://webpack.github.io/).

They all require a separate tool that needs to be configured, maintained,
debugged etc. Generating JavaScript source code using string concatenation
is fragile.

Babel is pretty basic and almost required in any modern project. It seems
obvious to implement compile-time transformations as babel plugins instead
of relying on yet other build tools.

Inspired by [TemplateHaskell](https://wiki.haskell.org/Template_Haskell).


# Limitations

 - The expressions must be synchronous. It's not possible to write [async
   babel plugins](http://stackoverflow.com/questions/42009968/is-it-possible-to-run-async-code-in-a-babel-plugin-visitor).


# Guide

Use `compileTimeExpression(...)` to mark which code should be evaluated at
compile-time. The `compileTimeExpression` function takes a function as
its only argument. That function will be evaluated and must return a babel
AST. The whole expression will be replaced by that AST.

The function you write is given a single argument––an object with the
following keys:

 - `t`: The babel `types`
 - `require`: If you want to require other modules just for your expression,
   without having to import the other module at the top of the file.


# Examples

## Constant folding

This is what `babel-plugin-minify-constant-folding` would do.

```
const x = compileTimeExpression(({t}) =>
  t.stringLiteral("Hello" + "World"))
```

```
const x = "HelloWorld"
```

## Constant folding using bindings from the scope

The function has access to all bindings in its scope.

```
const world = "World"
const x = compileTimeExpression(({t}) =>
  t.stringLiteral("Hello" + world))
```

```
const world = "World"
const x = "HelloWorld"
```

## Constant folding using functions from the scope

The bindings include not only variable declarations but also functions.
You can use these functions in the expression.

```
const worldF = () => "World"
const x = compileTimeExpression(({t}) =>
  t.stringLiteral("Hello" + worldF()))
```

```
const worldF = () => "World"
const x = "HelloWorld"
```

## Load a JSON file

Use the supplied `require` function to load files. And then convert arbitrary
JavaScript values into a babel AST node using `valueToNode`.

```
const x = compileTimeExpression(({t, require}) =>
  t.valueToNode(require('./package.json')))
```

```
const x = {name: "...", dependencies: { ... } }
```

## Load a text file

All IO must be synchronous. And note that `valueToNode` can not convert
`Buffer`s into AST nodes, so read the file as string (utf8).

```
const x = compileTimeExpression(({t, require}) =>
  t.valueToNode(require('fs').readFileSync('./README.md', 'utf8')))
```

```
const x = "..."
```

## Generate functions

Consult the babel documentation to see how to generate complex
AST nodes.

```
const makeAnswer = compileTimeExpression(({t, require}) =>
  t.arrowFunctionExpression([],
    t.blockStatement([t.returnStatement(t.numericLiteral(42)])))
```

```
const makeAnswer = () => 42
```

## Parse text into MDAST

Instead of using a webpack loader, you can load a file and convert into
MDAST using this plugin.

```
const readmeMDAST = compileTimeExpression(({t, require}) => {
  const unified = require('unified')
  const parse = require('remark-parse')
  const remark = unified().use(parse)
  const fs = require('fs')
  const markdown = fs.readFileSync('./README.md', 'utf8')
  const root = processor.run(processor.parse(markdown))

  return t.valueToNode(root)
})
```

If you have multiple places where you want to load MDAST from files,
you can place the code in a separate module and `require()` the relevant function
in the compile-time expression.

```
// loadAsMarkdown.js
module.exports = path => ({t, require}) => {
  const unified = require('unified')
  const parse = require('remark-parse')
  const remark = unified().use(parse)
  const fs = require('fs')
  const markdown = fs.readFileSync(path, 'utf8')
  const root = processor.run(processor.parse(markdown))

  return t.valueToNode(root)
}
```

```
// project-file.js
const loadAsMakdown = require('./loadAsMarkdown');

const readmeMDAST = compileTimeExpression(loadAsMakdown('./README.md'));
const introductionMDAST = compileTimeExpression(loadAsMakdown('./docs/Introduction.md'));
```


## Quote expressions

Use `__e()` to convert arbitrary JS code into its corresponding AST. This enables you
to easily generate AST using plain JS syntax, instead of having to construct the AST
manually.

You can think of it as if whatever you put into the parenthesis is copied verbatim into
the generated code.

```
const one = 1
const addOne = compileTimeExpression(({}) => __e(x => x + one)

// ->

const one = 1
const addOne = x => x + one
```

Here in combinate with manually constructod AST which uses `__e()` to refer to bindings
in scope.

```
const numbers = [1,2,3,4]
const inc = x => x + 1
const higherNumbers = compileTimeExpression(({t}) =>
  t.callExpression(t.memberExpression(__e(numbers), t.identifier('map')), [__e(inc)]))

// ->

const numbers = [1,2,3,4]
const inc = x => x + 1
const higherNumbers = numbers.map(inc)
```


## Async transformations

There is a [workaround](http://stackoverflow.com/questions/42009968/is-it-possible-to-run-async-code-in-a-babel-plugin-visitor) to
use asynchronous code inside babel plugins. But it incurs a large overhead.
It would be nice to only use the workaround when absolutely necessary.

const config = require('./config');
const colors = require('./colors');

const string1 = compileTimeExpression(function({ t, require }) {
  const markdown = require('../markdown');
  require('fs').writeFile('out', JSON.stringify(config.responsiveLoaderConfig), () => {
    setTimeout(() => { console.log('write done'); }, 1000);
  });
  return t.valueToNode(markdown());
});

// const img = compileTimeExpression(() => {
//   const jimp = require('jimp');
//   jimp.read('../image.jpg', (err, img) => {
//     console.log('done');
//   });
// });

const packageJson = compileTimeExpression(({t, require}) =>
  t.valueToNode(require('../package.json')));

const hello = "Hello"
const worldF = () => "World"
const string2 = compileTimeExpression(({t}) => t.stringLiteral(hello + " " + worldF()));

function inc(a) {
  const b = 2;
  return a + 1;
}

const string3 = compileTimeExpression(({t, require}) => {
  return t.arrowFunctionExpression([],
    t.blockStatement(
      [ t.returnStatement(t.numericLiteral(inc(2)))
      ]));
});

const x = compileTimeExpression(({t, require}) =>
  t.valueToNode(require('fs').readFileSync('./README.md', 'utf8')));


// Generate a function
const add1 = compileTimeExpression(({t}) => __e(x => x + 1));

// Generate a function which uses bindings from the scope.
const some = 2
const addSome = compileTimeExpression(({t}) => __e(x => x + some));

// Generate a function and call it immediately. Doesn't really make sense though.
const two = compileTimeExpression(({t}) => {
  const f = __e(x => x + 1)
  return t.callExpression(f, [__e(1)])
});

const two2 = compileTimeExpression(({t}) => __e(inc()))

const arr1 = compileTimeExpression(({t}) => t.callExpression(
  t.memberExpression(__e([1,2,3]), t.identifier('map')), [__e(inc)]))

const arr2 = compileTimeExpression(({t}) => {
  const f = __e(x => x + 1)
  return t.callExpression(t.memberExpression(__e(arr1), t.identifier('map')), [f])
});

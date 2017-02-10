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
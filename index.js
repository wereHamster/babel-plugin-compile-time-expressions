const vm = require("vm");
const {join, dirname} = require("path")
const jsesc = require("jsesc");
const generate = require("babel-generator").default;

const cwd = process.cwd();

const collectContext = (t, scope) => {
  const context = [];

  for (const k in scope.bindings) {
    const binding = scope.bindings[k];
    if (binding.path.node.type === 'FunctionDeclaration') {
      context.push(t.variableDeclaration('const', [t.variableDeclarator(binding.identifier, t.functionExpression(binding.path.node.id, binding.path.node.params, binding.path.node.body))]));
    } else if (binding.path.node.type === 'VariableDeclarator') {
      const init = binding.path.node.init;
      if (!init.callee || init.callee.name !== 'compileTimeExpression') {
        context.push(t.variableDeclaration('const', [binding.path.node]));
      }
    } else {
      console.log('collectContext: unknown node type', binding.path.node.type)
    }
  }

  return context;
}

module.exports = ({ types: t, traverse }) => {
  return {
    name: "compile-time-expressions",
    visitor: {
      CallExpression(path) {
        const { node } = path;

        if (node.callee.name !== 'compileTimeExpression') {
          return;
        }

        if (node.arguments.length !== 1) {
          return;
        }

        const context = collectContext(t, path.scope);
        const arg = node.arguments[0];

        if (arg.type === 'FunctionExpression' || arg.type === 'ArrowFunctionExpression') {
          const body = t.blockStatement([].concat(context, arg.body.type === 'BlockStatement' ? arg.body.body : t.returnStatement(arg.body)));
          const code = 'f = function({t, require}) ' + generate(body).code;

          const dn = join(cwd, dirname(path.hub.file.opts.filenameRelative));
          const f = vm.runInThisContext(code);
          path.replaceWith(f({
            t,
            require(path) { return require(path[0] === '.' ? join(dn, path) : path)}
          }));

        } else {
          console.log('compile-time-expressions: invalid arg type', arg.type);
        }
      },
    },
  };
};
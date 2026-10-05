const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const SUPPORTED_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch']);
const OTHER_HTTP_METHODS = new Set(['all', 'connect', 'head', 'options', 'trace']);

function associatedJSDoc(node, source) {
  if (!node || !node.leadingComments) {
    return null;
  }
  const jsdoc = node.leadingComments
    .filter((comment) => (
      comment.type === 'CommentBlock'
      && comment.value.startsWith('*')
      && source.slice(comment.end, node.start).trim() === ''
    ))
    .pop();
  return jsdoc ? jsdoc.value : null;
}

function functionName(node) {
  if (!node) {
    return 'anonymous';
  }
  if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') && node.id) {
    return node.id.name;
  }
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    return 'anonymous';
  }
  return 'anonymous';
}

function staticRoutePath(node) {
  if (node && node.type === 'StringLiteral') {
    return node.value;
  }
  if (node && node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return null;
}

function analyzeFile(filePath, sourceText) {
  let source = sourceText;
  if (source === undefined) {
    try {
      source = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return {
        endpoints: [],
        warnings: [`Cannot read source file "${filePath}": ${error.message}`],
        unsupportedPatterns: []
      };
    }
  }

  let ast;
  try {
    ast = parser.parse(source, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
      errorRecovery: false
    });
  } catch (error) {
    return {
      endpoints: [],
      warnings: [`Cannot parse "${filePath}" at line ${error.loc ? error.loc.line : '?'}: ${error.message}`],
      unsupportedPatterns: []
    };
  }

  const declarations = new Map();
  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.node.id) {
        declarations.set(path.node.id.name, {
          node: path.node,
          jsdoc: associatedJSDoc(path.node, source)
        });
      }
    },
    VariableDeclarator(path) {
      if (path.node.id.type === 'Identifier'
        && ['ArrowFunctionExpression', 'FunctionExpression'].includes(path.node.init && path.node.init.type)) {
        declarations.set(path.node.id.name, {
          node: path.node.init,
          jsdoc: associatedJSDoc(path.node, source)
            || associatedJSDoc(path.parentPath.node, source)
        });
      }
    }
  });

  const endpoints = [];
  const warnings = [];
  const unsupportedPatterns = [];
  traverse(ast, {
    CallExpression(callPath) {
      const { callee } = callPath.node;
      if (callee.type !== 'MemberExpression'
        || callee.object.type !== 'Identifier'
        || !['app', 'router'].includes(callee.object.name)) {
        return;
      }

      const methodName = !callee.computed && callee.property.type === 'Identifier'
        ? callee.property.name.toLowerCase()
        : null;
      if (!methodName || !SUPPORTED_METHODS.has(methodName)) {
        if (callee.computed || methodName === 'route' || OTHER_HTTP_METHODS.has(methodName)) {
          const location = callPath.node.loc.start;
          const unsupported = {
            type: OTHER_HTTP_METHODS.has(methodName) ? 'unsupportedHttpMethod' : 'unsupportedRouteRegistration',
            filePath,
            line: location.line,
            method: methodName ? methodName.toUpperCase() : 'dynamic',
            description: OTHER_HTTP_METHODS.has(methodName)
              ? `Unsupported ${methodName.toUpperCase()} method is not inventoried in Phase 1.`
              : 'Computed or unsupported route registration is not inventoried in Phase 1.'
          };
          unsupportedPatterns.push(unsupported);
          warnings.push(`${unsupported.description} in "${filePath}" at line ${location.line}`);
        }
        return;
      }

      const method = methodName.toUpperCase();
      const routePath = staticRoutePath(callPath.node.arguments[0]);
      if (routePath === null) {
        const location = callPath.node.loc.start;
        const unsupported = {
          type: 'dynamicRoute',
          filePath,
          line: location.line,
          method,
          description: `Unsupported dynamic ${method} route.`
        };
        unsupportedPatterns.push(unsupported);
        warnings.push(`${unsupported.description} in "${filePath}" at line ${location.line}`);
        return;
      }

      const handlerNode = callPath.node.arguments.slice(1).reverse().find((argument) => (
        ['FunctionExpression', 'ArrowFunctionExpression', 'Identifier'].includes(argument.type)
      ));
      const declaration = handlerNode && handlerNode.type === 'Identifier'
        ? declarations.get(handlerNode.name)
        : null;
      const resolvedHandler = declaration ? declaration.node : handlerNode;
      const handler = handlerNode && handlerNode.type === 'Identifier'
        ? handlerNode.name
        : functionName(handlerNode);
      const jsdoc = (declaration && declaration.jsdoc)
        || associatedJSDoc(resolvedHandler, source)
        || associatedJSDoc(handlerNode, source)
        || associatedJSDoc(callPath.node, source)
        || associatedJSDoc(callPath.parentPath.node, source);
      const location = callPath.node.loc.start;

      endpoints.push({
        id: `${filePath}:${location.line}:${location.column}:${method}:${routePath}`,
        method,
        path: routePath,
        handler,
        filePath,
        line: location.line,
        jsdoc
      });
    }
  });

  return { endpoints, warnings, unsupportedPatterns };
}

function analyzeFiles(filePaths) {
  const endpoints = [];
  const warnings = [];
  const unsupportedPatterns = [];
  filePaths.forEach((filePath) => {
    const result = analyzeFile(filePath);
    endpoints.push(...result.endpoints);
    warnings.push(...result.warnings);
    unsupportedPatterns.push(...result.unsupportedPatterns);
  });
  return { endpoints, warnings, unsupportedPatterns };
}

module.exports = {
  analyzeFile,
  analyzeFiles,
  staticRoutePath
};

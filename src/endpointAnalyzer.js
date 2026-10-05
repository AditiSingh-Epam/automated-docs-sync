const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const SUPPORTED_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch']);

function nodeComments(node) {
  return node && node.leadingComments
    ? node.leadingComments.filter((comment) => comment.type === 'CommentBlock' && comment.value.startsWith('*'))
    : [];
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
        warnings: [`Cannot read source file "${filePath}": ${error.message}`]
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
      warnings: [`Cannot parse "${filePath}" at line ${error.loc ? error.loc.line : '?'}: ${error.message}`]
    };
  }

  const declarations = new Map();
  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.node.id) {
        declarations.set(path.node.id.name, {
          node: path.node,
          comments: nodeComments(path.node)
        });
      }
    },
    VariableDeclarator(path) {
      if (path.node.id.type === 'Identifier'
        && ['ArrowFunctionExpression', 'FunctionExpression'].includes(path.node.init && path.node.init.type)) {
        declarations.set(path.node.id.name, {
          node: path.node.init,
          comments: [
            ...nodeComments(path.node),
            ...nodeComments(path.parentPath.node)
          ]
        });
      }
    }
  });

  const endpoints = [];
  const warnings = [];
  traverse(ast, {
    CallExpression(callPath) {
      const { callee } = callPath.node;
      if (callee.type !== 'MemberExpression'
        || callee.computed
        || callee.object.type !== 'Identifier'
        || !['app', 'router'].includes(callee.object.name)
        || callee.property.type !== 'Identifier'
        || !SUPPORTED_METHODS.has(callee.property.name.toLowerCase())) {
        return;
      }

      const method = callee.property.name.toUpperCase();
      const routePath = staticRoutePath(callPath.node.arguments[0]);
      if (routePath === null) {
        warnings.push(`Unsupported dynamic ${method} route in "${filePath}" at line ${callPath.node.loc.start.line}`);
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
      const comments = [
        ...(declaration ? declaration.comments : []),
        ...nodeComments(resolvedHandler),
        ...nodeComments(handlerNode),
        ...nodeComments(callPath.node)
      ];
      const jsdoc = comments.length ? comments[0].value : null;
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

  return { endpoints, warnings };
}

function analyzeFiles(filePaths) {
  const endpoints = [];
  const warnings = [];
  filePaths.forEach((filePath) => {
    const result = analyzeFile(filePath);
    endpoints.push(...result.endpoints);
    warnings.push(...result.warnings);
  });
  return { endpoints, warnings };
}

module.exports = {
  analyzeFile,
  analyzeFiles,
  staticRoutePath
};

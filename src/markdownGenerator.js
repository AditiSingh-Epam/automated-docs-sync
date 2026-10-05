const { escapeMarkdown } = require('./utils');

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

function renderParams(params) {
  if (!params || params.length === 0) {
    return '';
  }
  return params.map((param) => {
    const type = param.type ? `\`${escapeMarkdown(param.type)}\` ` : '';
    const description = param.description ? `: ${escapeMarkdown(param.description)}` : '';
    return `${type}\`${escapeMarkdown(param.name)}\`${description}`;
  }).join('<br>');
}

function renderReturns(returns) {
  if (!returns) {
    return '';
  }
  const type = returns.type ? `\`${escapeMarkdown(returns.type)}\`` : '';
  const description = returns.description ? escapeMarkdown(returns.description) : '';
  return [type, description].filter(Boolean).join(': ');
}

function generateMarkdown(endpoints, timestamp) {
  const lines = [
    '# API Reference',
    '',
    `Generated: ${escapeMarkdown(timestamp)}`,
    ''
  ];

  METHOD_ORDER.forEach((method) => {
    const methodEndpoints = endpoints.filter((endpoint) => endpoint.method === method);
    if (methodEndpoints.length === 0) {
      return;
    }
    lines.push(`## ${method}`, '');
    lines.push('| Route | Handler | Description | Parameters | Returns |');
    lines.push('| --- | --- | --- | --- | --- |');
    methodEndpoints.forEach((endpoint) => {
      lines.push(`| \`${escapeMarkdown(endpoint.path)}\` | \`${escapeMarkdown(endpoint.handler)}\` | ${escapeMarkdown(endpoint.summary || 'Undocumented')} | ${renderParams(endpoint.params)} | ${renderReturns(endpoint.returns)} |`);
    });
    lines.push('');
  });

  if (endpoints.length === 0) {
    lines.push('No endpoints found.', '');
  }
  return `${lines.join('\n')}\n`;
}

module.exports = {
  generateMarkdown,
  renderParams,
  renderReturns
};

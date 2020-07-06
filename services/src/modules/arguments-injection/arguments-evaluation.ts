const exprStart = /{/g;
const fullCapture = /^{[^{]+}$/g;

function evaluateArgument<T>(expression: string, data: Record<string, unknown> = {}): T {
  return new Function(...Object.keys(data), `return ${expression};`)(...Object.values(data));
}

function evaluate<T>(template: string, data?: Record<string, unknown>): T {
  if (template.match(fullCapture)) {
    return evaluateArgument(template.slice(1, -1), data);
  }

  const expression = template.replace(exprStart, '${');
  return evaluateArgument(`\`${expression}\``, data);
}

export default evaluate;

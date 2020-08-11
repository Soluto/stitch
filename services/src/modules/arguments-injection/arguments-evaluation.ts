import { VM } from 'vm2';

const exprStart = /{/g;
const fullCapture = /(^{[^{]+}$)|(^{{.+}}$)/g;

function evaluate<T>(template: string, data?: Record<string, unknown>): T {
  const vm = new VM().setGlobals(data);
  const fullMatch = template.match(fullCapture);
  if (fullMatch) {
    return vm.run(`(function evaluate() { return ${template.slice(1, -1)}; })()`);
  }

  const expression = template.replace(exprStart, '${');
  return vm.run(`\`${expression}\``);
}

export default evaluate;

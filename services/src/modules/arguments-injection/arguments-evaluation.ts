import { VM } from 'vm2';
import { argumentInjectionGlobals } from '../plugins';

const exprStart = /{/g;
const fullCapture = /(^{[^{]+}$)|(^{{.+}}$|^{\[.+]}$)/gs;

function evaluate<T>(template: string, data?: Record<string, unknown>): T {
  try {
    const vm = new VM().setGlobal('globals', argumentInjectionGlobals).setGlobals(data);
    const fullMatch = template.match(fullCapture);
    if (fullMatch) {
      return vm.run(`(function evaluate() { return ${template.slice(1, -1).trim()}; })()`);
    }

    const expression = template.replace(exprStart, '${');
    return vm.run(`\`${expression}\``);
  } catch {
    return (template as unknown) as T;
  }
}

export default evaluate;

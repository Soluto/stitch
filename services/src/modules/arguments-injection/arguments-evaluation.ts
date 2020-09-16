import { VM } from 'vm2';
import { argumentInjectionBuiltIns } from '../config';

const exprStart = /{/g;
const fullCapture = /(^{[^{]+}$)|(^{{.+}}$)/g;

export function evaluate<T>(template: string, data?: Record<string, unknown>): T {
  try {
    const vm = new VM().setGlobal('builtIns', builtIns).setGlobals(data);
    const fullMatch = template.match(fullCapture);
    if (fullMatch) {
      return vm.run(`(function evaluate() { return ${template.slice(1, -1)}; })()`);
    }

    const expression = template.replace(exprStart, '${');
    return vm.run(`\`${expression}\``);
  } catch {
    return (template as unknown) as T;
  }
}

let builtIns: unknown;

export async function initBuiltIns() {
  if (argumentInjectionBuiltIns) {
    builtIns = await import(argumentInjectionBuiltIns);
  }
}

export default evaluate;

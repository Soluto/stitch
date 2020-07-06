import { RequestContext } from '../context';
import { inject } from './arguments-injection';

interface TestCase {
  template: string;
  source?: unknown;
  args?: Record<string, unknown>;
  context?: RequestContext;
  expected: unknown;
}

const testCases: [string, TestCase][] = [
  [
    'From source',
    {
      template: '{source.id}',
      source: { id: '1' },
      expected: '1',
    },
  ],
  [
    'From args',
    {
      template: '{args.isWorking}',
      args: { isWorking: true },
      expected: true,
    },
  ],
];

describe('Argument Injection Tests', () => {
  test.each(testCases)('%s', (_, { template, source, args, context, expected }) => {
    const result = inject(template, source, args, context);
    expect(result).toEqual(expected);
  });
});

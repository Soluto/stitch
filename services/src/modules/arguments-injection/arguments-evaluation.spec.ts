import evaluate from './arguments-evaluation';

interface TestCase {
  template: string;
  data?: Record<string, unknown>;
  expected: unknown;
}

const testCases: [string, TestCase][] = [
  [
    'Static Value',
    {
      template: 'Hello',
      expected: 'Hello',
    },
  ],
  [
    'Simple expression',
    {
      template: '{foo}',
      data: { foo: 'bar' },
      expected: 'bar',
    },
  ],
  [
    'Simple number',
    {
      template: '{foo}',
      data: { foo: 5 },
      expected: 5,
    },
  ],
  [
    'Several expressions',
    {
      template: 'Hello {foo} and {bar}',
      data: { foo: 'Foo', bar: 'Bar' },
      expected: 'Hello Foo and Bar',
    },
  ],
  [
    'Complex expression',
    {
      template: '{foo[bar].name}',
      data: { foo: { alex: { name: 'alex' } }, bar: 'alex' },
      expected: 'alex',
    },
  ],
  [
    'One expression in the beginning and one at the end',
    {
      template: '{1} + {2}',
      data: { foo: 'Foo', bar: 'Bar' },
      expected: '1 + 2',
    },
  ],
  [
    'Object builder',
    {
      template: '{{ foo, bar }}',
      data: { foo: 'Foo', bar: 'Bar' },
      expected: { foo: 'Foo', bar: 'Bar' },
    },
  ],
  [
    'Object with serialized object as property',
    {
      template: '{{ foo, bar, baz: "{ \\"foo\\": \\"FOO\\", \\"bar\\": { \\"baz\\": \\"BAZ\\" } }" }}',
      data: { foo: 'Foo', bar: 'Bar' },
      expected: { foo: 'Foo', bar: 'Bar', baz: '{ "foo": "FOO", "bar": { "baz": "BAZ" } }' },
    },
  ],
  [
    'Array builder',
    {
      template: '{[ { foo, bar } ]}',
      data: { foo: 'Foo', bar: 'Bar' },
      expected: [{ foo: 'Foo', bar: 'Bar' }],
    },
  ],
  [
    'Return value if not valid (object)',
    {
      template: '{{ foo, bar }',
      data: { foo: 'Foo', bar: 'Bar' },
      expected: '{{ foo, bar }',
    },
  ],
  [
    'Return value if not valid (array)',
    {
      template: '{[] { foo }}',
      data: { foo: 'Foo' },
      expected: '{[] { foo }}',
    },
  ],
];

describe('Argument Injection Tests - Evaluation', () => {
  test.each(testCases)('%s', (_, { template, data, expected }) => {
    const result = evaluate(template, data);
    expect(result).toEqual(expected);
  });
});

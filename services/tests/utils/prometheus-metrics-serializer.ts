export default {
  test(arg: any): boolean {
    return arg && Array.isArray(arg) && arg[0].startsWith('# HELP');
  },
  print(val: any): string {
    const metrics: string[] = val;
    const metricsWithoutValues = metrics.map(line => {
      if (line.startsWith('#')) return line;
      return line
        .replace(/(parentType|fieldName|status)="([\w+.]+)"/g, '$1: $2')
        .replace(/="[\w+.]+"/g, '="X"')
        .replace(/ [+-]?\d+(\.\d+)?$/, ' Y');
    });
    // Write only metrics for metrics tests
    return metricsWithoutValues
      .filter(
        (line, idx) =>
          metricsWithoutValues.indexOf(line) === idx && (line.includes('MetricsFoo') || line.includes('m_foo'))
      )
      .join('\n');
  },
};

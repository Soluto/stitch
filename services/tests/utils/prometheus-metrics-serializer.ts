export default {
  test(arg: any): boolean {
    return arg && Array.isArray(arg) && arg[0].startsWith('# HELP');
  },
  print(val: any): string {
    const metrics: string[] = val;
    const metricsWithoutValues = metrics.map(line => {
      if (line.startsWith('#')) return line;
      return line.replace(/="[\w+.]+"/g, '="X"').replace(/ [+-]?\d+(\.\d+)?$/, ' Y');
    });
    return metricsWithoutValues.filter((line, idx) => metricsWithoutValues.indexOf(line) === idx).join('\n');
  },
};

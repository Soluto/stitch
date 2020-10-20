const format = require('string-format');

module.exports = {
  addArgumentInjectionGlobals: () => ({
    format: a => format('Hello, {}!', a),
  }),
};

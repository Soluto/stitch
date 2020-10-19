const { inspect } = require('util');

module.exports = {
  addArgumentInjectionGlobals: () => ({
    inspect: a => inspect(a),
  }),
};

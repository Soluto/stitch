module.exports = {
  configure(options) {
    if (!options.arg1) {
      throw new Error('Invalid configuration provided.');
    }
  },
};

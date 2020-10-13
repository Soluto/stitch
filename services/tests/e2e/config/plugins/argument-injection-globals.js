module.exports = {
  addArgumentInjectionGlobals: () => ({
    someUtilFn: a => `__${a}__`,
  }),
};

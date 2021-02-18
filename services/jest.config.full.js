module.exports = {
  projects: [
    ...require('./jest.config').projects,
    ...require('./jest.config.blackbox').projects,
    ...require('./jest.config.e2e').projects,
  ],
};

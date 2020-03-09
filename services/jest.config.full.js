module.exports = {
    projects: [...require('./jest.config').projects, ...require('./jest.config.e2e').projects],
};

module.exports = {
  injectGlobals: true,
  resetMocks: false,
  testEnvironment: "node",
  verbose: true,
  rootDir: "dist/",
  testTimeout: 60 * 1000,
  setupFiles: ['../jest.setup.js'],
};

process.env.NODE_ENV = "test";

// the-new is a standalone package: resolve its imports against its own package.json, not the docs site's.
module.exports = {
  rules: {
    "import/no-extraneous-dependencies": ["error", { packageDir: __dirname }],
  },
};

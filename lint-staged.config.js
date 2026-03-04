// lint-staged.config.js
/** @type {import('lint-staged').Configuration} */
module.exports = {
  // Lintable files: format first, then lint (sequential, no race condition)
  '{apps,packages}/**/*.{ts,js,tsx,jsx,mjs,cjs,html}': [
    files => `nx format:write --no-tui --files=${files.join(',')}`,
    files => `nx affected --target=lint --fix --no-tui --files=${files.join(',')}`,
  ],
  // Format-only files
  '{apps,packages}/**/*.{json,md,css,scss}': [
    files => `nx format:write --no-tui --files=${files.join(',')}`,
  ],
};

# Compile library
- `yarn install` to install dependencies
- `yarn build` to build library. Output is in `dist` folder.

# Lint
- `yarn lint` or `yarn lint-autofix`

# Publish
- Increase version number in `package.json`
- Build library `yarn build`
- Authenticate to Github Packages (https://docs.github.com/en/packages/using-github-packages-with-your-projects-ecosystem/configuring-npm-for-use-with-github-packages#authenticating-to-github-packages)
- `npm publish`
# Publish and submit WriteAlt

## One-time account setup

1. Public source repository: https://github.com/salaheddinesalmi007/n8n. The contents of this directory belong at its root, including `.github`, excluding `node_modules` and `dist`.
2. The repository URL is already configured in package.json. npm provenance must match this public repository.
3. Confirm you own the npm package name `n8n-nodes-writealt`. If it is unavailable, use a package name under your npm organization, such as `@YOUR-SCOPE/n8n-nodes-writealt`, and update the example workflow node type accordingly.
4. For the first publish, create an npm granular access token permitted to create/publish this package. Store it in the repository's Actions secrets as `NPM_TOKEN`. Never put the token in source files.
5. After the package exists, configure npm Trusted Publishing for owner `salaheddinesalmi007`, repository `n8n`, and workflow `publish.yml`. You can then remove the token secret and use OIDC publishing.

## Test before release

```cmd
cd "C:\Users\salmi\Documents\wirtealt-extensions\integrations\n8n"
npm ci
npm run lint
npm test
npm run dev
```

In the local n8n instance, import `examples/local-development.json`, add your credential, and execute. Local development registers the node as `CUSTOM.writeAlt`; the separate `generate-alt-text.json` example is for the published npm package. Confirm the output contains the submitted URL and real generated text. Test Get Account, Get Languages, and two incoming image items. Generation uses credits.

## Release through GitHub Actions

After setting the repository URL and committing/pushing this package to the public repository:

```cmd
git tag v1.0.0
git push origin v1.0.0
```

The Publish workflow runs lint and tests, checks the version/repository, and publishes to npm with provenance. Publishing from your local computer will not satisfy n8n's verification requirement.

## Submit for verification

1. Confirm the npm package page shows version 1.0.0, README, license, public repository, and provenance.
2. Run `npx @n8n/scan-community-package n8n-nodes-writealt` on the published package and resolve any findings.
3. Sign in at https://creators.n8n.io/nodes and submit the package.
4. Provide the package name, public source URL, WriteAlt homepage, API documentation link, and support email. Follow any reviewer requests for a dedicated test credential; do not put credentials in a public repository.

Suggested description: WriteAlt generates multilingual image alt text for accessibility and SEO, with writing styles and keyword context.

After approval, users can discover and install the verified node in n8n Cloud and self-hosted n8n. Publication and approval are separate from preparing this package.

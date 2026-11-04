// Archived Enterprise Server docs used to live in one repository,
// github/help-docs-archived-enterprise-versions, under a directory per version.
// They now live in one GitHub Pages site per version: github.github.com/docs-ghes-<version>/.
// Given the legacy proxy path ("/<version>/<rest>"), return the URL on the new host.
export default function getArchivedVersionUrl(proxyPath) {
  const [, version, ...rest] = proxyPath.split('/')
  return `https://github.github.com/docs-ghes-${version}/${rest.join('/')}`
}

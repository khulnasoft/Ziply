module.exports = {
    branches: ["main"],
    plugins: [
      "@semantic-release/commit-analyzer", // Analyze commit messages
      "@semantic-release/release-notes-generator", // Generate release notes
      "@semantic-release/changelog", // Update CHANGELOG.md
      "@semantic-release/npm", // Publish package to npm
      [
        "@semantic-release/git",
        {
          assets: ["CHANGELOG.md", "package.json", "package-lock.json"],
          message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
        },
      ],
    ],
  };
  
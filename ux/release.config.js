module.exports = {
    branches: ['main', { name: 'develop', prerelease: true }],
    repositoryUrl: "https://github.com/curtisgray/wingman",
    plugins: [
        "@semantic-release/commit-analyzer", // Analyzes commits to determine the version bump
        "@semantic-release/release-notes-generator", // Generates release notes from commits
        "@semantic-release/changelog", // Updates the CHANGELOG.md file
        [
            "@semantic-release/npm", // Updates the version in package.json (and optionally publishes to npm)
            {
                npmPublish: false, // Change to true if publishing to npm is desired
                tarballDir: "release", // Specify the directory where the npm package tarball should be saved (if npmPublish is false)
            },
        ],
        [
            "@semantic-release/github", // Creates or updates the GitHub release
            {
                assets: [
                    // Specify the path and label of the build artifacts to include in the GitHub release
                    { path: "out/make/squirrel.windows/x64/*.exe", label: "Wingman for Windows" },
                    { path: "out/make/*.deb", label: "Wingman for Linux" },
                    { path: "out/make/*.dmg", label: "Wingman for macOS" }
                ],
            },
        ],
        [
            "@semantic-release/git", // Commits changes to package.json and CHANGELOG.md back to the repo
            {
                assets: ['package.json', 'CHANGELOG.md', 'yarn.lock', 'npm-shrinkwrap.json'],
                message: 'chore(release): set `package.json` to ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
            },
        ],
    ],
};

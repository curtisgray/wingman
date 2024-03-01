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
                npmPublish: false, // Set to true if you want to publish to npm, false if you're just releasing on GitHub
            },
        ],
        [
            "@semantic-release/github", // Creates or updates the GitHub release
            {
                assets: [
                    // List any build artifacts you want to include in your GitHub release here
                    // Example: {path: 'dist/my-app.zip', label: 'My App for Windows'}
                ],
            },
        ],
        [
            "@semantic-release/git", // Commits changes to package.json and CHANGELOG.md back to the repo
            {
                assets: ['package.json', 'CHANGELOG.md'],
                message: 'chore(release): set `package.json` to ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
            },
        ],
    ],
};

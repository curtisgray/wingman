const path = require("path");
const fs = require("fs").promises;
// const winston = require("winston");

// Documentation for the forge config can be found at:
// https://electron.github.io/packager/main/interfaces/Options.html
module.exports = {
    packagerConfig: {
        asar: true,
        extraResource: [
            "server/wingman",
            ".next/standalone",
        ],
        icon: "assets/logo-color",
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            icon: "assets/logo-color",
            config: {},
        },
        {
            name: "@electron-forge/maker-zip",
            icon: "assets/logo-color",
            platforms: ["darwin", "win32", "linux"],
        },
        {
            name: "@electron-forge/maker-deb",
            icon: "assets/logo-color",
            config: {},
        },
        {
            name: "@electron-forge/maker-rpm",
            icon: "assets/logo-color",
            config: {},
        },
        {
            name: "@electron-forge/maker-dmg",
            icon: "assets/logo-color",
            config: {
                format: "ULFO",
            },
        },
    ],
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                repository: {
                    owner: "curtisgray",
                    name: "wingman",
                },
                prerelease: true,
                force: true,
                generateReleaseNotes: true,
            },
        },
    ],
    plugins: [
        {
            name: "@electron-forge/plugin-auto-unpack-natives",
            config: {},
        },
    ],
    hooks: {
        generateAssets: async (config, buildPath) => {
            // run the next build command
            const { execSync } = require("child_process");
            execSync("npm run build", { cwd: __dirname });
            // copy the static folder into standalone/.next. standalone/public is already copied by electron-forge
            //  though NextJs docs say to copy the public folder, it seems to work without it
            var src = path.join(__dirname, ".next", "static");
            var dst = path.join(__dirname, ".next", "standalone", ".next", "static");
            await fs.cp(src, dst, { recursive: true });
        },
    },
};

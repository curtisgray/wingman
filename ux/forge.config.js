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
        osxSign: {},
        osxNotarize: {
            tool: 'notarytool',
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID
        }
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            icon: "assets/logo-color",
            config: {
                name: "Wingman",
                setupIcon: "assets/logo-color.ico",
                signWithParams: `/a /tr http://timestamp.comodoca.com /td sha256 /fd sha256 /f \"${process.env.WINGMAN_CODESIGN_CERT_PATH}\" /n \"${process.env.WINGMAN_CODESIGN_CERT_NAME}\" /csp \"${process.env.WINGMAN_CODESIGN_CERT_CSP}\" /kc \"[{{${process.env.WINGMAN_CODESIGN_CERT_PASSWORD}}}]=${process.env.WINGMAN_CODESIGN_CERT_CONTAINER}\"`,
            },
        },
        {
            name: "@electron-forge/maker-zip",
            icon: "assets/logo-color.ico",
            platforms: ["darwin", "win32", "linux"],
        },
        {
            name: "@electron-forge/maker-deb",
            icon: "assets/logo-color.png",
            config: {},
        },
        {
            name: "@electron-forge/maker-rpm",
            icon: "assets/logo-color",
            config: {},
        },
        {
            name: "@electron-forge/maker-dmg",
            config: {
                format: "ULFO",
                icon: "assets/logo-color.icns",
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

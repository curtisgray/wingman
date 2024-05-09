import path from 'path';
import fs from 'fs/promises';

// Documentation for the forge config can be found at:
// https://electron.github.io/packager/main/interfaces/Options.html
const packagerConfig = {
    asar: true,
    extraResource: [
        "server/wingman",
        ".dist",
    ],
    icon: "assets/logo-color",
    osxSign: {},
    osxNotarize: {
        tool: 'notarytool',
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID
    }
};

const rebuildConfig = {};

const makers = [
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
];

const publishers = [
    {
        name: '@electron-forge/publisher-github',
        config: {
            repository: {
                owner: "curtisgray",
                name: "wingman",
            },
        },
    },
];

const plugins = [
    {
        name: "@electron-forge/plugin-auto-unpack-natives",
        config: {},
    },
];

const hooks = {
    generateAssets: async (config, buildPath) =>
    {
        // run the next build command
        import('child_process').then(cp =>
        {
            cp.execSync("npm run build", { cwd: path.dirname(import.meta.url) });
        });
    },
    packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) =>
    {
        // files under server/wingman are already copied to
        //   resources folder so we can delete them from the root
        await fs.rm(path.join(buildPath, "server", "wingman"), { recursive: true });
        await fs.rm(path.join(buildPath, ".dist"), { recursive: true });
    },
};

export { packagerConfig, rebuildConfig, makers, publishers, plugins, hooks };

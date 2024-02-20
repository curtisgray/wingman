const path = require('path');
const fs = require('fs');

module.exports = {
    packagerConfig: {
        asar: true,
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {},
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin', 'win32', 'linux'],
        },
        {
            name: '@electron-forge/maker-deb',
            config: {},
        },
        {
            name: '@electron-forge/maker-rpm',
            config: {},
        },
        {
            name: '@electron-forge/maker-dmg',
            config: {
                format: 'ULFO'
            }
        }
    ],
    publishers: [
        {
            name: '@curtisgray/wingman',
            config: {
                repository: {
                    owner: 'curtisgray',
                    name: 'wingman'
                },
                prerelease: true
            }
        }
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {},
        },
    ],
    hooks: {
        generateAssets: async (config, buildPath) =>
        {
            // run the next build command
            const { execSync } = require('child_process');
            execSync('npm run build', { cwd: __dirname });
        },
        packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) =>
        {
            var src = path.join(__dirname, '.next');
            var dst = path.join(buildPath, '.next');
            await fs.promises.cp(src, dst, { recursive: true });
        }
    }
};

const path = require("path");
const fs = require("fs").promises;
// const winston = require("winston");

module.exports = {
    packagerConfig: {
        asar: true,
        extraResource: [
            "server/wingman",
            ".next/standalone",
        ],
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {},
        },
        {
            name: "@electron-forge/maker-zip",
            platforms: ["darwin", "win32", "linux"],
        },
        {
            name: "@electron-forge/maker-deb",
            config: {},
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {},
        },
        {
            name: "@electron-forge/maker-dmg",
            config: {
                format: "ULFO",
            },
        },
    ],
    publishers: [
        {
            name: "@curtisgray/wingman",
            config: {
                repository: {
                    owner: "curtisgray",
                    name: "wingman",
                },
                prerelease: true,
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
        // packageAfterCopy: () => {
        //     const logger = winston.createLogger({
        //         level: "silly",
        //         format: winston.format.printf(
        //             ({ level, message, label, timestamp }) => {
        //                 const ts = timestamp
        //                     ? timestamp
        //                     : new Date().toISOString();
        //                 return `[${ts}] [${level}] ${message}`;
        //             }
        //         ),
        //         transports: [
        //             new winston.transports.File({
        //                 filename: "wingman_electron_forge.log",
        //                 level: "silly",
        //             }),
        //         ],
        //     });

        //     logger.log("info", "packageAfterCopy");

        //     const tell = (data) => {
        //         logger.log("info", data);
        //     };

        //     const etell = (data) => {
        //         logger.log("error", data);
        //     };

        //     const directoryExists = async (filePath) => {
        //         try {
        //             await fs.access(filePath);
        //             return true;
        //         } catch (error) {
        //             return false;
        //         }
        //     };

        //     /**
        //      * Asynchronously gets all subdirectories starting with a given prefix.
        //      *
        //      * @param {string} dirPath - The path of the directory to read.
        //      * @param {string} prefix - The prefix to filter subdirectories.
        //      * @returns {Promise<string[]>} A promise that resolves to an array of subdirectory names.
        //      */
        //     const getSubdirectoriesWithPrefix = async (dirPath, prefix) => {
        //         try {
        //             const entries = await fs.readdir(dirPath, {
        //                 withFileTypes: true,
        //             });
        //             const dirs = await Promise.all(
        //                 entries
        //                     .filter(
        //                         (entry) =>
        //                             entry.isDirectory() &&
        //                             entry.name.startsWith(prefix)
        //                     )
        //                     .map((entry) => entry.name)
        //             );
        //             return dirs;
        //         } catch (error) {
        //             console.error("Error reading directory:", error);
        //             throw error; // Rethrow or handle error as needed
        //         }
        //     };

        //     /**
        //      * Asynchronously gets all subdirectories.
        //      *
        //      * @param {string} dirPath - The path of the directory to read.
        //      * @returns {Promise<string[]>} A promise that resolves to an array of subdirectory names.
        //      */
        //     const getSubdirectories = async (dirPath) => {
        //         try {
        //             const entries = await fs.readdir(dirPath, {
        //                 withFileTypes: true,
        //             });
        //             logger.log("debug", "entries", entries);
        //             const dirs = await Promise.all(
        //                 entries
        //                     .filter((entry) => entry.isDirectory())
        //                     .map((entry) => entry.name)
        //             );
        //             logger.log("debug", "dirs", dirs);
        //             return dirs;
        //         } catch (error) {
        //             console.error("Error reading directory:", error);
        //             throw error; // Rethrow or handle error as needed
        //         }
        //     };

        //     const copyPlatformDirectoriesToBuildDir = async (
        //         srcPath,
        //         dstPath
        //     ) => {
        //         // const platforms = ["linux", "macos", "windows"];
        //         const subdirectories = getSubdirectories(srcPath);

        //         // for (const platform of platforms) {
        //         //     const platformDirs = await getSubdirectoriesWithPrefix(
        //         //         srcPath,
        //         //         platform
        //         //     );
        //         //     subdirectories.push(...platformDirs);
        //         // }

        //         logger.log("debug", "subdirectories", subdirectories);
        //         for (const subdirectory of subdirectories) {
        //             const src = path.join(srcPath, subdirectory);
        //             const dst = path.join(dstPath, subdirectory);

        //             logger.log("debug", "src", src);
        //             logger.log("debug", "dst", dst);

        //             // Check if subdirectory exists before attempting to copy
        //             if (await directoryExists(src)) {
        //                 await fs.cp(src, dst, { recursive: true });
        //             }
        //         }
        //         logger.log("info", "packageAfterCopy done");
        //     };

        //     return async (
        //         config,
        //         buildPath,
        //         electronVersion,
        //         platform,
        //         arch
        //     ) => {
        //         // var src = path.join(__dirname, ".next");
        //         // var dst = path.join(buildPath, ".next");
        //         var src = path.join(__dirname, ".next", "static");
        //         var dst = path.join(buildPath, ".next", "standalone", ".next" , "static");
        //         await fs.promises.cp(src, dst, { recursive: true });
        //         // var dirSrc = path.join(__dirname, "server/wingman");
        //         // var dirDst = path.join(buildPath, "server/wingman");
        //         // await copyPlatformDirectoriesToBuildDir(dirSrc, dirDst);
        //     };
        // },
    },
};

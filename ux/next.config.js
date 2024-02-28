const { i18n } = require('./next-i18next.config');

/** @type {import('next').NextConfig} */
const nextConfig = {
    i18n,
    reactStrictMode: true,

    webpack(config, { isServer, dev })
    {
        config.experiments = {
            asyncWebAssembly: true,
            layers: true,
        };

        return config;
    },
    // distDir: 'build',
    output: 'standalone',   // build the standalone version of the app: https://nextjs.org/docs/app/api-reference/next-config-js/output#automatically-copying-traced-files
};

module.exports = nextConfig;

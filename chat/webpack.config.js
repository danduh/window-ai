const {NxAppWebpackPlugin} = require('@nx/webpack/app-plugin');
const {NxReactWebpackPlugin} = require('@nx/react/webpack-plugin');
const {join} = require('path');

module.exports = {
    module: {
        rules: [
            {
                test: /\.md$/,
                use: [
                    {
                        loader: "raw-loader",
                    },
                ],
            },
        ],
    },

    // @modelcontextprotocol/sdk ships .js.map files that reference .ts sources not
    // included in the published package, so source-map-loader can't resolve them.
    // These warnings are harmless — suppress only those (leave other packages' intact).
    ignoreWarnings: [
        (warning) =>
            /Failed to parse source map/.test(warning.message || '') &&
            /@modelcontextprotocol[\\/]sdk/.test(warning.message || ''),
    ],

    output: {
        path: join(__dirname, '../dist/chat'),
    },
    devServer: {
        port: 4300,
        historyApiFallback: {
            index: '/index.html',
            disableDotRule: true,
            htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
        },
    },
    plugins: [
        new NxAppWebpackPlugin({
            tsConfig: './tsconfig.app.json',
            compiler: 'babel',
            main: './src/main.tsx',
            index: './src/index.html',
            // baseHref: process.env.NODE_ENV === 'production' ? '/window-ai/' : '/',
            baseHref: '/',
            assets: ['./src/favicon.ico', './src/assets'],
            styles: ['./src/global.css'],
            outputHashing: process.env['NODE_ENV'] === 'production' ? 'all' : 'none',
            optimization: process.env['NODE_ENV'] === 'production',
        }),
        new NxReactWebpackPlugin({
            // Uncomment this line if you don't want to use SVGR
            // See: https://react-svgr.com/
            // svgr: false
        }),
    ],
};

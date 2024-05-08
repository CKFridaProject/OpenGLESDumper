

import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';


const config: webpack.Configuration = {
    mode: 'development', // or 'production' or 'none'
    entry: {
        app: [
            './src/client.ts',
            'webpack-hot-middleware/client'
        ],
        showDump: './src/showDump.ts',
    },
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: { 
            "querystring": require.resolve("querystring-es3") 
        }
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/'
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'My App',
            chunks: ['app'],
            template: './public/index.html',
            filename: 'index.html' // specify the output file name
        }),
        new HtmlWebpackPlugin({
            title: 'Show dump',
            chunks: ['showDump'],
            template: './public/showDump.html',
            filename: 'showDump.html' // specify the output file name
        }),
        new webpack.HotModuleReplacementPlugin()
    ],

    watch:true,
};



export default config


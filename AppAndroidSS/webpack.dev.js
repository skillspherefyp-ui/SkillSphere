const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './index.web.js',
  output: {
    path: path.resolve(__dirname, 'web-build'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.web.js', '.js', '.jsx', '.json'],
    alias: {
      'react-native$': path.resolve(__dirname, 'react-native-web-compat.js'),
    },
    fallback: {
      process: require.resolve('process/browser'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              'module:metro-react-native-babel-preset',
            ],
            plugins: [
              'react-native-reanimated/plugin',
            ],
          },
        },
      },
      // Transpile specific React Native packages in node_modules for web (dev)
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, 'node_modules/react-native-linear-gradient'),
          path.resolve(__dirname, 'node_modules/react-native-vector-icons'),
          path.resolve(__dirname, 'node_modules/react-native-paper'),
          path.resolve(__dirname, 'node_modules/react-native-reanimated'),
          path.resolve(__dirname, 'node_modules/react-native-gesture-handler'),
          path.resolve(__dirname, 'node_modules/react-native-screens'),
          path.resolve(__dirname, 'node_modules/react-native-safe-area-context'),
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['module:metro-react-native-babel-preset'],
            plugins: ['react-native-reanimated/plugin'],
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'assets/images/',
            },
          },
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'assets/fonts/',
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './web/index.html',
      filename: 'index.html',
      inject: true,
    }),
    // Copy vector icon fonts to web build
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'node_modules/react-native-vector-icons/Fonts'),
          to: path.resolve(__dirname, 'web-build/assets/fonts'),
        },
        {
          from: path.resolve(__dirname, 'web/favicon.png'),
          to: path.resolve(__dirname, 'web-build/favicon.png'),
          noErrorOnMissing: true,
        },
      ],
    }),
    // Provide React Native globals expected by some libraries in dev
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
      DEV: JSON.stringify(true),
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'web-build'),
    },
    compress: true,
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
  },
  devtool: 'eval-source-map',
};





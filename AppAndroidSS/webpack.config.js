const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const appDir = __dirname;
const transpileModules = [
  path.resolve(appDir, 'src'),
  path.resolve(appDir, 'App.js'),
  path.resolve(appDir, 'index.web.js'),
  path.resolve(appDir, '../node_modules/react-native-toast-message'),
  path.resolve(appDir, '../node_modules/react-native-svg'),
  path.resolve(appDir, '../node_modules/@react-native/assets-registry'),
];

module.exports = {
  entry: path.resolve(appDir, 'index.web.js'),
  output: {
    path: path.resolve(appDir, 'web-build'),
    filename: 'static/js/[name].[contenthash:8].js',
    clean: true,
    publicPath: '/',
  },
  resolve: {
    extensions: ['.web.js', '.js', '.json'],
    alias: {
      'react-native$': 'react-native-web',
      'react-native-linear-gradient$': path.resolve(appDir, 'src/shims/LinearGradient.web.js'),
      'react-native-reanimated$': path.resolve(appDir, 'src/shims/Reanimated.web.js'),
      '@react-native-masked-view/masked-view$': path.resolve(appDir, 'src/shims/MaskedView.web.js'),
      'react-native-vector-icons/Ionicons$': path.resolve(appDir, 'src/shims/Ionicons.web.js'),
      'react-native-vector-icons/MaterialCommunityIcons$': path.resolve(appDir, 'src/shims/MaterialCommunityIcons.web.js'),
    },
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        include: transpileModules,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-flow', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'static/media/[name].[hash][ext]',
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(appDir, 'web/index.html'),
      favicon: path.resolve(appDir, 'web/favicon.svg'),
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || ''),
    }),
  ],
  devServer: {
    static: {
      directory: path.resolve(appDir, 'web'),
    },
    historyApiFallback: true,
    port: 3000,
    hot: true,
  },
};

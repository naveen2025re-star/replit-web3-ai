const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    target: 'node',
    mode: isProduction ? 'production' : 'development',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2'
    },
    externals: {
      vscode: 'commonjs vscode'
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: [/node_modules/, /\.test\.ts$/, /test\//, /spec\//],
          use: [
            {
              loader: 'ts-loader',
              options: {
                compilerOptions: {
                  sourceMap: !isProduction
                }
              }
            }
          ]
        }
      ]
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            keep_fnames: true,
            mangle: false,
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction
            }
          }
        })
      ]
    },
    devtool: isProduction ? false : 'inline-source-map',
    stats: {
      warnings: false
    }
  };
};
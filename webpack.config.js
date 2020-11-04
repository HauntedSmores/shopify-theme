const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    theme: './src/scripts/theme.js',
    another: './src/scripts/templates/collection.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
 optimization: {
   splitChunks: {
     chunks: 'all',
   },
 },
};
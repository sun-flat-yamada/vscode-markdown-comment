const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: "production",
  entry: {
    "preview/preview": [
      "./src/views/preview/preview.ts",
      "./src/views/preview/preview.scss",
    ],
    "comments-table/table": [
      "./src/views/comments-table/table.ts",
      "./src/views/comments-table/table.scss",
    ],
  },
  output: {
    path: path.resolve(__dirname, "dist/views"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".ts", ".js", ".scss", ".css"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        options: {
          configFile: path.resolve(__dirname, "tsconfig.views.json"),
          transpileOnly: true,
        },
        exclude: /node_modules/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "src/views",
          to: ".", // Copy to dist/views root
          globOptions: {
            ignore: ["**/*.ts", "**/*.scss"], // Don't copy source files (processed or bundled)
          },
        },
      ],
    }),
  ],
};

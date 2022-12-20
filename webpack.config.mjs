import CopyPlugin from "copy-webpack-plugin";
import webpack from "webpack";

const config = {
  mode: "production",
  entry: {
    index: "./src/index.tsx",
    serviceWorker: "./src/serviceWorker.ts",
  },
  experiments: {
    outputModule: true,
    topLevelAwait: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
  output: {
    library: {
      type: "module",
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "resources" }],
    }),
    new webpack.DefinePlugin({
      TIMESTAMP: Date.now(),
    }),
  ],
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
};

export default config;

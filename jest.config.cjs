module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    // .js拡張子で終わるインポートを解決するための設定 (ESM対応)
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};

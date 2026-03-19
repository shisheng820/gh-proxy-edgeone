export default {
  name: 'gh-proxy-edgeone',
  build: {
    entry: 'functions/_worker.js',
    output: 'dist',
    framework: 'node',
  },
  middleware: './functions/_middleware.js',
  env: {},
}

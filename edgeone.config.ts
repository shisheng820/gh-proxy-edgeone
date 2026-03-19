import { defineConfig } from '@edgeone/pages/config'

export default defineConfig({
  name: 'gh-proxy-edgeone',
  build: {
    entry: 'functions/_worker.js',
    output: 'dist',
    framework: 'node',
  },
  middleware: './functions/_middleware.js',
  env: {
    // Add runtime env vars in EdgeOne console if needed.
  },
})
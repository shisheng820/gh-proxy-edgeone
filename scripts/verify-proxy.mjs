import assert from 'node:assert/strict'

import {
  extractProxyTarget,
  handleProxyRequest,
  loadRuntimeConfig,
  shouldProxyRequest,
} from '../src/proxy/core.js'

const runtimeConfig = loadRuntimeConfig({})

assert.equal(
  extractProxyTarget(
    'https://ghproxy.test/https://raw.githubusercontent.com/shisheng820/gh-proxy-edgeone/refs/heads/main/README.md',
    runtimeConfig.prefix
  ),
  'https://raw.githubusercontent.com/shisheng820/gh-proxy-edgeone/refs/heads/main/README.md'
)

assert.equal(
  extractProxyTarget(
    'https://ghproxy.test//https://raw.githubusercontent.com/shisheng820/gh-proxy-edgeone/refs/heads/main/README.md',
    runtimeConfig.prefix
  ),
  'https://raw.githubusercontent.com/shisheng820/gh-proxy-edgeone/refs/heads/main/README.md'
)

assert.equal(
  shouldProxyRequest(
    new Request(
      'https://ghproxy.test/https://raw.githubusercontent.com/shisheng820/gh-proxy-edgeone/refs/heads/main/README.md'
    ),
    runtimeConfig
  ),
  true
)

assert.equal(shouldProxyRequest(new Request('https://ghproxy.test/'), runtimeConfig), false)
assert.equal(shouldProxyRequest(new Request('https://ghproxy.test/api/health'), runtimeConfig), false)

const originalFetch = globalThis.fetch

globalThis.fetch = async input => {
  const url = typeof input === 'string' ? input : input.url
  return new Response('ok', {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-target-url': url,
    },
  })
}

try {
  const proxiedResponse = await handleProxyRequest(
    new Request(
      'https://ghproxy.test/https://raw.githubusercontent.com/shisheng820/gh-proxy-edgeone/refs/heads/main/README.md'
    ),
    runtimeConfig
  )

  assert.equal(proxiedResponse.status, 200)
  assert.equal(
    proxiedResponse.headers.get('x-target-url'),
    'https://raw.githubusercontent.com/shisheng820/gh-proxy-edgeone/refs/heads/main/README.md'
  )

  const redirectResponse = await handleProxyRequest(
    new Request(
      'https://ghproxy.test/?q=https://raw.githubusercontent.com/shisheng820/gh-proxy-edgeone/refs/heads/main/README.md'
    ),
    runtimeConfig
  )

  assert.equal(redirectResponse.status, 301)
  assert.equal(
    redirectResponse.headers.get('location'),
    'https://ghproxy.test/https://raw.githubusercontent.com/shisheng820/gh-proxy-edgeone/refs/heads/main/README.md'
  )
} finally {
  globalThis.fetch = originalFetch
}

console.log('Proxy checks passed.')

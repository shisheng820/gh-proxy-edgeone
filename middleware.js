import {
  handleAssetFallback,
  handleProxyRequest,
  loadRuntimeConfig,
  shouldAttemptAssetFallback,
  shouldProxyRequest,
  withPoweredByHeader,
} from './src/proxy/core.js'

export async function middleware(context) {
  const runtimeConfig = loadRuntimeConfig(context?.env)

  if (shouldProxyRequest(context.request, runtimeConfig)) {
    try {
      const response = await handleProxyRequest(context.request, runtimeConfig)
      return withPoweredByHeader(response)
    } catch (error) {
      return new Response('edgeone proxy error:\n' + (error?.stack || String(error)), {
        status: 502,
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'text/plain; charset=utf-8',
          'x-powered-by': 'edgeone-pages',
        },
      })
    }
  }

  const response = await context.next()

  if (shouldAttemptAssetFallback(context.request, response)) {
    try {
      const fallbackResponse = await handleAssetFallback(context.request, runtimeConfig)
      if (fallbackResponse) {
        return fallbackResponse
      }
    } catch {
      // Keep the original static 404 when upstream asset fallback is unavailable.
    }
  }

  return withPoweredByHeader(response)
}

// Force middleware to run for literal proxy paths such as `/https://...`.
// On EdgeOne Git deployments these paths can otherwise fall through to the
// static asset layer before our proxy logic gets a chance to inspect them.
export const config = {
  matcher: ['^/.*$'],
}

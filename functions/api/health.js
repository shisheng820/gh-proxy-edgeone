import { loadRuntimeConfig, withPoweredByHeader } from '../../src/proxy/core.js'

export async function onRequestGet(context) {
  const runtimeConfig = loadRuntimeConfig(context?.env)

  return withPoweredByHeader(
    new Response(
      JSON.stringify(
        {
          ok: true,
          service: 'gh-proxy-edgeone',
          runtime: 'edgeone-pages',
          timestamp: new Date().toISOString(),
          config: {
            prefix: runtimeConfig.prefix,
            jsdelivr: Boolean(runtimeConfig.jsdelivr),
            whiteListSize: runtimeConfig.whiteList.length,
            maxRedirectHops: runtimeConfig.maxRedirectHops,
            assetUrl: runtimeConfig.assetUrl,
          },
        },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          'cache-control': 'no-store',
          'content-type': 'application/json; charset=utf-8',
        },
      }
    )
  )
}

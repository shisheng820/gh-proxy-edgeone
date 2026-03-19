'use strict'

const DEFAULT_ASSET_URL = 'https://hunshcn.github.io/gh-proxy/'
const DEFAULT_PREFIX = '/'
const DEFAULT_JSDELIVR = 0
const DEFAULT_WHITE_LIST = []
const DEFAULT_MAX_REDIRECT_HOPS = 8

const PREFLIGHT_INIT = {
  status: 204,
  headers: new Headers({
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
    'access-control-max-age': '1728000',
  }),
}

const exp1 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:releases|archive)\/.*$/i
const exp2 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:blob|raw)\/.*$/i
const exp3 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:info|git-).*$/i
const exp4 = /^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+?\/.+$/i
const exp5 = /^(?:https?:\/\/)?gist\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+$/i
const exp6 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/tags.*$/i

const proxyMatchers = [exp1, exp2, exp3, exp4, exp5, exp6]

function normalizePrefix(prefix) {
  let normalized = (prefix || DEFAULT_PREFIX).trim()
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized
  }
  if (!normalized.endsWith('/')) {
    normalized += '/'
  }
  return normalized
}

function normalizeAssetUrl(assetUrl) {
  const normalized = String(assetUrl || DEFAULT_ASSET_URL).trim()
  return normalized.endsWith('/') ? normalized : normalized + '/'
}

function parseBooleanFlag(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function parseIntInRange(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (Number.isNaN(parsed)) {
    return fallback
  }
  return Math.max(min, Math.min(max, parsed))
}

function parseWhiteList(value) {
  if (!value) {
    return [...DEFAULT_WHITE_LIST]
  }
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function decodeMaybe(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeTarget(value) {
  const decoded = decodeMaybe(String(value || '').trim()).replace(/^\/+/, '')
  return decoded.replace(/^http:\/+/i, 'http://').replace(/^https:\/+/i, 'https://')
}

function ensureAbsoluteUrl(value) {
  if (/^https?:\/\//i.test(value)) {
    return value
  }
  return 'https://' + value
}

function isSupportedTarget(value) {
  const target = normalizeTarget(value)
  return proxyMatchers.some(pattern => pattern.test(target))
}

function shouldBypassPath(pathname) {
  return pathname === '/' || pathname.startsWith('/api/')
}

function extractPathTarget(url, prefix) {
  const remainder = url.href.slice(url.origin.length)
  if (!remainder.startsWith(prefix)) {
    return null
  }
  return normalizeTarget(remainder.slice(prefix.length))
}

function joinPrefix(origin, prefix, target) {
  return origin + prefix + normalizeTarget(target)
}

function rewriteBlobToRaw(value) {
  return value.replace('/blob/', '/raw/')
}

function rewriteBlobToJsdelivr(value) {
  return value.replace('/blob/', '@').replace(/^(?:https?:\/\/)?github\.com/i, 'https://cdn.jsdelivr.net/gh')
}

function rewriteRawToJsdelivr(value) {
  return value
    .replace(/(?<=com\/.+?\/.+?)\/(.+?\/)/i, '@$1')
    .replace(/^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com/i, 'https://cdn.jsdelivr.net/gh')
}

function resolveProxyTarget(rawTarget, runtimeConfig) {
  const target = normalizeTarget(rawTarget)

  if (exp1.test(target) || exp3.test(target) || exp5.test(target) || exp6.test(target)) {
    return { type: 'proxy', url: ensureAbsoluteUrl(target) }
  }

  if (exp2.test(target)) {
    if (runtimeConfig.jsdelivr) {
      return { type: 'redirect', location: rewriteBlobToJsdelivr(target) }
    }
    return { type: 'proxy', url: ensureAbsoluteUrl(rewriteBlobToRaw(target)) }
  }

  if (exp4.test(target)) {
    if (runtimeConfig.jsdelivr) {
      return { type: 'redirect', location: rewriteRawToJsdelivr(target) }
    }
    return { type: 'proxy', url: ensureAbsoluteUrl(target) }
  }

  return null
}

function isAllowedByWhiteList(target, whiteList) {
  if (!whiteList.length) {
    return true
  }
  return whiteList.some(item => target.includes(item))
}

function sanitizeProxyHeaders(headers) {
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-expose-headers', '*')
  headers.set('x-powered-by', 'edgeone-pages')
  headers.delete('content-security-policy')
  headers.delete('content-security-policy-report-only')
  headers.delete('clear-site-data')
  return headers
}

export function loadRuntimeConfig(env = {}) {
  return {
    assetUrl: normalizeAssetUrl(env.GH_PROXY_ASSET_URL || DEFAULT_ASSET_URL),
    prefix: normalizePrefix(env.GH_PROXY_PREFIX || DEFAULT_PREFIX),
    jsdelivr: parseBooleanFlag(env.GH_PROXY_JSDELIVR ?? DEFAULT_JSDELIVR) ? 1 : 0,
    whiteList: parseWhiteList(env.GH_PROXY_WHITELIST),
    maxRedirectHops: parseIntInRange(env.GH_PROXY_MAX_REDIRECT_HOPS, DEFAULT_MAX_REDIRECT_HOPS, 1, 20),
  }
}

export function extractProxyTarget(requestUrl, prefix = DEFAULT_PREFIX) {
  const url = new URL(requestUrl)
  const q = url.searchParams.get('q')
  if (q) {
    return normalizeTarget(q)
  }
  return extractPathTarget(url, normalizePrefix(prefix))
}

export function shouldProxyRequest(request, runtimeConfig) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')

  if (!q && shouldBypassPath(url.pathname)) {
    return false
  }

  const target = extractProxyTarget(request.url, runtimeConfig.prefix)
  return Boolean(target) && isSupportedTarget(target)
}

export function shouldAttemptAssetFallback(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return false
  }

  const url = new URL(request.url)
  return response.status === 404 && !url.pathname.startsWith('/api/')
}

export function withPoweredByHeader(response) {
  const headers = new Headers(response.headers)
  headers.set('x-powered-by', 'edgeone-pages')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export async function handleAssetFallback(request, runtimeConfig) {
  const url = new URL(request.url)
  const assetPath = url.pathname.replace(/^\//, '') + url.search
  const assetUrl = runtimeConfig.assetUrl + assetPath
  const response = await fetch(assetUrl, {
    method: request.method,
    headers: request.headers,
    redirect: 'follow',
  })

  if (!response.ok) {
    return null
  }

  return withPoweredByHeader(
    new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    })
  )
}

function makePlainTextResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'access-control-allow-origin': '*',
      'content-type': 'text/plain; charset=utf-8',
      'x-powered-by': 'edgeone-pages',
    },
  })
}

async function proxy(urlObj, reqInit, runtimeConfig, redirectCount = 0) {
  if (redirectCount > runtimeConfig.maxRedirectHops) {
    return makePlainTextResponse('too many redirects', 508)
  }

  const response = await fetch(urlObj.href, reqInit)
  const headers = sanitizeProxyHeaders(new Headers(response.headers))

  if (headers.has('location')) {
    const rawLocation = headers.get('location') || ''
    const absoluteLocation = new URL(rawLocation, urlObj.href).href

    if (isSupportedTarget(rawLocation) || isSupportedTarget(absoluteLocation)) {
      const target = isSupportedTarget(rawLocation) ? rawLocation : absoluteLocation
      headers.set('location', runtimeConfig.prefix + normalizeTarget(target))
    } else {
      return proxy(new URL(absoluteLocation), reqInit, runtimeConfig, redirectCount + 1)
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export async function handleProxyRequest(request, runtimeConfig) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')

  if (q) {
    return withPoweredByHeader(Response.redirect(joinPrefix(url.origin, runtimeConfig.prefix, q), 301))
  }

  const target = extractProxyTarget(request.url, runtimeConfig.prefix)
  if (!target) {
    return makePlainTextResponse('missing target', 400)
  }

  if (!isAllowedByWhiteList(target, runtimeConfig.whiteList)) {
    return makePlainTextResponse('blocked', 403)
  }

  if (request.method === 'OPTIONS' && request.headers.has('access-control-request-headers')) {
    return new Response(null, PREFLIGHT_INIT)
  }

  const resolvedTarget = resolveProxyTarget(target, runtimeConfig)
  if (!resolvedTarget) {
    return makePlainTextResponse('unsupported proxy target', 400)
  }

  if (resolvedTarget.type === 'redirect') {
    return withPoweredByHeader(Response.redirect(resolvedTarget.location, 302))
  }

  const headers = new Headers(request.headers)
  headers.delete('host')

  const reqInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    reqInit.body = request.body
  }

  return proxy(new URL(resolvedTarget.url), reqInit, runtimeConfig, 0)
}

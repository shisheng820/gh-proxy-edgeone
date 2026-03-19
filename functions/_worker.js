'use strict'

/**
 * Default runtime settings. You can override these via context.env:
 * - GH_PROXY_ASSET_URL
 * - GH_PROXY_PREFIX
 * - GH_PROXY_JSDELIVR (1/0, true/false)
 * - GH_PROXY_WHITELIST (comma-separated)
 * - GH_PROXY_MAX_REDIRECT_HOPS
 */
const DEFAULT_ASSET_URL = 'https://hunshcn.github.io/gh-proxy/'
const DEFAULT_PREFIX = '/'
const DEFAULT_JSDELIVR = 0
const DEFAULT_WHITE_LIST = []
const DEFAULT_MAX_REDIRECT_HOPS = 8

/** @type {ResponseInit} */
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

/**
 * @param {any} body
 * @param {number} status
 * @param {Object<string, string>} headers
 */
function makeRes(body, status = 200, headers = {}) {
    headers['access-control-allow-origin'] = '*'
    return new Response(body, { status, headers })
}

/**
 * @param {string} urlStr
 */
function newUrl(urlStr) {
    try {
        return new URL(urlStr)
    } catch (err) {
        return null
    }
}

/**
 * @param {string} prefix
 */
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

/**
 * @param {string} url
 */
function normalizeAssetUrl(url) {
    const raw = (url || DEFAULT_ASSET_URL).trim()
    return raw.endsWith('/') ? raw : raw + '/'
}

/**
 * @param {unknown} value
 */
function parseBooleanFlag(value) {
    const normalized = String(value ?? '').trim().toLowerCase()
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 */
function parseIntInRange(value, fallback, min, max) {
    const parsed = Number.parseInt(String(value ?? ''), 10)
    if (Number.isNaN(parsed)) {
        return fallback
    }
    return Math.max(min, Math.min(max, parsed))
}

/**
 * @param {unknown} value
 */
function parseWhiteList(value) {
    if (!value) {
        return [...DEFAULT_WHITE_LIST]
    }
    return String(value)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
}

/**
 * @param {Record<string, string | undefined>} [env]
 */
function loadRuntimeConfig(env = {}) {
    return {
        assetUrl: normalizeAssetUrl(env.GH_PROXY_ASSET_URL || DEFAULT_ASSET_URL),
        prefix: normalizePrefix(env.GH_PROXY_PREFIX || DEFAULT_PREFIX),
        jsdelivr: parseBooleanFlag(env.GH_PROXY_JSDELIVR ?? DEFAULT_JSDELIVR) ? 1 : 0,
        whiteList: parseWhiteList(env.GH_PROXY_WHITELIST),
        maxRedirectHops: parseIntInRange(env.GH_PROXY_MAX_REDIRECT_HOPS, DEFAULT_MAX_REDIRECT_HOPS, 1, 20),
    }
}

/**
 * EdgeOne Pages function entry.
 * @param {Request} request
 * @param {{ env?: Record<string, string>, waitUntil?: (promise: Promise<unknown>) => void }} context
 */
export default async function handler(request, context) {
    const runtimeConfig = loadRuntimeConfig(context?.env)
    try {
        return await fetchHandler(request, runtimeConfig)
    } catch (err) {
        return makeRes('edgeone function error:\n' + (err?.stack || String(err)), 502)
    }
}

/**
 * @param {string} u
 */
function checkUrl(u) {
    for (let i of [exp1, exp2, exp3, exp4, exp5, exp6]) {
        if (u.search(i) === 0) {
            return true
        }
    }
    return false
}

/**
 * @param {Request} req
 * @param {{ assetUrl: string, prefix: string, jsdelivr: number, whiteList: string[], maxRedirectHops: number }} runtimeConfig
 */
async function fetchHandler(req, runtimeConfig) {
    const urlObj = new URL(req.url)
    let path = urlObj.searchParams.get('q')
    if (path) {
        return Response.redirect('https://' + urlObj.host + runtimeConfig.prefix + path, 301)
    }

    // 部分边缘运行时可能会把路径中的 `//` 合并成 `/`
    path = urlObj.href
        .slice(urlObj.origin.length + runtimeConfig.prefix.length)
        .replace(/^https?:\/+/, 'https://')

    if (path.search(exp1) === 0 || path.search(exp5) === 0 || path.search(exp6) === 0 || path.search(exp3) === 0) {
        return httpHandler(req, path, runtimeConfig)
    }

    if (path.search(exp2) === 0) {
        if (runtimeConfig.jsdelivr) {
            const newUrl = path
                .replace('/blob/', '@')
                .replace(/^(?:https?:\/\/)?github\.com/, 'https://cdn.jsdelivr.net/gh')
            return Response.redirect(newUrl, 302)
        }
        path = path.replace('/blob/', '/raw/')
        return httpHandler(req, path, runtimeConfig)
    }

    if (path.search(exp4) === 0) {
        if (runtimeConfig.jsdelivr) {
            const newUrl = path
                .replace(/(?<=com\/.+?\/.+?)\/(.+?\/)/, '@$1')
                .replace(/^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com/, 'https://cdn.jsdelivr.net/gh')
            return Response.redirect(newUrl, 302)
        }
        return httpHandler(req, path, runtimeConfig)
    }

    return fetch(runtimeConfig.assetUrl + path)
}

/**
 * @param {Request} req
 * @param {string} pathname
 * @param {{ assetUrl: string, prefix: string, jsdelivr: number, whiteList: string[], maxRedirectHops: number }} runtimeConfig
 */
function httpHandler(req, pathname, runtimeConfig) {
    const reqHdrRaw = req.headers

    // preflight
    if (req.method === 'OPTIONS' && reqHdrRaw.has('access-control-request-headers')) {
        return new Response(null, PREFLIGHT_INIT)
    }

    const reqHdrNew = new Headers(reqHdrRaw)

    let urlStr = pathname
    let allowed = !Boolean(runtimeConfig.whiteList.length)
    for (let i of runtimeConfig.whiteList) {
        if (urlStr.includes(i)) {
            allowed = true
            break
        }
    }
    if (!allowed) {
        return new Response('blocked', { status: 403 })
    }

    if (urlStr.search(/^https?:\/\//) !== 0) {
        urlStr = 'https://' + urlStr
    }
    const urlObj = newUrl(urlStr)
    if (!urlObj) {
        return makeRes('invalid target url', 400)
    }

    /** @type {RequestInit} */
    const reqInit = {
        method: req.method,
        headers: reqHdrNew,
        redirect: 'manual',
        body: req.body,
    }
    return proxy(urlObj, reqInit, runtimeConfig, 0)
}

/**
 * @param {URL} urlObj
 * @param {RequestInit} reqInit
 * @param {{ assetUrl: string, prefix: string, jsdelivr: number, whiteList: string[], maxRedirectHops: number }} runtimeConfig
 * @param {number} redirectCount
 */
async function proxy(urlObj, reqInit, runtimeConfig, redirectCount) {
    if (redirectCount > runtimeConfig.maxRedirectHops) {
        return makeRes('too many redirects', 508)
    }

    const res = await fetch(urlObj.href, reqInit)
    const resHdrNew = new Headers(res.headers)
    const status = res.status

    if (resHdrNew.has('location')) {
        const location = resHdrNew.get('location') || ''
        if (checkUrl(location)) {
            resHdrNew.set('location', runtimeConfig.prefix + location)
        } else {
            const nextUrl = newUrl(location) || newUrl(new URL(location, urlObj.href).href)
            if (!nextUrl) {
                return makeRes('invalid redirect location', 502)
            }
            return proxy(nextUrl, reqInit, runtimeConfig, redirectCount + 1)
        }
    }

    resHdrNew.set('access-control-expose-headers', '*')
    resHdrNew.set('access-control-allow-origin', '*')

    resHdrNew.delete('content-security-policy')
    resHdrNew.delete('content-security-policy-report-only')
    resHdrNew.delete('clear-site-data')

    return new Response(res.body, {
        status,
        headers: resHdrNew,
    })
}
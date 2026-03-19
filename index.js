'use strict'

/**
 * Static files (404.html, sw.js, conf.js).
 */
const ASSET_URL = 'https://hunshcn.github.io/gh-proxy/'

// If the custom route is example.com/gh/*, set PREFIX to '/gh/'.
const PREFIX = '/'

// Toggle jsDelivr for branch files. 0 = off.
const config = {
    jsdelivr: 0
}

// Requests must include one of these substrings when the list is not empty.
const whiteList = []

/** @type {ResponseInit} */
const PREFLIGHT_INIT = {
    status: 204,
    headers: new Headers({
        'access-control-allow-origin': '*' ,
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
        'access-control-max-age': '1728000'
    })
}

const exp1 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:releases|archive)\/.*$/i
const exp2 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:blob|raw)\/.*$/i
const exp3 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:info|git-).*$/i
const exp4 = /^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+?\/.+$/i
const exp5 = /^(?:https?:\/\/)?gist\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+$/i
const exp6 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/tags.*$/i

/**
 * @param {unknown} body
 * @param {number} status
 * @param {Record<string, string>} headers
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
    } catch {
        return null
    }
}

/**
 * @param {string | null} urlStr
 */
function checkUrl(urlStr) {
    if (!urlStr) {
        return false
    }

    for (const expression of [exp1, exp2, exp3, exp4, exp5, exp6]) {
        if (urlStr.search(expression) === 0) {
            return true
        }
    }

    return false
}

/**
 * EdgeOne Pages entry point.
 *
 * @param {{ request: Request }} context
 */
export async function onRequest(context) {
    try {
        return await fetchHandler(context.request)
    } catch (err) {
        const message = err instanceof Error ? err.stack || err.message : String(err)
        return makeRes('edgeone pages error:\n' + message, 502)
    }
}

/**
 * @param {Request} req
 */
async function fetchHandler(req) {
    const urlStr = req.url
    const urlObj = new URL(urlStr)
    let path = urlObj.searchParams.get('q')

    if (path) {
        return Response.redirect('https://' + urlObj.host + PREFIX + path, 301)
    }

    // The original worker expected the incoming URL path to contain a full upstream URL.
    path = urlObj.href.slice(urlObj.origin.length + PREFIX.length).replace(/^https?:\/+/,'https://')

    if (path.search(exp1) === 0 || path.search(exp5) === 0 || path.search(exp6) === 0 || path.search(exp3) === 0) {
        return httpHandler(req, path)
    }

    if (path.search(exp2) === 0) {
        if (config.jsdelivr) {
            const newLocation = path.replace('/blob/', '@').replace(/^(?:https?:\/\/)?github\.com/, 'https://cdn.jsdelivr.net/gh')
            return Response.redirect(newLocation, 302)
        }

        path = path.replace('/blob/', '/raw/')
        return httpHandler(req, path)
    }

    if (path.search(exp4) === 0) {
        if (config.jsdelivr) {
            const newLocation = path
                .replace(/(?<=com\/.+?\/.+?)\/(.+?\/)/, '@$1')
                .replace(/^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com/, 'https://cdn.jsdelivr.net/gh')
            return Response.redirect(newLocation, 302)
        }

        return httpHandler(req, path)
    }

    return fetch(ASSET_URL + path)
}

/**
 * @param {Request} req
 * @param {string} pathname
 */
function httpHandler(req, pathname) {
    const reqHdrRaw = req.headers

    // preflight
    if (req.method === 'OPTIONS' && reqHdrRaw.has('access-control-request-headers')) {
        return new Response(null, PREFLIGHT_INIT)
    }

    const reqHdrNew = new Headers(reqHdrRaw)

    let urlStr = pathname
    let flag = !Boolean(whiteList.length)

    for (const value of whiteList) {
        if (urlStr.includes(value)) {
            flag = true
            break
        }
    }

    if (!flag) {
        return new Response('blocked', { status: 403 })
    }

    if (urlStr.search(/^https?:\/\//) !== 0) {
        urlStr = 'https://' + urlStr
    }

    const urlObj = newUrl(urlStr)

    if (!urlObj) {
        return makeRes('invalid upstream url', 400)
    }

    /** @type {RequestInit} */
    const reqInit = {
        method: req.method,
        headers: reqHdrNew,
        redirect: 'manual',
        body: req.body
    }

    return proxy(urlObj, reqInit)
}

/**
 * @param {URL} urlObj
 * @param {RequestInit} reqInit
 */
async function proxy(urlObj, reqInit) {
    const res = await fetch(urlObj.href, reqInit)
    const resHdrNew = new Headers(res.headers)
    const status = res.status

    if (resHdrNew.has('location')) {
        const location = resHdrNew.get('location')

        if (checkUrl(location)) {
            resHdrNew.set('location', PREFIX + location)
        } else if (location) {
            reqInit.redirect = 'follow'
            const nextUrl = new URL(location, urlObj)
            return proxy(nextUrl, reqInit)
        }
    }

    resHdrNew.set('access-control-expose-headers', '*')
    resHdrNew.set('access-control-allow-origin', '*')

    resHdrNew.delete('content-security-policy')
    resHdrNew.delete('content-security-policy-report-only')
    resHdrNew.delete('clear-site-data')

    return new Response(res.body, {
        status,
        headers: resHdrNew
    })
}

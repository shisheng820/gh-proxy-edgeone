export async function onRequestGet() {
  return Response.json({
    ok: true,
    service: 'gh-proxy-edgeone',
    runtime: 'edgeone-pages',
    timestamp: new Date().toISOString(),
  })
}

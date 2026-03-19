export default async function handler() {
  return Response.json({
    ok: true,
    service: 'gh-proxy-edgeone',
    runtime: 'edgeone-pages',
    timestamp: new Date().toISOString(),
  })
}
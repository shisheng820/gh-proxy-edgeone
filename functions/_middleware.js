export async function onRequest(context) {
  const response = await context.next()
  const nextResponse = new Response(response.body, response)
  nextResponse.headers.set('x-powered-by', 'edgeone-pages')
  return nextResponse
}

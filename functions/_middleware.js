export default async function middleware(request, context) {
  const response = await context.next()
  response.headers.set('x-powered-by', 'edgeone-pages')
  return response
}
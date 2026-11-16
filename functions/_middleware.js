export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  if (pathname.startsWith('/api/')) {
    return context.next();
  }
  return new Response('Not found', { status: 404 });
}



export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (path !== '/__nuxt_error' && path !== '/__nuxt_error/') return

  
  if (getRequestHeader(event, 'x-nuxt-error')) return

  
  setResponseStatus(event, 404)
  setResponseHeader(event, 'X-Robots-Tag', 'noindex')
  return '404 - Not Found'
})

export function browseSearch(search: Record<string, unknown>): { page?: number } {
  if (search.page === undefined) return {}
  const page = String(search.page)
  return { page: /^[1-9]\d{0,5}$/.test(page) ? Number(page) : 0 }
}
export function browseHref(path: string, page: number) {
  return page === 1 ? path : `${path}?page=${page}`
}

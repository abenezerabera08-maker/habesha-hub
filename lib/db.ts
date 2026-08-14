export type DbResult<T> = { ok: true; data: T } | { ok: false; error: string }

export function fail(message: string): { ok: false; error: string } {
  return { ok: false, error: message }
}

type QueryResult<T> = {
  data: T | T[] | null
  error: { message: string } | null
}

export async function expectRow<T>(
  result: QueryResult<T>,
  label: string
): Promise<DbResult<T>> {
  if (result.error) return fail(`${label}: ${result.error.message}`)
  const row = Array.isArray(result.data) ? result.data[0] : result.data
  if (!row) {
    return fail(`${label}: the change did not take effect — you may not have permission, or the row no longer matches.`)
  }
  return { ok: true, data: row }
}

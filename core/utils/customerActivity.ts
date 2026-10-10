

export interface CustomerActivity {
  code: string
  label: string
}

export function labelForActivityCode(
  code: string | null | undefined,
  activites: readonly CustomerActivity[],
): string | null {
  if (!code) return null
  return activites.find(a => a.code === code)?.label ?? null
}

export function isValidActivityCode(
  code: string | null | undefined,
  activites: readonly CustomerActivity[],
): boolean {
  if (!code) return false
  return activites.some(a => a.code === code)
}

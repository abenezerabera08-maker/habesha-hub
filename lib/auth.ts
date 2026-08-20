type Navigate = (href: string) => void

export function requireRole(
  requiredRole: string,
  currentRole: string | null,
  loading: boolean,
  navigate: Navigate,
): void {
  if (loading) return
  if (currentRole !== requiredRole) {
    navigate('/')
  }
}

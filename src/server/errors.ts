export class ServiceError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new ServiceError(503, `Service unavailable: ${name} is not configured.`)
  return value
}

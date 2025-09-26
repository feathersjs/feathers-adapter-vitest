import type { Service } from '@feathersjs/feathers'

/**
 * Helper to run a callback with given service options and restore the original ones
 * afterwards.
 */
export const withOptions = (
  service: Service,
  options: Record<string, any>,
  callback: () => Promise<void>,
) => {
  const originalOptions = service.options
  service.options = {
    ...service.options,
    ...options,
  }
  return Promise.resolve(callback()).finally(() => {
    service.options = originalOptions
  })
}

import type { PublicLinkOriginOptions } from '@mdt/domain-contracts'
import { createOriginPolicy } from './originPolicy.js'

interface PublicLinkOriginInput {
  allowedOrigins: Iterable<string>
  currentOrigin?: string
  publicOrigin?: string
  selectedOrigin?: string
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export function resolvePublicLinkOriginOptions(input: PublicLinkOriginInput): PublicLinkOriginOptions {
  const originPolicy = createOriginPolicy(input.allowedOrigins)
  const currentOrigin = input.currentOrigin ? trimTrailingSlash(input.currentOrigin) : undefined
  const currentOriginAllowed = Boolean(currentOrigin && originPolicy.isAllowedOrigin(currentOrigin))
  const publicOrigin = input.publicOrigin ? trimTrailingSlash(input.publicOrigin.trim()) : undefined

  const selectedOrigin = input.selectedOrigin ? trimTrailingSlash(input.selectedOrigin) : undefined

  if (publicOrigin) {
    return {
      options: [publicOrigin],
      selectedOrigin: selectedOrigin === publicOrigin ? selectedOrigin : publicOrigin,
    }
  }

  if (selectedOrigin && currentOriginAllowed && selectedOrigin === currentOrigin) {
    return {
      options: [selectedOrigin],
      selectedOrigin,
    }
  }

  if (currentOriginAllowed && currentOrigin) {
    return {
      options: [currentOrigin],
      selectedOrigin: currentOrigin,
    }
  }

  return {
    options: [],
    notice: 'No allowed public origin is available for generated links.',
  }
}

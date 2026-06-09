import sanitizeHtml from 'sanitize-html'

import type { UsersAPI } from '@/entities/user/types/users.types'

const PLAIN_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
}

const DANGEROUS_MARKUP_RE = /[<>]|javascript:|data:text\/html|on\w+\s*=|\0/u

export const PROFILE_NAME_MAX_LENGTH = 256
export const PROFILE_BIO_MAX_LENGTH = 300

export function containsDangerousMarkup(value: string): boolean {
  return DANGEROUS_MARKUP_RE.test(value)
}

export function sanitizePlainText(value: string, allowNewlines = false): string {
  const result = sanitizeHtml(value, PLAIN_TEXT_OPTIONS).replace(/\0/g, '')

  if (allowNewlines) {
    return result.trim()
  }

  return result.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export type ProfileNameIssue = 'required' | 'invalidCharacters' | 'tooLong'

export function validateProfileName(value: string): ProfileNameIssue | null {
  return null
  const trimmed = value.trim()
  if (!trimmed) {
    return 'required'
  }
  return validateOptionalProfileName(value)
}

export function validateOptionalProfileName(value: string): ProfileNameIssue | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  if (containsDangerousMarkup(trimmed)) {
    return 'invalidCharacters'
  }
  if (trimmed.length > PROFILE_NAME_MAX_LENGTH) {
    return 'tooLong'
  }
  return null
}

export type ProfileBioIssue = 'invalidCharacters' | 'tooLong'

export function validateProfileBio(value: string): ProfileBioIssue | null {
  if (containsDangerousMarkup(value)) {
    return 'invalidCharacters'
  }
  if (value.length > PROFILE_BIO_MAX_LENGTH) {
    return 'tooLong'
  }
  return null
}

export function sanitizeProfileDetailsBody(
  data: UsersAPI.UserDetails.PatchMe.Body,
): UsersAPI.UserDetails.PatchMe.Body {
  const next: UsersAPI.UserDetails.PatchMe.Body = { ...data }

  if (typeof next.bio === 'string') {
    next.bio = sanitizePlainText(next.bio, true) || null
  }

  if (Array.isArray(next.languages)) {
    next.languages = next.languages
      .map((language) => sanitizePlainText(language))
      .filter(Boolean)
  }

  return next
}

import {
  PROFILE_NAME_MAX_LENGTH,
  type ProfileNameIssue,
} from '@/shared/lib/sanitize-plain-text'

type ProfileTranslator = (
  key: 'firstNameRequired' | 'invalidCharacters' | 'nameTooLong',
  values?: { max: number },
) => string

export function resolveProfileNameErrorMessage(
  tp: ProfileTranslator,
  issue: ProfileNameIssue | null,
): string | null {
  if (!issue) return null
  if (issue === 'required') return tp('firstNameRequired')
  if (issue === 'invalidCharacters') return tp('invalidCharacters')
  return tp('nameTooLong', { max: PROFILE_NAME_MAX_LENGTH })
}

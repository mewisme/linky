export function toPascalCase(str: string): string {
  return (
    str
      // Split acronym groups into proper boundaries
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // Split between lowercase/digit and uppercase
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      // Normalize spaces/underscores/dashes
      .replace(/[-_\s]+/g, ' ')
      // Lowercase all to normalize
      .toLowerCase()
      // Capitalize every word
      .replace(/\b\w/g, (c) => c.toUpperCase())
      // Remove spaces
      .replace(/\s+/g, '')
  );
}

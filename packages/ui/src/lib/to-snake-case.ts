export function toSnakeCase(str: string): string {
  return (
    str
      // Split acronym groups (e.g. "XMLHttp" -> "XML_Http")
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      // Split between a lowercase/digit and an uppercase (e.g. "testHTTP" -> "test_HTTP")
      .replace(/([a-z\d])([A-Z])/g, '$1_$2')
      // Replace spaces and dashes with underscores
      .replace(/[\s-]+/g, '_')
      .toLowerCase()
      // Remove leading and trailing underscores
      .replace(/^_+|_+$/g, '')
  );
}

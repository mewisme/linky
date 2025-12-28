export function capitalizeAll(str: string): string {
  return str.replace(
    /(^|\s)(\S)/g,
    (_, space, char) => space + char.toUpperCase(),
  );
}

export function repeatPad(str: string, length: number, pad = ' '): string {
  const total = Math.max(length - str.length, 0);
  const left = Math.floor(total / 2);
  const right = total - left;
  return pad.repeat(left) + str + pad.repeat(right);
}

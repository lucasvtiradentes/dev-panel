export function findClosingBracketIndex(content: string, startIndex: number): number {
  let bracketCount = 1;

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '[') bracketCount++;
    if (content[i] === ']') bracketCount--;
    if (bracketCount === 0) {
      return i;
    }
  }

  return startIndex;
}

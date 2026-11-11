export function subject(text: string): string {
  const last = text.charCodeAt(text.length - 1)
  return text + (last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0 ? '이' : '가')
}

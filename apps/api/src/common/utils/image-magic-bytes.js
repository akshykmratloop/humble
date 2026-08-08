/** Never trust a client-declared MIME type — verify the actual file bytes (docs/06-lld.md §2). */
function detectImageType(headerBuffer) {
  if (
    headerBuffer.length >= 3 &&
    headerBuffer[0] === 0xff &&
    headerBuffer[1] === 0xd8 &&
    headerBuffer[2] === 0xff
  ) {
    return 'jpeg';
  }
  if (
    headerBuffer.length >= 8 &&
    headerBuffer[0] === 0x89 &&
    headerBuffer[1] === 0x50 &&
    headerBuffer[2] === 0x4e &&
    headerBuffer[3] === 0x47
  ) {
    return 'png';
  }
  if (
    headerBuffer.length >= 12 &&
    headerBuffer.toString('ascii', 0, 4) === 'RIFF' &&
    headerBuffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export { detectImageType };

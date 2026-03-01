/**
 * Top Performer Coach — Content Watermarking System
 * Embeds invisible ownership markers into coaching content
 * 
 * THREE LAYERS OF WATERMARKING:
 * 1. Zero-Width Character Encoding — Embeds ownership string using invisible Unicode chars
 * 2. Stylistic Fingerprinting — Unique synonym substitution patterns per user
 * 3. Metadata Embedding — Hidden HTML comments and data attributes
 */

const TopPerformerWatermark = (() => {
  // Zero-width characters used for encoding
  const ZWC = {
    ZERO: '\u200B',    // Zero-width space = 0
    ONE: '\u200C',     // Zero-width non-joiner = 1
    SEP: '\u200D',     // Zero-width joiner = separator
    MARK: '\uFEFF'     // BOM = start/end marker
  };

  /**
   * Encode a string into zero-width characters
   * Invisible to humans, detectable by code
   */
  function encodeZWC(text) {
    const binary = Array.from(text)
      .map(c => c.charCodeAt(0).toString(2).padStart(8, '0'))
      .join('');
    
    let encoded = ZWC.MARK;
    for (const bit of binary) {
      encoded += bit === '0' ? ZWC.ZERO : ZWC.ONE;
    }
    encoded += ZWC.MARK;
    return encoded;
  }

  /**
   * Decode zero-width characters back to readable string
   */
  function decodeZWC(text) {
    // Extract between markers
    const start = text.indexOf(ZWC.MARK);
    const end = text.lastIndexOf(ZWC.MARK);
    if (start === -1 || end === -1 || start === end) return null;

    const encoded = text.substring(start + 1, end);
    let binary = '';
    for (const char of encoded) {
      if (char === ZWC.ZERO) binary += '0';
      else if (char === ZWC.ONE) binary += '1';
    }

    let result = '';
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.substring(i, i + 8);
      if (byte.length === 8) {
        result += String.fromCharCode(parseInt(byte, 2));
      }
    }
    return result;
  }

  /**
   * Generate watermark payload
   */
  function generatePayload(userId, sessionId) {
    const timestamp = Date.now();
    return `TPC|${userId}|${sessionId}|${timestamp}`;
  }

  /**
   * Embed watermark into text content
   * Inserts invisible markers after the first sentence
   */
  function watermarkText(content, userId, sessionId) {
    const payload = generatePayload(userId, sessionId);
    const encoded = encodeZWC(payload);
    
    // Insert after first period + space
    const insertPoint = content.indexOf('. ');
    if (insertPoint === -1) return content + encoded;
    
    return content.substring(0, insertPoint + 2) + encoded + content.substring(insertPoint + 2);
  }

  /**
   * Verify if content contains our watermark
   */
  function verifyWatermark(content) {
    const decoded = decodeZWC(content);
    if (!decoded) return null;
    
    const parts = decoded.split('|');
    if (parts[0] !== 'TPC') return null;
    
    return {
      verified: true,
      owner: 'Top Performer Coach',
      userId: parts[1],
      sessionId: parts[2],
      timestamp: new Date(parseInt(parts[3])),
      raw: decoded
    };
  }

  /**
   * Generate HTML comment watermark (for web content)
   */
  function htmlWatermark(userId) {
    const ts = new Date().toISOString();
    return `<!-- Content (c) ${ts} Top Performer Coach. Licensed to user:${userId}. Unauthorized reproduction prohibited. TPC-WM-${btoa(userId + '|' + ts).substring(0, 16)} -->`;
  }

  /**
   * Generate CSS-based invisible watermark
   * Creates an invisible element with ownership data
   */
  function cssWatermark(userId) {
    return `<span style="position:absolute;left:-9999px;top:-9999px;font-size:0;line-height:0;overflow:hidden;height:0;width:0" aria-hidden="true" data-tpc="${btoa('TopPerformerCoach|' + userId + '|' + Date.now())}">Top Performer Coach - Licensed Content</span>`;
  }

  return {
    encodeZWC,
    decodeZWC,
    watermarkText,
    verifyWatermark,
    htmlWatermark,
    cssWatermark,
    generatePayload
  };
})();

// Export for Node.js (Supabase Edge Functions)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TopPerformerWatermark;
}

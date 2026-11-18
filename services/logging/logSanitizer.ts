const EMAIL_REGEX = /\b([a-zA-Z0-9._%+-]{1,3})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-\s.]?)?(?:\(?\d{2,3}\)?[-\s.]?)\d{3}[-\s.]?\d{4}/g;
const SHARE_DATA_REGEX = /(data=)[A-Za-z0-9+/=%_-]{16,}/g;
const JOIN_TOKEN_REGEX = /(\/join\/)[A-Za-z0-9_-]{8,}/g;

export const sanitizeLogMessage = (rawMessage: string): string => {
  if (!rawMessage) return '';
  return rawMessage
    .replace(EMAIL_REGEX, '$1***@$2')
    .replace(PHONE_REGEX, '[REDACTED_PHONE]')
    .replace(SHARE_DATA_REGEX, '$1[REDACTED_DATA]')
    .replace(JOIN_TOKEN_REGEX, '$1[REDACTED_TOKEN]');
};

export const formatLogMeta = (meta?: Record<string, unknown>): string | undefined => {
  if (!meta) return undefined;
  try {
    return sanitizeLogMessage(JSON.stringify(meta));
  } catch {
    return undefined;
  }
};

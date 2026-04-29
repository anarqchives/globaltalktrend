import DOMPurify from 'dompurify';
import { useMemo } from 'react';

interface AIContextProps {
  rawHtml: string;
}

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'blockquote'],
  ALLOWED_ATTR: [],
  FORBID_CONTENTS: ['script', 'style', 'iframe', 'object', 'embed'],
  FORCE_BODY: true,
} satisfies Parameters<typeof DOMPurify.sanitize>[1];

export function AIContext({ rawHtml }: AIContextProps) {
  const sanitized = useMemo(
    () => DOMPurify.sanitize(rawHtml, PURIFY_CONFIG),
    [rawHtml]
  );

  return (
    <div
      className="prose prose-sm max-w-none text-foreground"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

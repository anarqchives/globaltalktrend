import DOMPurify from 'dompurify';
import { useMemo } from 'react';

interface AIContextProps {
  rawHtml: string;
}

const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'blockquote'],
  ALLOWED_ATTR: [],
  FORBID_CONTENTS: ['script', 'style', 'iframe', 'object', 'embed'],
  FORCE_BODY: true,
};

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

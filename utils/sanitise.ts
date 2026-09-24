export function sanitizeJSON(node: any): any {
  const disallowedTypes = new Set(['iframe', 'htmlBlock', 'script', 'embed', 'video', 'rawHTML']);

  function isSafeUrl(url: any) {
    if (typeof url !== 'string') return false;
    return /^https?:\/\//.test(url) || /^data:/.test(url) || /^mailto:/.test(url);
  }

  function sanitize(node: any): any {
    if (!node || typeof node !== 'object') return node;
    if (node.type && disallowedTypes.has(node.type)) return null;

    const out: any = { ...node };

    if (out.attrs && typeof out.attrs === 'object') {
      const attrs: any = { ...out.attrs };
      if (attrs.src && !isSafeUrl(attrs.src)) delete attrs.src;
      if (attrs.href && !isSafeUrl(attrs.href)) delete attrs.href;
      out.attrs = attrs;
    }

    if (Array.isArray(out.marks)) {
      out.marks = out.marks
        .map((m: any) => {
          if (!m || typeof m !== 'object') return null;
          if (m.type === 'link') {
            if (!m.attrs || !isSafeUrl(m.attrs.href)) return null;
            return { ...m, attrs: { href: String(m.attrs.href) } };
          }
          return m;
        })
        .filter(Boolean);
    }

    if (Array.isArray(out.content)) {
      out.content = out.content.map(sanitize).filter(Boolean);
    }

    return out;
  }

  try {
    return sanitize(node);
  } catch (e) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
}

export default sanitizeJSON;

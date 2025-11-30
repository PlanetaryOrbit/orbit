import { sanitizeJSON } from '@/utils/sanitise';

describe('sanitizeJSON', () => {
  describe('Basic sanitization', () => {
    it('should return the same node if it is safe', () => {
      const node = {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello World' }],
      };
      const result = sanitizeJSON(node);
      expect(result).toEqual(node);
    });

    it('should handle null input', () => {
      const result = sanitizeJSON(null);
      expect(result).toBeNull();
    });

    it('should handle primitive values', () => {
      expect(sanitizeJSON('string')).toBe('string');
      expect(sanitizeJSON(123)).toBe(123);
      expect(sanitizeJSON(true)).toBe(true);
    });
  });

  describe('Disallowed node types', () => {
    it('should remove iframe nodes', () => {
      const node = {
        type: 'iframe',
        attrs: { src: 'https://example.com' },
      };
      const result = sanitizeJSON(node);
      expect(result).toBeNull();
    });

    it('should remove htmlBlock nodes', () => {
      const node = {
        type: 'htmlBlock',
        content: '<script>alert("xss")</script>',
      };
      const result = sanitizeJSON(node);
      expect(result).toBeNull();
    });

    it('should remove script nodes', () => {
      const node = {
        type: 'script',
        attrs: { src: 'malicious.js' },
      };
      const result = sanitizeJSON(node);
      expect(result).toBeNull();
    });

    it('should remove embed nodes', () => {
      const node = {
        type: 'embed',
        attrs: { src: 'https://example.com' },
      };
      const result = sanitizeJSON(node);
      expect(result).toBeNull();
    });

    it('should remove video nodes', () => {
      const node = {
        type: 'video',
        attrs: { src: 'video.mp4' },
      };
      const result = sanitizeJSON(node);
      expect(result).toBeNull();
    });

    it('should remove rawHTML nodes', () => {
      const node = {
        type: 'rawHTML',
        content: '<div>HTML</div>',
      };
      const result = sanitizeJSON(node);
      expect(result).toBeNull();
    });
  });

  describe('URL validation in attributes', () => {
    it('should allow safe https URLs in src attribute', () => {
      const node = {
        type: 'image',
        attrs: { src: 'https://example.com/image.png' },
      };
      const result = sanitizeJSON(node);
      expect(result.attrs.src).toBe('https://example.com/image.png');
    });

    it('should allow safe http URLs in src attribute', () => {
      const node = {
        type: 'image',
        attrs: { src: 'http://example.com/image.png' },
      };
      const result = sanitizeJSON(node);
      expect(result.attrs.src).toBe('http://example.com/image.png');
    });

    it('should allow data URLs in src attribute', () => {
      const node = {
        type: 'image',
        attrs: { src: 'data:image/png;base64,iVBORw0KG' },
      };
      const result = sanitizeJSON(node);
      expect(result.attrs.src).toBe('data:image/png;base64,iVBORw0KG');
    });

    it('should remove javascript URLs from src attribute', () => {
      const node = {
        type: 'image',
        attrs: { src: 'javascript:alert("xss")' },
      };
      const result = sanitizeJSON(node);
      expect(result.attrs.src).toBeUndefined();
    });

    it('should remove relative URLs from src attribute', () => {
      const node = {
        type: 'image',
        attrs: { src: '../malicious/file.png' },
      };
      const result = sanitizeJSON(node);
      expect(result.attrs.src).toBeUndefined();
    });

    it('should allow safe https URLs in href attribute', () => {
      const node = {
        type: 'link',
        attrs: { href: 'https://example.com' },
      };
      const result = sanitizeJSON(node);
      expect(result.attrs.href).toBe('https://example.com');
    });

    it('should allow mailto URLs in href attribute', () => {
      const node = {
        type: 'link',
        attrs: { href: 'mailto:test@example.com' },
      };
      const result = sanitizeJSON(node);
      expect(result.attrs.href).toBe('mailto:test@example.com');
    });

    it('should remove javascript URLs from href attribute', () => {
      const node = {
        type: 'link',
        attrs: { href: 'javascript:void(0)' },
      };
      const result = sanitizeJSON(node);
      expect(result.attrs.href).toBeUndefined();
    });

    it('should handle non-string URLs', () => {
      const node = {
        type: 'image',
        attrs: { src: 12345 },
      };
      const result = sanitizeJSON(node);
      expect(result.attrs.src).toBeUndefined();
    });
  });

  describe('Marks sanitization', () => {
    it('should allow safe link marks', () => {
      const node = {
        type: 'text',
        text: 'Click here',
        marks: [
          {
            type: 'link',
            attrs: { href: 'https://example.com' },
          },
        ],
      };
      const result = sanitizeJSON(node);
      expect(result.marks).toHaveLength(1);
      expect(result.marks[0].attrs.href).toBe('https://example.com');
    });

    it('should remove link marks with unsafe URLs', () => {
      const node = {
        type: 'text',
        text: 'Click here',
        marks: [
          {
            type: 'link',
            attrs: { href: 'javascript:alert("xss")' },
          },
        ],
      };
      const result = sanitizeJSON(node);
      expect(result.marks).toHaveLength(0);
    });

    it('should remove link marks without attrs', () => {
      const node = {
        type: 'text',
        text: 'Click here',
        marks: [
          {
            type: 'link',
          },
        ],
      };
      const result = sanitizeJSON(node);
      expect(result.marks).toHaveLength(0);
    });

    it('should preserve non-link marks', () => {
      const node = {
        type: 'text',
        text: 'Bold text',
        marks: [{ type: 'bold' }],
      };
      const result = sanitizeJSON(node);
      expect(result.marks).toHaveLength(1);
      expect(result.marks[0].type).toBe('bold');
    });

    it('should filter out null/invalid marks', () => {
      const node = {
        type: 'text',
        text: 'Text',
        marks: [null, { type: 'bold' }, undefined, { type: 'italic' }],
      };
      const result = sanitizeJSON(node);
      expect(result.marks).toHaveLength(2);
      expect(result.marks.map((m: any) => m.type)).toEqual(['bold', 'italic']);
    });
  });

  describe('Nested content sanitization', () => {
    it('should sanitize nested content arrays', () => {
      const node = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello' }],
          },
          {
            type: 'script',
            content: 'alert("xss")',
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'World' }],
          },
        ],
      };
      const result = sanitizeJSON(node);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('paragraph');
      expect(result.content[1].type).toBe('paragraph');
    });

    it('should deeply sanitize multi-level nested structures', () => {
      const node = {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Link',
                    marks: [
                      {
                        type: 'link',
                        attrs: { href: 'javascript:void(0)' },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const result = sanitizeJSON(node);
      expect(result.content[0].content[0].content[0].marks).toHaveLength(0);
    });

    it('should handle empty content arrays', () => {
      const node = {
        type: 'doc',
        content: [],
      };
      const result = sanitizeJSON(node);
      expect(result.content).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should return default doc structure on error', () => {
      // Force an error by creating a circular reference
      const node: any = { type: 'doc' };
      node.content = [node];
      
      const result = sanitizeJSON(node);
      expect(result).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      });
    });

    it('should handle malformed nodes gracefully', () => {
      const node = {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Valid' },
          'invalid string node',
          { type: 'text', text: 'Also valid' },
        ],
      };
      const result = sanitizeJSON(node);
      expect(result.content).toHaveLength(3);
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should sanitize a complex document with mixed content', () => {
      const node = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Some text with ' },
              {
                type: 'text',
                text: 'a link',
                marks: [
                  {
                    type: 'link',
                    attrs: { href: 'https://example.com' },
                  },
                ],
              },
            ],
          },
          {
            type: 'image',
            attrs: { src: 'https://example.com/image.png' },
          },
          {
            type: 'iframe',
            attrs: { src: 'https://malicious.com' },
          },
        ],
      };
      const result = sanitizeJSON(node);
      expect(result.content).toHaveLength(3); // iframe should be removed
      expect(result.content[2].type).toBe('image');
      expect(result.content[2].attrs.src).toBe('https://example.com/image.png');
    });
  });
});
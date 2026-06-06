import sanitizehtml from "sanitize-html"

export const HTML_OPTIONS: sanitizehtml.IOptions = {
  allowedTags: [
    "p", "br", "img", "a", "strong", "em", "b", "i",
    "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "span", "div", "code", "pre", "hr", "table",
    "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    img: ["src", "alt", "width", "height"],
    a: ["href", "target", "rel"],
    "*": ["class"],
  },
  allowedSchemes: ["https", "http"],
}
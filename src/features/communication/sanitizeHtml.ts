// Article bodies come from the API as HTML (rich-text editor output). Before rendering, keep only basic text
// markup: no scripts, styles, event handlers or inline styles; links only to http(s)/mailto, opened in a new tab.
// Browser-only (DOMParser); call it from a client component.

const ALLOWED = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "A", "SPAN", "DIV", "CODE", "PRE"]);
const DROP_WITH_CONTENT = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "NOSCRIPT", "SVG", "MATH", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT"]);

function clean(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  if (DROP_WITH_CONTENT.has(el.tagName)) return null;

  const children = Array.from(el.childNodes).map((c) => clean(c, doc)).filter((c): c is Node => !!c);
  if (!ALLOWED.has(el.tagName)) {
    // Unknown tag: keep its text, drop the tag.
    const frag = doc.createDocumentFragment();
    children.forEach((c) => frag.appendChild(c));
    return frag;
  }
  const out = doc.createElement(el.tagName.toLowerCase());
  if (el.tagName === "A") {
    const href = el.getAttribute("href")?.trim() ?? "";
    if (/^(https?:|mailto:)/i.test(href)) {
      out.setAttribute("href", href);
      out.setAttribute("target", "_blank");
      out.setAttribute("rel", "noopener noreferrer");
    }
  }
  children.forEach((c) => out.appendChild(c));
  return out;
}

const BLOCKS = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "PRE"]);

/** An HTML body → plain paragraphs separated by a blank line (the edit form's textarea). */
export function htmlToText(html: string): string {
  if (!html || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const paras: string[] = [];
  const walk = (el: Element) => {
    const blockChildren = Array.from(el.children).some((c) => BLOCKS.has(c.tagName));
    if (BLOCKS.has(el.tagName) && !blockChildren) {
      const clone = el.cloneNode(true) as Element;
      clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
      const text = (clone.textContent ?? "").trim();
      if (text) paras.push(el.tagName === "LI" ? `• ${text}` : text);
      return;
    }
    Array.from(el.children).forEach(walk);
  };
  walk(doc.body);
  return paras.length ? paras.join("\n\n") : (doc.body.textContent ?? "").trim();
}

export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.createElement("div");
  Array.from(doc.body.childNodes).forEach((c) => {
    const n = clean(c, doc);
    if (n) root.appendChild(n);
  });
  return root.innerHTML;
}

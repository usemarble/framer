import sanitize, { defaults } from "sanitize-html";

const HEX_COLOR_PATTERN = /^#[\da-fA-F]{3,6}$/;
const RGB_COLOR_PATTERN = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
const RGBA_COLOR_PATTERN =
  /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;
const NAMED_COLOR_PATTERN = /^[a-zA-Z]+$/;
const LINE_THROUGH_PATTERN = /^line-through$/;
const UNDERLINE_PATTERN = /^underline$/;
const NONE_PATTERN = /^none$/;
const EVENT_HANDLER_ATTRIBUTE_PATTERN = /^on/i;

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Uses the same configuration as the CMS editor to ensure consistency.
 *
 * - Strips `<script>` tags and `on*` event handlers
 * - Whitelists safe HTML tags and attributes
 * - Only allows safe URL schemes (blocks `javascript:` in hrefs)
 * - Restricts iframe sources to YouTube only
 */
export const sanitizeHtml = (content: string): string =>
  sanitize(content, {
    allowedTags: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "img",
      "video",
      "track",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "code",
      "pre",
      "p",
      "li",
      "ul",
      "ol",
      "blockquote",
      "td",
      "th",
      "table",
      "tr",
      "tbody",
      "thead",
      "tfoot",
      "small",
      "div",
      "iframe",
      "input",
      "label",
      "figure",
      "figcaption",
      "span",
      "mark",
      "s",
      "u",
      "sub",
      "sup",
      "hr",
    ],
    allowedAttributes: {
      ...defaults.allowedAttributes,
      "*": ["style"],
      code: ["class"],
      a: ["href", "target"],
      iframe: ["src", "allowfullscreen", "style", "width", "height"],
      input: ["type", "checked"],
      figure: [
        "src",
        "alt",
        "data-width",
        "caption",
        "data-align",
        "data-type",
      ],
      video: ["src", "controls", "preload", "muted", "loop", "playsinline"],
      track: ["kind", "src", "srclang", "label"],
      div: ["data-twitter", "data-src", "data-youtube-video"],
      span: ["style", "data-color"],
      mark: ["style", "data-color"],
    },
    allowedStyles: {
      "*": {
        color: [
          HEX_COLOR_PATTERN,
          RGB_COLOR_PATTERN,
          RGBA_COLOR_PATTERN,
          NAMED_COLOR_PATTERN,
        ],
        "background-color": [
          HEX_COLOR_PATTERN,
          RGB_COLOR_PATTERN,
          RGBA_COLOR_PATTERN,
          NAMED_COLOR_PATTERN,
        ],
        "text-decoration": [
          LINE_THROUGH_PATTERN,
          UNDERLINE_PATTERN,
          NONE_PATTERN,
        ],
      },
    },
    allowedSchemes: ["http", "https", "ftp", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
      video: ["http", "https"],
      a: ["http", "https", "ftp", "mailto"],
      iframe: ["https"],
    },
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com"],
    exclusiveFilter: (frame) => {
      if (frame.tag === "script") {
        return true;
      }
      if (frame.tag === "input" && frame.attribs?.type !== "checkbox") {
        return true;
      }
      if (frame.attribs) {
        for (const attr in frame.attribs) {
          if (EVENT_HANDLER_ATTRIBUTE_PATTERN.test(attr)) {
            return true;
          }
        }
      }
      return false;
    },
  });

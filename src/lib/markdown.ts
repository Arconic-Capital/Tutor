"use client";

import { marked } from "marked";
import katex from "katex";

const unescapeHtml = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Markdown → HTML with $...$ / $$...$$ LaTeX rendered via KaTeX. */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md) as string;
  const tex = (src: string, display: boolean) => {
    try {
      return katex.renderToString(unescapeHtml(src), { displayMode: display, throwOnError: false });
    } catch {
      return src;
    }
  };
  return html
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => tex(t, true))
    .replace(/\$([^$\n]+?)\$/g, (_, t) => tex(t, false));
}

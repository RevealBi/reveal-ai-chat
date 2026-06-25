import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

/** Render markdown to HTML (synchronous). */
export function md(src: string): string {
  return marked.parse(src ?? '', { async: false }) as string;
}

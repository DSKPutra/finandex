// © 2026 Dea Saka Kurnia Putra. All rights reserved.
/** @jsxRuntime automatic */
// Markdown renderer for whitepaper chapters — shared by the /whitepaper reader and the PDF build, so both show
// exactly the same text. `###` headings get stable ids (slugify) for the "on this page" list and deep links.
import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { slugify } from '../content/whitepaper.ts';

function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) =>
      typeof c === 'string' || typeof c === 'number'
        ? String(c)
        : isValidElement(c)
          ? text((c.props as { children?: ReactNode }).children)
          : '',
    )
    .join('');
}

export function WhitepaperMarkdown({ body }: { body: string }) {
  return (
    <div className="wp-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h3: ({ children }) => <h3 id={slugify(text(children))}>{children}</h3>,
          table: ({ children }) => (
            <div className="wp-table">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

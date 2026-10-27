import type { CSSProperties, ReactNode } from 'react';
import { Square, SquareCheck } from 'lucide-react';
import { parseMarkdown } from '../../utils/markdown';
import type { MarkdownBlock, MarkdownInline } from '../../utils/markdown';
import { Highlight } from './Highlight';

// A text written in Markdown, drawn with the page's own elements and the colors of the theme. The
// searched words are marked as anywhere else. Inside a control, such as the card of a note, which
// is a button, only phrasing elements are allowed and nothing in it can be clicked on its own:
// `phrasing` draws the same look with spans, and the links as plain underlined text.

interface Elements {
  phrasing: boolean;
}

const LINK = 'text-link underline underline-offset-2';

function Inlines({ nodes, elements }: { nodes: readonly MarkdownInline[]; elements: Elements }) {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return <Highlight key={index} text={node.text} />;
      case 'break':
        return <br key={index} />;
      case 'code':
        return (
          <code key={index} className="rounded-sm bg-surface-strong px-1 font-mono text-[0.92em]">
            {node.text}
          </code>
        );
      case 'strong':
        return (
          <strong key={index} className="font-bold">
            <Inlines nodes={node.children} elements={elements} />
          </strong>
        );
      case 'em':
        return (
          <em key={index}>
            <Inlines nodes={node.children} elements={elements} />
          </em>
        );
      case 'strike':
        return (
          <del key={index}>
            <Inlines nodes={node.children} elements={elements} />
          </del>
        );
      case 'link': {
        const children = <Inlines nodes={node.children} elements={elements} />;
        if (elements.phrasing) {
          return (
            <span key={index} className={LINK}>
              {children}
            </span>
          );
        }
        const web = /^https?:/i.test(node.href);
        return (
          <a
            key={index}
            href={node.href}
            {...(web ? { target: '_blank', rel: 'noreferrer' } : {})}
            className={`${LINK} hover:no-underline`}
          >
            {children}
            {web && <span className="sr-only"> (si apre in una nuova scheda)</span>}
          </a>
        );
      }
    }
  });
}

/** The headings of a note, under those of the page: "#" is a fourth level. */
const HEADING_TAGS = ['h4', 'h5', 'h6'] as const;
const HEADING_SIZES = ['text-[1.15em] font-bold', 'text-[1.05em] font-bold', 'font-semibold'];

function Blocks({ blocks, elements }: { blocks: readonly MarkdownBlock[]; elements: Elements }) {
  const { phrasing } = elements;
  return blocks.map((block, index): ReactNode => {
    switch (block.type) {
      case 'paragraph': {
        const Tag = phrasing ? 'span' : 'p';
        return (
          <Tag key={index} className="block">
            <Inlines nodes={block.children} elements={elements} />
          </Tag>
        );
      }
      case 'heading': {
        const rank = Math.min(block.level, 3) - 1;
        const Tag = phrasing ? 'span' : (HEADING_TAGS[rank] ?? 'h6');
        return (
          <Tag key={index} className={`block leading-snug ${HEADING_SIZES[rank] ?? ''}`}>
            <Inlines nodes={block.children} elements={elements} />
          </Tag>
        );
      }
      case 'rule':
        return phrasing ? (
          <span key={index} className="my-1 block border-t border-line" aria-hidden="true" />
        ) : (
          <hr key={index} className="my-1 border-line" />
        );
      case 'code': {
        const Tag = phrasing ? 'span' : 'pre';
        return (
          <Tag
            key={index}
            className="block overflow-x-auto rounded-md bg-surface-strong px-2 py-1 font-mono text-[0.92em] whitespace-pre-wrap"
          >
            {block.text}
          </Tag>
        );
      }
      case 'quote': {
        const Tag = phrasing ? 'span' : 'blockquote';
        return (
          <Tag
            key={index}
            className="block space-y-1 border-l-2 border-line-strong pl-2 text-fg-muted"
          >
            <Blocks blocks={block.children} elements={elements} />
          </Tag>
        );
      }
      case 'list': {
        const List = phrasing ? 'span' : block.ordered ? 'ol' : 'ul';
        const Item = phrasing ? 'span' : 'li';
        const tasks = block.items.some((item) => item.checked !== null);
        // The numbers of a list that starts elsewhere; a phrasing list counts with CSS.
        const start: CSSProperties | undefined =
          block.ordered && block.start !== 1
            ? phrasing
              ? { counterReset: `list-item ${block.start - 1}` }
              : undefined
            : undefined;
        return (
          <List
            key={index}
            {...(!phrasing && block.ordered && block.start !== 1 ? { start: block.start } : {})}
            style={start}
            className={`block space-y-0.5 ${
              tasks ? 'pl-1' : `pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`
            }`}
          >
            {block.items.map((item, at) => (
              <Item key={at} className={tasks ? 'flex list-none items-start gap-1.5' : 'list-item'}>
                {item.checked === null ? (
                  // In a list of checkboxes, a plain item keeps the same column for its mark.
                  tasks && (
                    <span aria-hidden="true" className="w-[1.1em] shrink-0 text-center">
                      •
                    </span>
                  )
                ) : (
                  <>
                    {item.checked ? (
                      <SquareCheck
                        className="mt-[0.15em] h-[1.1em] w-[1.1em] shrink-0 text-success"
                        aria-hidden="true"
                      />
                    ) : (
                      <Square
                        className="mt-[0.15em] h-[1.1em] w-[1.1em] shrink-0 text-fg-muted"
                        aria-hidden="true"
                      />
                    )}
                    <span className="sr-only">{item.checked ? 'Fatto: ' : 'Da fare: '}</span>
                  </>
                )}
                {tasks ? (
                  <span className={`block min-w-0 ${item.checked ? 'text-fg-muted' : ''}`}>
                    <Blocks blocks={item.children} elements={elements} />
                  </span>
                ) : (
                  <Blocks blocks={item.children} elements={elements} />
                )}
              </Item>
            ))}
          </List>
        );
      }
    }
  });
}

/**
 * A note in Markdown. `phrasing` keeps it valid inside a button or a label: spans only, and links
 * that the control around them opens rather than themselves.
 */
export function Markdown({
  text,
  phrasing = false,
  className = '',
}: {
  text: string;
  phrasing?: boolean;
  className?: string;
}) {
  const Tag = phrasing ? 'span' : 'div';
  return (
    <Tag className={`block space-y-1 wrap-break-word ${className}`}>
      <Blocks blocks={parseMarkdown(text)} elements={{ phrasing }} />
    </Tag>
  );
}

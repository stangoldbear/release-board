import { describe, expect, it } from 'vitest';
import { markdownToPlainText, parseInline, parseMarkdown, safeHref } from './markdown';

const text = (value: string) => ({ type: 'text', text: value });

describe('parseMarkdown', () => {
  it('keeps a plain note as it was written, line breaks included', () => {
    expect(parseMarkdown('Chiamare il fornitore\npoi aggiornare la stima')).toEqual([
      {
        type: 'paragraph',
        children: [
          text('Chiamare il fornitore'),
          { type: 'break' },
          text('poi aggiornare la stima'),
        ],
      },
    ]);
    expect(parseMarkdown('Primo\n\nSecondo').map((block) => block.type)).toEqual([
      'paragraph',
      'paragraph',
    ]);
    expect(parseMarkdown('')).toEqual([]);
  });

  it('reads headings, rules, quotes and code', () => {
    expect(parseMarkdown('# Rilascio 2.8\n---\n> da confermare\n```\nnpm ci\n```')).toEqual([
      { type: 'heading', level: 1, children: [text('Rilascio 2.8')] },
      { type: 'rule' },
      { type: 'quote', children: [{ type: 'paragraph', children: [text('da confermare')] }] },
      { type: 'code', text: 'npm ci' },
    ]);
    expect(parseMarkdown('### Tre ###')[0]).toEqual({
      type: 'heading',
      level: 3,
      children: [text('Tre')],
    });
    // Without a space it is a tag, not a heading.
    expect(parseMarkdown('#ios')[0]?.type).toBe('paragraph');
  });

  it('reads lists, numbered lists, nested lists and checkboxes', () => {
    expect(parseMarkdown('- uno\n- due\n  - due.a\n- [x] fatto\n- [ ] da fare')).toEqual([
      {
        type: 'list',
        ordered: false,
        start: 1,
        items: [
          { checked: null, children: [{ type: 'paragraph', children: [text('uno')] }] },
          {
            checked: null,
            children: [
              { type: 'paragraph', children: [text('due')] },
              {
                type: 'list',
                ordered: false,
                start: 1,
                items: [
                  { checked: null, children: [{ type: 'paragraph', children: [text('due.a')] }] },
                ],
              },
            ],
          },
          { checked: true, children: [{ type: 'paragraph', children: [text('fatto')] }] },
          { checked: false, children: [{ type: 'paragraph', children: [text('da fare')] }] },
        ],
      },
    ]);
    const numbered = parseMarkdown('3. tre\n4. quattro');
    expect(numbered[0]).toMatchObject({ type: 'list', ordered: true, start: 3 });
    expect(numbered[0]?.type === 'list' && numbered[0].items).toHaveLength(2);
  });

  it('lets a list break into a paragraph, but not a year that starts a line', () => {
    expect(parseMarkdown('Da fare:\n- test\n- rilascio').map((block) => block.type)).toEqual([
      'paragraph',
      'list',
    ]);
    expect(parseMarkdown('Chiusura\n2026. anno nuovo').map((block) => block.type)).toEqual([
      'paragraph',
    ]);
  });

  it('carries a list item on a line of text right after it', () => {
    expect(parseMarkdown('- uno\ncontinua')[0]).toMatchObject({
      type: 'list',
      items: [
        {
          children: [
            { type: 'paragraph', children: [text('uno'), { type: 'break' }, text('continua')] },
          ],
        },
      ],
    });
  });
});

describe('parseInline', () => {
  it('reads bold, italics, strikethrough and code', () => {
    expect(parseInline('**grassetto** *corsivo* ~~barrato~~ `npm ci`')).toEqual([
      { type: 'strong', children: [text('grassetto')] },
      text(' '),
      { type: 'em', children: [text('corsivo')] },
      text(' '),
      { type: 'strike', children: [text('barrato')] },
      text(' '),
      { type: 'code', text: 'npm ci' },
    ]);
    expect(parseInline('***entrambi***')).toEqual([
      { type: 'strong', children: [{ type: 'em', children: [text('entrambi')] }] },
    ]);
  });

  it('leaves alone what only looks like emphasis', () => {
    expect(parseInline('file_di_prova e 5 * 3 * 2')).toEqual([text('file_di_prova e 5 * 3 * 2')]);
    expect(parseInline('** non chiuso')).toEqual([text('** non chiuso')]);
    expect(parseInline('\\*non corsivo\\*')).toEqual([text('*non corsivo*')]);
  });

  it('opens only links to the web and to emails', () => {
    expect(parseInline('[guida](https://example.com/a) e https://example.com/b.')).toEqual([
      { type: 'link', href: 'https://example.com/a', children: [text('guida')] },
      text(' e '),
      { type: 'link', href: 'https://example.com/b', children: [text('https://example.com/b')] },
      text('.'),
    ]);
    expect(parseInline('[clic](javascript:alert(1))')).toEqual([text('clic'), text(')')]);
    expect(parseInline('<mailto:qa@example.com>')).toEqual([
      { type: 'link', href: 'mailto:qa@example.com', children: [text('qa@example.com')] },
    ]);
    // No link inside a link.
    expect(parseInline('[https://example.com](https://example.com)')).toEqual([
      { type: 'link', href: 'https://example.com', children: [text('https://example.com')] },
    ]);
    // A checkbox-like bracket before a link stays text.
    expect(parseInline('[x] e [a](https://a.it)')).toEqual([
      text('[x] e '),
      { type: 'link', href: 'https://a.it', children: [text('a')] },
    ]);
  });

  it('keeps the parentheses that belong to a URL', () => {
    expect(parseInline('(vedi https://example.com/a_(b))')).toEqual([
      text('(vedi '),
      {
        type: 'link',
        href: 'https://example.com/a_(b)',
        children: [text('https://example.com/a_(b)')],
      },
      text(')'),
    ]);
  });

  it('never lets HTML through as markup', () => {
    expect(parseInline('<script>alert(1)</script>')).toEqual([text('<script>alert(1)</script>')]);
  });
});

describe('safeHref', () => {
  it('accepts the web and emails only', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
    expect(safeHref(' <http://example.com> ')).toBe('http://example.com');
    expect(safeHref('mailto:qa@example.com')).toBe('mailto:qa@example.com');
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,x')).toBeNull();
    expect(safeHref('/relative')).toBeNull();
  });
});

describe('markdownToPlainText', () => {
  it('drops the marks and keeps the words', () => {
    expect(
      markdownToPlainText('# Titolo\n**Uno** e [due](https://a.it)\n\n- [x] tre\n1. quattro'),
    ).toBe('Titolo\nUno e due\n• ☑ tre\n1. quattro');
    expect(markdownToPlainText('riga uno\nriga due')).toBe('riga uno\nriga due');
  });
});

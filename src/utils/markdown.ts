// The Markdown of the notes: a small part of GitHub's, enough for notes — headings, lists with
// checkboxes, quotes, code, rules, bold, italics, strikethrough, links. It is read into a tree
// that the page draws with its own elements: no HTML written in a note ever reaches the page, and
// a link opens only the web or an email. A line break is kept, as the notes always showed it.

export type MarkdownInline =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'strong' | 'em' | 'strike'; children: MarkdownInline[] }
  | { type: 'link'; href: string; children: MarkdownInline[] }
  | { type: 'break' };

export interface MarkdownListItem {
  /** A checkbox item: true when ticked; null for a plain item. */
  checked: boolean | null;
  children: MarkdownBlock[];
}

export type MarkdownBlock =
  | { type: 'paragraph'; children: MarkdownInline[] }
  | { type: 'heading'; level: number; children: MarkdownInline[] }
  | { type: 'list'; ordered: boolean; start: number; items: MarkdownListItem[] }
  | { type: 'quote'; children: MarkdownBlock[] }
  | { type: 'code'; text: string }
  | { type: 'rule' };

const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const QUOTE = /^ {0,3}> ?/;
const LIST_ITEM = /^( *)([-*+]|(\d{1,9})[.)])([ \t]+|$)/;
const TASK = /^\[([ xX])\](?:[ \t]+|$)/;

function isBlank(line: string): boolean {
  return line.trim() === '';
}

/** The width of the leading spaces, a tab counting as four. */
function indentOf(line: string): number {
  let width = 0;
  for (const char of line) {
    if (char === ' ') width += 1;
    else if (char === '\t') width += 4 - (width % 4);
    else break;
  }
  return width;
}

/** The line without its first `width` columns of indentation. */
function outdent(line: string, width: number): string {
  let removed = 0;
  let at = 0;
  while (at < line.length && removed < width) {
    const char = line[at];
    if (char === ' ') removed += 1;
    else if (char === '\t') removed += 4 - (removed % 4);
    else break;
    at += 1;
  }
  return line.slice(at);
}

/** Whether a line starts a block other than a paragraph, and so ends the paragraph before it. */
function startsBlock(line: string): boolean {
  return HEADING.test(line) || RULE.test(line) || FENCE.test(line) || QUOTE.test(line);
}

interface ListMarker {
  indent: number;
  ordered: boolean;
  start: number;
  /** The column where the text of the item starts. */
  content: number;
  rest: string;
}

function listMarker(line: string): ListMarker | null {
  const match = LIST_ITEM.exec(line);
  if (!match) return null;
  const [whole, spaces = '', marker = '', number, gap = ''] = match;
  const indent = spaces.length;
  const rest = line.slice(whole.length);
  // An empty item, or text after more than four spaces, starts one column after the marker.
  const content = indent + marker.length + (gap.length === 0 || gap.length > 4 ? 1 : gap.length);
  return {
    indent,
    ordered: number !== undefined,
    start: number !== undefined ? Number(number) : 1,
    content,
    rest: gap.length > 4 ? `${' '.repeat(gap.length - 1)}${rest}` : rest,
  };
}

function parseBlocks(lines: readonly string[]): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let at = 0;
  while (at < lines.length) {
    const line = lines[at] ?? '';
    if (isBlank(line)) {
      at += 1;
      continue;
    }
    const fence = FENCE.exec(line);
    if (fence) {
      const mark = fence[1] ?? '```';
      const indent = indentOf(line);
      const code: string[] = [];
      at += 1;
      while (at < lines.length) {
        const current = lines[at] ?? '';
        const closing = FENCE.exec(current);
        if (closing && (closing[1] ?? '').startsWith(mark) && current.trim() === closing[1]) {
          at += 1;
          break;
        }
        code.push(outdent(current, indent));
        at += 1;
      }
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: (heading[1] ?? '#').length,
        children: parseInline(heading[2] ?? ''),
      });
      at += 1;
      continue;
    }
    if (RULE.test(line)) {
      blocks.push({ type: 'rule' });
      at += 1;
      continue;
    }
    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (at < lines.length && !isBlank(lines[at] ?? '')) {
        const current = lines[at] ?? '';
        // Lines of text without ">" carry on the quote, as in GitHub; another block ends it.
        const marked = QUOTE.test(current);
        if (!marked && (startsBlock(current) || listMarker(current))) break;
        quoted.push(marked ? current.replace(QUOTE, '') : current);
        at += 1;
      }
      blocks.push({ type: 'quote', children: parseBlocks(quoted) });
      continue;
    }
    const marker = listMarker(line);
    if (marker) {
      at = parseList(lines, at, marker, blocks);
      continue;
    }
    const paragraph: string[] = [];
    while (at < lines.length) {
      const current = lines[at] ?? '';
      if (isBlank(current) || startsBlock(current)) break;
      // A list breaks into a paragraph, unless it is a number that starts a line of text.
      const list = paragraph.length > 0 ? listMarker(current) : null;
      if (list && (!list.ordered || list.start === 1)) break;
      paragraph.push(current.trim());
      at += 1;
    }
    blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n')) });
  }
  return blocks;
}

/** Reads a list from its first item; returns the line after it. */
function parseList(
  lines: readonly string[],
  from: number,
  first: ListMarker,
  blocks: MarkdownBlock[],
): number {
  const items: MarkdownListItem[] = [];
  let at = from;
  let marker: ListMarker | null = first;
  while (marker && marker.ordered === first.ordered && marker.indent < first.content) {
    const content: string[] = [marker.rest];
    at += 1;
    let blankBefore = false;
    while (at < lines.length) {
      const current = lines[at] ?? '';
      if (isBlank(current)) {
        blankBefore = true;
        content.push('');
        at += 1;
        continue;
      }
      const indent = indentOf(current);
      if (indent >= marker.content) {
        content.push(outdent(current, marker.content));
        blankBefore = false;
        at += 1;
        continue;
      }
      // A line of text right after the item carries it on; anything else ends it.
      if (!blankBefore && !listMarker(current) && !startsBlock(current)) {
        content.push(current.trim());
        at += 1;
        continue;
      }
      break;
    }
    while (content.length > 0 && isBlank(content.at(-1) ?? '')) content.pop();
    const task = TASK.exec(content[0] ?? '');
    if (task) content[0] = (content[0] ?? '').slice(task[0].length);
    items.push({
      checked: task ? (task[1] ?? ' ').toLowerCase() === 'x' : null,
      children: parseBlocks(content),
    });
    const next = lines[at];
    marker = next === undefined ? null : listMarker(next);
    if (marker && marker.indent >= first.content) marker = null;
  }
  blocks.push({ type: 'list', ordered: first.ordered, start: first.start, items });
  return at;
}

/** The ends of a URL written in the text, which are punctuation of the sentence, not of it. */
function trimUrl(url: string): string {
  let end = url.length;
  while (end > 0) {
    const char = url[end - 1] ?? '';
    if ('.,;:!?\'"*_~'.includes(char)) {
      end -= 1;
      continue;
    }
    if (char === ')') {
      const opened = url.slice(0, end).split('(').length - 1;
      const closed = url.slice(0, end).split(')').length - 1;
      if (closed > opened) {
        end -= 1;
        continue;
      }
    }
    break;
  }
  return url.slice(0, end);
}

/** A link target the page may open: the web, or an email. Null otherwise. */
export function safeHref(target: string): string | null {
  const href = target.trim().replace(/^<(.*)>$/, '$1');
  if (/^https?:\/\/[^\s]+$/i.test(href)) return href;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(href)) return href;
  return null;
}

const PUNCTUATION = /[!-/:-@[-`{-~]/;
const WORD = /[\p{L}\p{N}]/u;

/** The position of the delimiter that closes one opened at `from`, or -1. */
function closingOf(text: string, from: number, delimiter: string): number {
  let at = from;
  while (at < text.length) {
    let found = text.indexOf(delimiter, at);
    if (found < 0) return -1;
    // In a longer run, "***", the pair closes at its end: what is before it is emphasis inside.
    while (delimiter.length === 2 && text[found + 2] === delimiter[0]) found += 1;
    const before = text[found - 1] ?? '';
    const after = text[found + delimiter.length] ?? '';
    const escaped = before === '\\';
    // Closes right after some text, and, for "_", never inside a word.
    const closes =
      found > from &&
      !/\s/.test(before) &&
      !escaped &&
      (delimiter[0] !== '_' || !WORD.test(after)) &&
      // "**" does not close a single "*".
      !(delimiter.length === 1 && after === delimiter);
    if (closes) return found;
    at = found + (delimiter.length === 1 && after === delimiter ? 2 : 1);
  }
  return -1;
}

/**
 * The text of a line or a paragraph, with its emphasis, code and links; inside a link, no other
 * link.
 */
export function parseInline(text: string, inLink = false): MarkdownInline[] {
  const nodes: MarkdownInline[] = [];
  let buffer = '';
  const flush = () => {
    if (buffer) nodes.push({ type: 'text', text: buffer });
    buffer = '';
  };
  let at = 0;
  while (at < text.length) {
    const char = text[at] ?? '';
    const next = text[at + 1] ?? '';
    if (char === '\\' && PUNCTUATION.test(next)) {
      buffer += next;
      at += 2;
      continue;
    }
    if (char === '\n') {
      flush();
      nodes.push({ type: 'break' });
      at += 1;
      continue;
    }
    if (char === '`') {
      let ticks = 1;
      while (text[at + ticks] === '`') ticks += 1;
      const fence = '`'.repeat(ticks);
      const end = text.indexOf(fence, at + ticks);
      if (end > at + ticks - 1) {
        flush();
        const code = text.slice(at + ticks, end);
        nodes.push({
          type: 'code',
          text:
            code.length > 2 && code.startsWith(' ') && code.endsWith(' ')
              ? code.slice(1, -1)
              : code,
        });
        at = end + ticks;
        continue;
      }
      buffer += fence;
      at += ticks;
      continue;
    }
    const pair = text.slice(at, at + 2);
    if (pair === '**' || pair === '__' || pair === '~~') {
      const opensWord = pair !== '__' || !WORD.test(text[at - 1] ?? '');
      const end = opensWord && !/\s/.test(text[at + 2] ?? ' ') ? closingOf(text, at + 2, pair) : -1;
      if (end > 0) {
        flush();
        nodes.push({
          type: pair === '~~' ? 'strike' : 'strong',
          children: parseInline(text.slice(at + 2, end), inLink),
        });
        at = end + 2;
        continue;
      }
    }
    if ((char === '*' || char === '_') && next !== char) {
      const opensWord = char === '*' || !WORD.test(text[at - 1] ?? '');
      const end = opensWord && !/\s/.test(next || ' ') ? closingOf(text, at + 1, char) : -1;
      if (end > 0) {
        flush();
        nodes.push({ type: 'em', children: parseInline(text.slice(at + 1, end), inLink) });
        at = end + 1;
        continue;
      }
    }
    if (char === '[' && !inLink) {
      const close = text.indexOf('](', at + 1);
      const end = close > at ? text.indexOf(')', close + 2) : -1;
      const label = close > at ? text.slice(at + 1, close) : '';
      if (end > close && label.trim() && !/[[\]\n]/.test(label)) {
        const href = safeHref(text.slice(close + 2, end));
        flush();
        const children = parseInline(label, true);
        if (href) nodes.push({ type: 'link', href, children });
        else nodes.push(...children);
        at = end + 1;
        continue;
      }
    }
    if (char === '<' && !inLink) {
      const end = text.indexOf('>', at + 1);
      const href = end > at ? safeHref(text.slice(at + 1, end)) : null;
      if (href) {
        flush();
        nodes.push({
          type: 'link',
          href,
          children: [{ type: 'text', text: href.replace(/^mailto:/i, '') }],
        });
        at = end + 1;
        continue;
      }
    }
    if ((char === 'h' || char === 'H') && !inLink && !WORD.test(text[at - 1] ?? '')) {
      const match = /^https?:\/\/[^\s<]+/i.exec(text.slice(at));
      if (match) {
        const url = trimUrl(match[0]);
        if (url.length > url.indexOf('//') + 2) {
          flush();
          nodes.push({ type: 'link', href: url, children: [{ type: 'text', text: url }] });
          at += url.length;
          continue;
        }
      }
    }
    buffer += char;
    at += 1;
  }
  flush();
  return nodes;
}

/** The blocks of a text written in Markdown. */
export function parseMarkdown(text: string): MarkdownBlock[] {
  return parseBlocks(text.replace(/\r\n?/g, '\n').split('\n'));
}

function inlineText(nodes: readonly MarkdownInline[]): string {
  return nodes
    .map((node) =>
      node.type === 'text' || node.type === 'code'
        ? node.text
        : node.type === 'break'
          ? '\n'
          : inlineText(node.children),
    )
    .join('');
}

function blocksText(blocks: readonly MarkdownBlock[]): string[] {
  return blocks.flatMap((block): string[] => {
    switch (block.type) {
      case 'paragraph':
      case 'heading':
        return [inlineText(block.children)];
      case 'code':
        return [block.text];
      case 'rule':
        return [];
      case 'quote':
        return blocksText(block.children);
      case 'list':
        return block.items.map((item, index) => {
          const mark = block.ordered ? `${block.start + index}.` : '•';
          const box = item.checked === null ? '' : item.checked ? '☑ ' : '☐ ';
          return `${mark} ${box}${blocksText(item.children).join('\n')}`;
        });
    }
  });
}

/**
 * The words of a text in Markdown, without its marks: for the places that show a note on one
 * line or in a few, and for the names that screen readers read.
 */
export function markdownToPlainText(text: string): string {
  return blocksText(parseMarkdown(text)).join('\n');
}

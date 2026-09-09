import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders Tiptap document JSON.
 *
 * Content is stored as JSON rather than HTML deliberately: there is no
 * dangerouslySetInnerHTML anywhere in this path, so the entire XSS/sanitisation
 * problem does not exist for the web viewer or the PDF renderer. Unknown node
 * types are skipped rather than rendered raw.
 */

type Node = {
  type?: string;
  text?: string;
  content?: Node[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};

function applyMarks(text: string, marks: Node["marks"], key: string): ReactNode {
  if (!marks?.length) return text;

  return marks.reduce<ReactNode>((acc, mark, i) => {
    const k = `${key}-m${i}`;
    switch (mark.type) {
      case "bold":
        return <strong key={k} className="font-semibold text-[var(--doc-fg)]">{acc}</strong>;
      case "italic":
        return <em key={k}>{acc}</em>;
      case "underline":
        return <u key={k}>{acc}</u>;
      case "strike":
        return <s key={k}>{acc}</s>;
      case "code":
        return (
          <code
            key={k}
            className="rounded bg-[var(--doc-bg-inset)] px-1.5 py-0.5 font-mono text-[0.875em] text-[var(--doc-fg)]"
          >
            {acc}
          </code>
        );
      case "link": {
        const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : undefined;
        // Only http(s) and mailto survive. javascript: and data: URLs are dropped.
        const safe = href && /^(https?:|mailto:)/i.test(href) ? href : undefined;
        return safe ? (
          <a
            key={k}
            href={safe}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-medium text-[var(--doc-accent)] underline underline-offset-2"
          >
            {acc}
          </a>
        ) : (
          <span key={k}>{acc}</span>
        );
      }
      default:
        return acc;
    }
  }, text);
}

function renderNode(node: Node, key: string): ReactNode {
  const children = node.content?.map((c, i) => renderNode(c, `${key}-${i}`)) ?? null;

  switch (node.type) {
    case "text":
      return <span key={key}>{applyMarks(node.text ?? "", node.marks, key)}</span>;

    case "paragraph":
      return (
        <p key={key} className="mb-4 leading-[1.75] last:mb-0">
          {children}
        </p>
      );

    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const cls =
        level <= 2
          ? "mt-10 mb-4 text-2xl font-semibold tracking-[-0.015em]"
          : level === 3
            ? "mt-8 mb-3 text-xl font-semibold"
            : "mt-6 mb-2 text-base font-semibold";
      const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"][Math.min(Math.max(level, 1), 6) - 1] ??
        "h3") as "h1";
      return (
        <Tag key={key} className={cn(cls, "text-[var(--doc-fg)] first:mt-0")}>
          {children}
        </Tag>
      );
    }

    // List items are rendered by their parent rather than by a generic
    // `listItem` case, because the marker differs: bullets get a drawn dot,
    // numbered items get the browser's counter. Handling `listItem` generically
    // produced both at once, so ordered items showed "• 1." with the number
    // orphaned on its own line.
    case "bulletList":
      return (
        <ul key={key} className="mb-4 ml-1 space-y-2 last:mb-0">
          {node.content?.map((item, i) => (
            <li key={`${key}-${i}`} className="relative pl-5 leading-[1.7] [&>p]:mb-0">
              <span
                aria-hidden
                className="absolute left-0 top-[0.6em] h-1.5 w-1.5 rounded-full bg-[var(--doc-accent)]"
              />
              {item.content?.map((c, j) => renderNode(c, `${key}-${i}-${j}`))}
            </li>
          ))}
        </ul>
      );

    case "orderedList":
      return (
        <ol
          key={key}
          className="mb-4 ml-5 list-outside list-decimal space-y-2 last:mb-0 marker:font-medium marker:text-[var(--doc-accent)]"
        >
          {node.content?.map((item, i) => (
            <li key={`${key}-${i}`} className="pl-1.5 leading-[1.7] [&>p]:mb-0">
              {item.content?.map((c, j) => renderNode(c, `${key}-${i}-${j}`))}
            </li>
          ))}
        </ol>
      );

    // Reached only for a stray list item outside a list.
    case "listItem":
      return (
        <li key={key} className="leading-[1.7] [&>p]:mb-0">
          {children}
        </li>
      );

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="mb-4 border-l-2 border-[var(--doc-accent)] pl-5 italic text-[var(--doc-fg-muted)] last:mb-0"
        >
          {children}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre
          key={key}
          className="mb-4 overflow-x-auto rounded-xl border border-[var(--doc-border)] bg-[var(--doc-bg-inset)] p-4 font-mono text-sm last:mb-0"
        >
          <code>{children}</code>
        </pre>
      );

    case "horizontalRule":
      return <hr key={key} className="my-8 border-[var(--doc-border)]" />;

    case "hardBreak":
      return <br key={key} />;

    case "doc":
      return <div key={key}>{children}</div>;

    default:
      // Unknown node: render its children if any, never raw markup.
      return children ? <div key={key}>{children}</div> : null;
  }
}

export function RichText({
  doc,
  className,
}: {
  doc: { type: string; content?: unknown[] } | null | undefined;
  className?: string;
}) {
  if (!doc?.content?.length) return null;
  return (
    <div
      className={cn(
        "text-base leading-[1.75] text-[var(--doc-fg-muted)] sm:text-[1.0625rem]",
        className,
      )}
    >
      {(doc.content as Node[]).map((n, i) => renderNode(n, `n${i}`))}
    </div>
  );
}

/** Convenience for plain paragraphs, used by seeds and AI output. */
export function paragraphs(...texts: string[]) {
  return {
    type: "doc" as const,
    content: texts.map((t) => ({
      type: "paragraph",
      content: [{ type: "text", text: t }],
    })),
  };
}

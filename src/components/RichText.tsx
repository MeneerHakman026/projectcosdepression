import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { parseInline, type InlineNode } from "@/lib/cms/rich-text";
import { classifyHref } from "@/lib/cms/urls";

type RichTextProps = {
  /** Inline-formatted text from the CMS (see lib/cms/rich-text.ts). */
  text: string;
  linkClassName?: string;
};

const DEFAULT_LINK_CLASSES = "text-ink underline underline-offset-2 hover:text-accent";

function renderNodes(nodes: InlineNode[], linkClassName: string): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return <Fragment key={index}>{node.value}</Fragment>;
      case "em":
        return <em key={index}>{renderNodes(node.children, linkClassName)}</em>;
      case "strong":
        return <strong key={index}>{renderNodes(node.children, linkClassName)}</strong>;
      case "link": {
        const children = renderNodes(node.children, linkClassName);
        // Re-checked at render time as well as on save: an unsafe href is
        // dropped and its label shown as plain text.
        const kind = classifyHref(node.href);
        if (kind === "internal") {
          return (
            <Link key={index} href={node.href} className={linkClassName}>
              {children}
            </Link>
          );
        }
        if (kind === "external") {
          return (
            <a key={index} href={node.href} target="_blank" rel="noopener noreferrer" className={linkClassName}>
              {children}
            </a>
          );
        }
        if (kind) {
          return (
            <a key={index} href={node.href} className={linkClassName}>
              {children}
            </a>
          );
        }
        return <Fragment key={index}>{children}</Fragment>;
      }
    }
  });
}

/** Renders CMS rich text as React elements — never as raw HTML. */
export default function RichText({ text, linkClassName = DEFAULT_LINK_CLASSES }: RichTextProps) {
  return <>{renderNodes(parseInline(text), linkClassName)}</>;
}

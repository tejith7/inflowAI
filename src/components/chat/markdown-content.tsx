'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
    content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
    return (
        <div className="prose-chat">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="mb-2 mt-4 text-lg font-bold first:mt-0">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="mb-1 mt-2 text-sm font-bold first:mt-0">{children}</h3>
                    ),
                    p: ({ children }) => (
                        <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                        <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                    ),
                    code: ({ className, children, ...props }) => {
                        const isInline = !className;
                        if (isInline) {
                            return (
                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono" {...props}>
                                    {children}
                                </code>
                            );
                        }
                        return (
                            <code
                                className="block overflow-x-auto rounded-lg bg-muted p-3 text-xs font-mono"
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                    pre: ({ children }) => (
                        <pre className="mb-2 overflow-x-auto rounded-lg bg-muted last:mb-0">
                            {children}
                        </pre>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="mb-2 border-l-2 border-primary/50 pl-3 italic text-muted-foreground last:mb-0">
                            {children}
                        </blockquote>
                    ),
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                            {children}
                        </a>
                    ),
                    table: ({ children }) => (
                        <div className="mb-2 overflow-x-auto rounded-lg border border-border last:mb-0">
                            <table className="w-full text-xs">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-muted/50">{children}</thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-3 py-1.5 text-left font-semibold">{children}</th>
                    ),
                    td: ({ children }) => (
                        <td className="border-t border-border px-3 py-1.5">{children}</td>
                    ),
                    hr: () => <hr className="my-3 border-border/50" />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

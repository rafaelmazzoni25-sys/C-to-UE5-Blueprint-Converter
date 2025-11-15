
import React from 'react';

interface GuideDisplayProps {
  guide: string;
}

const parseMarkdownToJsx = (text: string): React.ReactNode => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listType: 'ol' | 'ul' | null = null;
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            if (listType === 'ol') {
                elements.push(<ol key={`list-${elements.length}`} className="list-decimal list-inside pl-4 space-y-2 mb-4">{listItems}</ol>);
            } else {
                elements.push(<ul key={`list-${elements.length}`} className="list-disc list-inside pl-4 space-y-2 mb-4">{listItems}</ul>);
            }
            listItems = [];
            listType = null;
        }
    };

    lines.forEach((line, index) => {
        // Inline code and bold formatting
        const formatLine = (l: string) => {
            const parts = l.split(/(\`.*?\`|\*\*.*?\*\*)/g);
            return parts.map((part, i) => {
                if (part.startsWith('`') && part.endsWith('`')) {
                    return <code key={i} className="bg-slate-700 text-teal-300 rounded px-1 py-0.5 font-mono text-sm">{part.slice(1, -1)}</code>;
                }
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                return part;
            });
        };

        if (line.startsWith('## ')) {
            flushList();
            elements.push(<h2 key={index} className="text-2xl font-bold mt-6 mb-3 border-b border-slate-600 pb-2">{formatLine(line.substring(3))}</h2>);
        } else if (line.startsWith('### ')) {
            flushList();
            elements.push(<h3 key={index} className="text-xl font-semibold mt-4 mb-2">{formatLine(line.substring(4))}</h3>);
        } else if (line.match(/^\d+\.\s/)) {
            if (listType !== 'ol') {
                flushList();
                listType = 'ol';
            }
            listItems.push(<li key={index}>{formatLine(line.replace(/^\d+\.\s/, ''))}</li>);
        } else if (line.startsWith('* ') || line.startsWith('- ')) {
            if (listType !== 'ul') {
                flushList();
                listType = 'ul';
            }
            listItems.push(<li key={index}>{formatLine(line.substring(2))}</li>);
        } else if (line.trim() !== '') {
            flushList();
            elements.push(<p key={index} className="mb-4 leading-relaxed">{formatLine(line)}</p>);
        } else {
             if (listItems.length > 0) flushList();
        }
    });

    flushList(); // Add any remaining list
    return elements;
};


export const GuideDisplay: React.FC<GuideDisplayProps> = ({ guide }) => {
  return (
    <div className="prose-invert prose-slate max-w-none text-slate-300">
      {guide && <div>{parseMarkdownToJsx(guide)}</div>}
    </div>
  );
};

'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface LetterData {
  year: number;
  file_name: string;
  source_url: string;
}

interface CitationParserProps {
  content: string;
}

export default function CitationParser({ content }: CitationParserProps) {
  const [letterUrls, setLetterUrls] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    // Load letters.json on mount
    fetch('/letters.json')
      .then((res) => res.json())
      .then((data: LetterData[]) => {
        const urlMap = new Map<number, string>();
        data.forEach((letter) => {
          // Convert view URL to preview URL for better display
          const fileId = letter.source_url.match(/\/d\/([^\/]+)/)?.[1];
          if (fileId) {
            urlMap.set(letter.year, `https://drive.google.com/file/d/${fileId}/preview`);
          }
        });
        setLetterUrls(urlMap);
      })
      .catch((err) => console.error('Failed to load letters.json:', err));
  }, []);

  // Helper to extract text from React children
  const extractText = (children: any): string => {
    if (typeof children === 'string') {
      return children;
    }
    if (Array.isArray(children)) {
      return children.map(extractText).join('');
    }
    if (children?.props?.children) {
      return extractText(children.props.children);
    }
    return '';
  };

  const parseContentWithCitations = (text: string): React.ReactNode[] => {
    if (!text) return [text];
    
    // Find all year mentions (4-digit numbers between 1977-2024)
    const yearPattern = /\b(19[7-9]\d|20[0-2]\d)\b/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let matchCount = 0;

    while ((match = yearPattern.exec(text)) !== null) {
      const year = parseInt(match[1]);
      const url = letterUrls.get(year);

      // Add text before the year
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add the year (clickable if URL exists)
      if (url) {
        parts.push(
          <a
            key={`citation-${matchCount}-${year}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="citation-link"
            title={`Open ${year} Shareholder Letter`}
          >
            {year}
          </a>
        );
      } else {
        parts.push(year.toString());
      }

      lastIndex = match.index + match[0].length;
      matchCount++;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  // Custom renderer for ReactMarkdown to handle citations
  const components = {
    p: ({ children, ...props }: any) => {
      const text = extractText(children);
      return <p {...props}>{parseContentWithCitations(text)}</p>;
    },
    li: ({ children, ...props }: any) => {
      const text = extractText(children);
      return <li {...props}>{parseContentWithCitations(text)}</li>;
    },
    // Handle other elements that might contain years
    h1: ({ children, ...props }: any) => {
      const text = extractText(children);
      return <h1 {...props}>{parseContentWithCitations(text)}</h1>;
    },
    h2: ({ children, ...props }: any) => {
      const text = extractText(children);
      return <h2 {...props}>{parseContentWithCitations(text)}</h2>;
    },
    h3: ({ children, ...props }: any) => {
      const text = extractText(children);
      return <h3 {...props}>{parseContentWithCitations(text)}</h3>;
    },
    strong: ({ children, ...props }: any) => {
      const text = extractText(children);
      return <strong {...props}>{parseContentWithCitations(text)}</strong>;
    },
    em: ({ children, ...props }: any) => {
      const text = extractText(children);
      return <em {...props}>{parseContentWithCitations(text)}</em>;
    },
  };

  return (
    <div className="citation-content">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
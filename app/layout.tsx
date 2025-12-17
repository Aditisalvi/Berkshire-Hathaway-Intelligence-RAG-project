import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Berkshire Hathaway Intelligence | RAG Assistant',
  description: 'AI-powered assistant for exploring Warren Buffett\'s investment philosophy through Berkshire Hathaway shareholder letters',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

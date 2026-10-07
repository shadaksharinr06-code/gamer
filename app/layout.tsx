import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocuDual RAG - Document Q&A with Dual Responses',
  description:
    'Interactive Document Q&A (RAG) providing strictly grounded document answers with citations alongside supplemental world knowledge.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}

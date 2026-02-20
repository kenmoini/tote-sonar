import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tote Sonar',
  description: 'Track items stored in physical containers with QR code labels',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

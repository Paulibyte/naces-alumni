import './globals.css';

export const metadata = {
  title: 'NACES Alumni — ND 2005 / HND 2008, FEDPONEK',
  description: 'Members portal for the NACES ND 2005 and HND 2008 sets of Federal Polytechnic Nekede, Owerri',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f5132' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

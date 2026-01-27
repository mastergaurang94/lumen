import './globals.css';

export const metadata = {
  title: 'Lumen',
  description: 'Weekly coaching that builds self-trust',
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

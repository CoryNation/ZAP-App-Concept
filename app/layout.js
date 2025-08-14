import ClientThemeProvider from './ClientThemeProvider';

export const metadata = { title: 'ZAP App' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientThemeProvider>{children}</ClientThemeProvider>
      </body>
    </html>
  );
}

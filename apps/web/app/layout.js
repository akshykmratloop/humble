import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const metadata = {
  title: 'Humble',
  description: 'You both thought you were too good for each other. Now you have to meet.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="app-shell-root bg-surface font-sans text-ink antialiased dark:bg-ink dark:text-surface">
        {children}
      </body>
    </html>
  );
}

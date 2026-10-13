import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Boombox Atelier — Anime Radio Workshop', description: 'Build a boombox, make a mixtape, and play your private cassette library.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

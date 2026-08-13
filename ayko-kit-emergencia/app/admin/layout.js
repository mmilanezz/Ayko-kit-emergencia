"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/kits", label: "Kits & Itens" },
  { href: "/admin/duplas", label: "Duplas & Usuários" },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-border px-4 py-6 shrink-0">
        <p className="text-xs font-mono uppercase tracking-widest text-purple mb-6 px-2">
          AYKO Admin
        </p>
        <nav className="space-y-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                pathname === link.href
                  ? "bg-purple/15 text-purple"
                  : "text-slate-400 hover:text-slate-100 hover:bg-cardhover"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}

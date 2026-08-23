"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/tecnicos", label: "Usuários" },
  { href: "/admin/kits", label: "Kits & Itens" },
  { href: "/admin/duplas", label: "Duplas" },
  { href: "/admin/veiculos", label: "Veículos" },
  { href: "/admin/relatorios", label: "Relatórios" },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      {/* barra superior só no celular, com botão de menu */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border no-print">
        <p className="text-xs font-mono uppercase tracking-widest text-purple">AYKO Admin</p>
        <button
          onClick={() => setMenuAberto(true)}
          className="text-slate-300 border border-border rounded-lg px-3 py-1.5 text-sm"
        >
          Menu
        </button>
      </div>

      {/* fundo escurecido atrás do menu, só no celular */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside
        className={`no-print fixed md:static z-50 top-0 left-0 h-full w-64 md:w-56 border-r border-border px-4 py-6 shrink-0 bg-bg transition-transform duration-200 ${
          menuAberto ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between mb-6 px-2">
          <p className="text-xs font-mono uppercase tracking-widest text-purple">AYKO Admin</p>
          <button
            className="md:hidden text-slate-400 text-lg leading-none"
            onClick={() => setMenuAberto(false)}
          >
            ✕
          </button>
        </div>
        <nav className="space-y-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuAberto(false)}
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

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

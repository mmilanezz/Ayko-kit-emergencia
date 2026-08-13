import "./globals.css";

export const metadata = {
  title: "AYKO · Kit Emergência",
  description: "Controle de conferência do kit emergência por dupla",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-bg text-slate-100 font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}

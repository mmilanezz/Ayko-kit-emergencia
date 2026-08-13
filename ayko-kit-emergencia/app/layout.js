import "./globals.css";
import RegisterSW from "../components/RegisterSW";

export const metadata = {
  title: "AYKO · Kit Emergência",
  description: "Controle de conferência do kit emergência por dupla",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AYKO Kit",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#080b12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-bg text-slate-100 font-sans min-h-screen">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}

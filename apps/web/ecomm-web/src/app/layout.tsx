import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { CartSidebar } from "../components/CartSidebar";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nex Luxury Audio",
  description: "Experience the future of sound.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <CartSidebar />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </div>
        </AppProvider>
      </body>
    </html>
  );
}

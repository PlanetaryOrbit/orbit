import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/nav/ThemeToggler";
import AppProviders from "../providers/AppProviders";

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
  }) {
  return (
      <div className="min-h-screen overflow-hidden bg-ctp-crust">
        <header
          className="
            mx-auto
            flex
            h-16
            max-w-7xl
            items-center
            justify-between
            px-6
          "
        >
          <Link href="/">
            <Image
              src="/planetary.png"
              alt="Orbit"
              width={125}
              height={60}
              className="h-auto w-auto"
              priority
            />
          </Link>

          <ThemeToggle />
        </header>

        {children}
      </div>
  );
}

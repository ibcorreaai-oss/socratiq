import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 font-display text-lg tracking-wide">
        <Image src="/logo-mark.png" alt="" width={32} height={32} className="rounded-lg" />
        Socratiq
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

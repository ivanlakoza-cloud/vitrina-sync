"use client";
import { useRouter } from "next/navigation";
export default function BackButton() {
  const r = useRouter();
  return (
    <button onClick={() => r.back()} className="inline-flex items-center gap-2 text-neutral-600 hover:text-black">
      <span className="text-xl">←</span> Назад
    </button>
  );
}

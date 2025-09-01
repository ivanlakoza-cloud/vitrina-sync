
"use client";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const r = useRouter();
  return (
    <button
      onClick={() => r.back()}
      className="rounded-xl px-3 py-2 hover:bg-gray-100 border"
    >
      ← Назад
    </button>
  );
}

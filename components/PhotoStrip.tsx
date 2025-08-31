"use client";
import { useState } from "react";
export default function PhotoStrip({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState(false); if (!urls || urls.length===0) return null;
  return (<>
    <div className="flex gap-4 overflow-x-auto pb-2">
      {urls.map((u,i)=>(<img key={i} src={u} alt={`Фото ${i+1}`} className="h-40 w-64 object-cover rounded-xl border cursor-pointer" onClick={()=>setOpen(true)} />))}
    </div>
    {open && (<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={()=>setOpen(false)}>
      <div className="max-w-5xl w-full"><div className="flex gap-4 overflow-x-auto">
        {urls.map((u,i)=>(<img key={i} src={u} alt={`Фото ${i+1}`} className="h-[70vh] object-contain rounded-xl" />))}
      </div></div></div>)}
  </>);
}
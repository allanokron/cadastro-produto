"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
export function SyncButton(){const [loading,setLoading]=useState(false);const router=useRouter();async function run(){setLoading(true);const r=await fetch("/api/sync-runs",{method:"POST"});const d=await r.json();if(!r.ok)alert(d.error);else alert("Atualização iniciada. Acompanhe o progresso no Dashboard.");setLoading(false);router.refresh()}return <button className="btn btn-primary" onClick={run} disabled={loading}><RefreshCw size={16} className={loading?"animate-spin":""}/>{loading?"Iniciando…":"Atualizar dados"}</button>}

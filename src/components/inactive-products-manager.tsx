"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Upload } from "lucide-react";

type Item = { id: string; skuKey: string; exclusionReason: string | null; excludedAt: string | null };

export function InactiveProductsManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() { const response = await fetch("/api/inactive-products"); const data = await response.json(); setItems(data.items ?? []); setLoading(false); }
  useEffect(() => { fetch("/api/inactive-products").then((response) => response.json()).then((data) => setItems(data.items ?? [])).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => items.filter((item) => item.skuKey.includes(search.trim().toUpperCase())), [items, search]);
  async function upload(file: File) {
    setMessage("Importando planilha…");
    const form = new FormData(); form.set("file", file);
    const response = await fetch("/api/inactive-products/import", { method: "POST", body: form });
    const data = await response.json(); setMessage(response.ok ? `${data.imported} SKUs adicionados aos inativos.` : data.error); if (response.ok) await load();
  }
  async function reactivate(skuKey: string) {
    const response = await fetch("/api/inactive-products", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ skuKey }) });
    const data = await response.json(); setMessage(response.ok ? `${skuKey} voltou para a análise.` : data.error); if (response.ok) setItems((current) => current.filter((item) => item.skuKey !== skuKey));
  }
  return <div className="space-y-4">
    <div className="card flex flex-col gap-4 md:flex-row md:items-end">
      <div className="flex-1"><label className="label">Buscar SKU inativo</label><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite o SKU" /></div>
      <label className="btn btn-primary cursor-pointer"><Upload size={16} />Importar XLSX ou CSV<input className="hidden" type="file" accept=".xlsx,.csv" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} /></label>
    </div>
    {message && <p className="rounded-xl bg-[#e7f8f8] p-3 text-sm font-semibold text-[#147f81]">{message}</p>}
    <div className="table-wrap"><table><thead><tr><th>SKU</th><th>Motivo</th><th>Data</th><th></th></tr></thead><tbody>{loading ? <tr><td colSpan={4}>Carregando…</td></tr> : visible.length ? visible.map((item) => <tr key={item.id}><td className="font-bold">{item.skuKey}</td><td>{item.exclusionReason ?? "Não cadastrar no Tiny"}</td><td>{item.excludedAt ? new Date(item.excludedAt).toLocaleString("pt-BR") : "—"}</td><td><button className="btn btn-secondary" onClick={() => reactivate(item.skuKey)}><RotateCcw size={15} />Voltar para análise</button></td></tr>) : <tr><td colSpan={4} className="py-10 text-center text-gray-500">Nenhum item inativo.</td></tr>}</tbody></table></div>
  </div>;
}

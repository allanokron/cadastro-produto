"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Search, X, Trash2, FileImage, FileText, Upload, Settings } from "lucide-react";
import {
  buildA4Html,
  buildInstagramHtml,
  chunkItems,
  type VendorConfig,
} from "@/lib/promo-render";

type Product = {
  sku: string;
  skuKey: string;
  name: string;
  brand: string | null;
  stock: string | null;
  price: string | null;
  firstImageUrl: string | null;
};

type SelectedProduct = Product & { promoPrice: string; minQty: string };

function toPromoItem(item: SelectedProduct) {
  return {
    skuKey: item.skuKey,
    sku: item.sku,
    name: item.name,
    stock: item.stock,
    firstImageUrl: item.firstImageUrl,
    promoPrice: item.promoPrice,
    minQty: item.minQty,
  };
}

const VENDOR_KEY = "promo_vendor_config";

function loadVendorConfig(): VendorConfig {
  if (typeof window === "undefined")
    return { logoDataUrl: "", whatsapp: "", phone: "", message: "", businessName: "" };
  try {
    const raw = localStorage.getItem(VENDOR_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { logoDataUrl: "", whatsapp: "", phone: "", message: "", businessName: "" };
}

function saveVendorConfig(config: VendorConfig) {
  localStorage.setItem(VENDOR_KEY, JSON.stringify(config));
}

export function PromoGenerator() {
  const [vendor, setVendor] = useState<VendorConfig>(loadVendorConfig);
  const [showConfig, setShowConfig] = useState(false);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<SelectedProduct[]>([]);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("");

  const renderRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/promo-products?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.items ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const searchRef = useRef(search);
  useEffect(() => { searchRef.current = search; });

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        await fetch("/api/image-checks", { method: "POST", headers: { "content-type": "application/json" } });
        if (active && searchRef.current.trim()) {
          const res = await fetch(`/api/promo-products?search=${encodeURIComponent(searchRef.current)}`);
          const data = await res.json();
          setResults(data.items ?? []);
        }
      } catch {}
    };
    void check();
    const timer = setInterval(() => void check(), 60000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  function onSearchChange(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(value), 300);
  }

  function addProduct(product: Product) {
    if (selected.some((p) => p.skuKey === product.skuKey)) return;
    setSelected((prev) => [
      ...prev,
      { ...product, promoPrice: product.price ?? "", minQty: "" },
    ]);
    setSearch("");
    setResults([]);
  }

  function removeProduct(skuKey: string) {
    setSelected((prev) => prev.filter((p) => p.skuKey !== skuKey));
  }

  function updateField(skuKey: string, field: "promoPrice" | "minQty", value: string) {
    setSelected((prev) =>
      prev.map((p) => (p.skuKey === skuKey ? { ...p, [field]: value } : p))
    );
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updated = { ...vendor, logoDataUrl: dataUrl };
      setVendor(updated);
      saveVendorConfig(updated);
    };
    reader.readAsDataURL(file);
  }

  function updateVendorField(field: keyof VendorConfig, value: string) {
    const updated = { ...vendor, [field]: value };
    setVendor(updated);
    saveVendorConfig(updated);
  }

  async function generateOutput(format: "pdf-a4" | "image-ig") {
    if (!selected.length || !renderRef.current) return;
    setGenerating(true);
    setToast("");

    try {
      const container = renderRef.current;
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.zIndex = "-1";
      container.style.background = "white";

      const promoItems = selected.map(toPromoItem);
      const canvasOpts = {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: "#ffffff",
        imageTimeout: 15000,
        logging: false,
      };

      if (format === "image-ig") {
        container.innerHTML = buildInstagramHtml(promoItems, vendor);
        const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
          ...canvasOpts,
          width: 1080,
          height: 1080,
        });
        const link = document.createElement("a");
        link.download = `promocao-instagram-${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setToast("Imagem Instagram gerada!");
      } else {
        const pages = chunkItems(promoItems, 6);
        const allPageDivs: HTMLElement[] = [];
        container.innerHTML = buildA4Html(pages, vendor);
        const pageEls = container.querySelectorAll(":scope > div");
        pageEls.forEach((el) => allPageDivs.push(el as HTMLElement));

        const pdf = new jsPDF("p", "mm", "a4");
        for (let i = 0; i < allPageDivs.length; i++) {
          const canvas = await html2canvas(allPageDivs[i], {
            ...canvasOpts,
            width: 794,
            height: 1123,
          });
          if (i > 0) pdf.addPage();
          const imgData = canvas.toDataURL("image/jpeg", 0.92);
          pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        }
        pdf.save(`promocao-a4-${Date.now()}.pdf`);
        setToast(`PDF gerado com ${pages.length} página(s)!`);
      }

      container.innerHTML = "";
    } catch (err) {
      setToast("Erro ao gerar: " + (err instanceof Error ? err.message : "desconhecido"));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <div ref={renderRef} />

      {toast && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-[#e7f8f8] p-3 text-sm font-semibold text-[#147f81]">
          <span>{toast}</span>
          <button onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="card mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-700">Configuração do vendedor</h3>
          <button
            className="btn btn-secondary"
            onClick={() => setShowConfig(!showConfig)}
          >
            <Settings size={16} />
            {showConfig ? "Fechar" : "Configurar"}
          </button>
        </div>

        {showConfig && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Logo da empresa</label>
              <div className="flex items-center gap-3">
                <label className="btn btn-secondary cursor-pointer">
                  <Upload size={16} />
                  {vendor.logoDataUrl ? "Trocar logo" : "Enviar logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
                {vendor.logoDataUrl && (
                  <div className="relative">
                    <img
                      src={vendor.logoDataUrl}
                      alt="Logo"
                      className="h-14 w-auto rounded border bg-white object-contain p-1"
                    />
                    <button
                      className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow"
                      onClick={() => updateVendorField("logoDataUrl", "")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="label">Nome do negócio</label>
              <input
                className="input"
                value={vendor.businessName}
                onChange={(e) => updateVendorField("businessName", e.target.value)}
                placeholder="Minha Loja"
              />
            </div>
            <div>
              <label className="label">WhatsApp</label>
              <input
                className="input"
                value={vendor.whatsapp}
                onChange={(e) => updateVendorField("whatsapp", e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input
                className="input"
                value={vendor.phone}
                onChange={(e) => updateVendorField("phone", e.target.value)}
                placeholder="(11) 3333-3333"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Mensagem personalizada</label>
              <input
                className="input"
                value={vendor.message}
                onChange={(e) => updateVendorField("message", e.target.value)}
                placeholder="Promoção válida até 31/12/2026"
              />
            </div>
          </div>
        )}
      </div>

      <div className="card mb-6">
        <h3 className="mb-3 font-bold text-gray-700">Buscar e adicionar produtos</h3>
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 focus-within:border-[#1fadad] focus-within:shadow-[0_0_0_3px_rgba(31,173,173,0.14)]">
          <Search size={16} className="shrink-0 text-gray-400" />
          <input
            className="w-full border-0 bg-transparent py-2.5 text-sm outline-none"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome, SKU ou EAN..."
          />
          {searching && (
            <span className="shrink-0 text-xs text-gray-400">
              Buscando...
            </span>
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-[#dfe4e8]">
            {results.map((product) => (
              <button
                key={product.skuKey}
                className="flex w-full items-center gap-3 border-b border-gray-100 p-3 text-left transition hover:bg-[#e7f8f8]/50 last:border-0"
                onClick={() => addProduct(product)}
                disabled={selected.some((p) => p.skuKey === product.skuKey)}
              >
                {product.firstImageUrl ? (
                  <img
                    src={product.firstImageUrl}
                    alt=""
                    className="h-10 w-10 rounded border bg-white object-contain"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded border bg-gray-100 text-xs text-gray-400">
                    ?
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    {product.sku}
                    {product.brand ? ` • ${product.brand}` : ""}
                  </p>
                </div>
                {selected.some((p) => p.skuKey === product.skuKey) && (
                  <span className="badge badge-green">Adicionado</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="card mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-gray-700">
              Produtos selecionados ({selected.length})
            </h3>
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                onClick={() => generateOutput("pdf-a4")}
                disabled={generating}
              >
                <FileText size={16} />
                {generating ? "Gerando..." : "Gerar PDF A4"}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => generateOutput("image-ig")}
                disabled={generating}
              >
                <FileImage size={16} />
                {generating ? "Gerando..." : "Gerar Imagem IG"}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Foto</th>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Preço promocional</th>
                  <th>Qtd mínima</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((item) => (
                  <tr key={item.skuKey}>
                    <td>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeProduct(item.skuKey)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                    <td>
                      {item.firstImageUrl ? (
                        <img
                          src={item.firstImageUrl}
                          alt=""
                          className="h-12 w-12 rounded border bg-white object-contain"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">Sem foto</span>
                      )}
                    </td>
                    <td className="font-semibold">{item.name}</td>
                    <td className="text-sm text-gray-500">{item.sku}</td>
                    <td>
                      <input
                        className="input w-32"
                        value={item.promoPrice}
                        onChange={(e) =>
                          updateField(item.skuKey, "promoPrice", e.target.value)
                        }
                        placeholder="Ex: 29.90"
                      />
                    </td>
                    <td>
                      <input
                        className="input w-24"
                        value={item.minQty}
                        onChange={(e) =>
                          updateField(item.skuKey, "minQty", e.target.value)
                        }
                        placeholder="Opcional"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected.length === 0 && (
        <div className="card py-16 text-center text-gray-400">
          <FileImage size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">Nenhum produto selecionado</p>
          <p className="mt-1 text-sm">
            Busque produtos acima para adicionar à promoção.
          </p>
        </div>
      )}
    </>
  );
}

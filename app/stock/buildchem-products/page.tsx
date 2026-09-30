"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { toast } from "sonner";
import {
  Loader2, Search, X, RefreshCw, Package,
  Plus, Pencil, Trash2, Image as ImageIcon,
} from "lucide-react";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import ProtectedPageWrapper from "@/components/protected-page-wrapper";
import type { BuildChemProduct } from "@/app/api/stock/buildchem-products/route";

const C: {
  bg: string;
  panel: string;
  border: string;
  muted: string;
  dim: string;
  text: string;
  accent: string;
  font: string;
} = {
  bg:     "#080d12",
  panel:  "#0d1117",
  border: "#1a2535",
  muted:  "#253040",
  dim:    "#4a6070",
  text:   "#c8d8e8",
  accent: "#e8630a",
  font:   "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

const PAGE_SIZE = 20;

// ─── Product Form Dialog ───────────────────────────────────────────────────────
function ProductDialog({
  product,
  onClose,
  onSave,
}: {
  product: BuildChemProduct | null;
  onClose: () => void;
  onSave: (data: Partial<BuildChemProduct>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    product_name: product?.product_name ?? "",
    product_code: product?.product_code ?? "",
    product_description: product?.product_description ?? "",
    product_image: product?.product_image ?? "",
    product_type: product?.product_type ?? "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        product_name: formData.product_name || null,
        product_code: formData.product_code || null,
        product_description: formData.product_description || null,
        product_image: formData.product_image || null,
        product_type: formData.product_type || null,
      };
      await onSave(dataToSave);
      onClose();
      toast.success(product ? "Product updated successfully" : "Product created successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg border flex flex-col"
        style={{ backgroundColor: C.panel, borderColor: C.border, fontFamily: C.font, maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: C.border, backgroundColor: C.bg }}>
          <p className="text-[13px] font-bold" style={{ color: C.accent }}>
            {product ? "Edit Product" : "New Product"}
          </p>
          <button onClick={onClose}><X className="size-5" style={{ color: C.dim }} /></button>
        </div>

        {/* Form */}
        <form id="product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.accent }}>
              Product Name
            </label>
            <input
              type="text"
              value={formData.product_name}
              onChange={e => setFormData({ ...formData, product_name: e.target.value as string })}
              className="w-full h-9 text-[11px] px-3 focus:outline-none"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: C.font }}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.accent }}>
              Product Code
            </label>
            <input
              type="text"
              value={formData.product_code}
              onChange={e => setFormData({ ...formData, product_code: e.target.value as string })}
              className="w-full h-9 text-[11px] px-3 focus:outline-none"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: C.font }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.accent }}>
              Product Type
            </label>
            <input
              type="text"
              value={formData.product_type}
              onChange={e => setFormData({ ...formData, product_type: e.target.value as string })}
              className="w-full h-9 text-[11px] px-3 focus:outline-none"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: C.font }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.accent }}>
              Product Description
            </label>
            <textarea
              value={formData.product_description}
              onChange={e => setFormData({ ...formData, product_description: e.target.value as string })}
              className="w-full h-24 text-[11px] px-3 py-2 focus:outline-none resize-none"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: C.font }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.accent }}>
              Product Image URL
            </label>
            <input
              type="text"
              value={formData.product_image}
              onChange={e => setFormData({ ...formData, product_image: e.target.value as string })}
              className="w-full h-9 text-[11px] px-3 focus:outline-none"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text, fontFamily: C.font }}
              placeholder="https://..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0"
          style={{ borderColor: C.border, backgroundColor: C.bg }}>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider border transition-colors"
            style={{ borderColor: C.border, color: C.dim, backgroundColor: "transparent" }}>
            Cancel
          </button>
          <button
            type="submit"
                        form="product-form"
            disabled={loading}
            className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider border transition-colors disabled:opacity-50"
            style={{ borderColor: C.accent, color: C.accent, backgroundColor: "rgba(232,99,10,0.1)" }}>
            {loading ? <Loader2 className="size-3 animate-spin" /> : product ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BuildChemProductsPage() {
  const router = useRouter();

  const [products,    setProducts]    = useState<BuildChemProduct[]>([]);
  const [filtered,    setFiltered]    = useState<BuildChemProduct[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("");
  const [page,        setPage]        = useState(1);
  const [dialogProduct, setDialogProduct] = useState<BuildChemProduct | null>(null);
const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId,    setDeleteId]    = useState<number | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/stock/buildchem-products", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setProducts(json.data ?? []);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    let r = [...products];
    if (typeFilter) r = r.filter(p => p.product_type?.toLowerCase() === typeFilter.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(p =>
        p.product_name?.toLowerCase().includes(q) ||
        p.product_code?.toLowerCase().includes(q) ||
        p.product_description?.toLowerCase().includes(q)
      );
    }
    setFiltered(r); setPage(1);
  }, [products, search, typeFilter]);

  const allTypes = [...new Set(products.map(p => p.product_type).filter((t): t is string => !!t))].sort();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (data: Partial<BuildChemProduct>) => {
    const url = "/api/stock/buildchem-products";
    const method = dialogProduct ? "PATCH" : "POST";
    const body = dialogProduct ? { id: dialogProduct.id, ...data } : data;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchProducts();
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/stock/buildchem-products?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchProducts();
    toast.success("Product deleted successfully");
  };

  return (
    <ProtectedPageWrapper>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-svh overflow-hidden bg-[#080d12]" style={{ fontFamily: C.font, color: C.text }}>
          <div className="fixed inset-0 pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle, #1a2535 1px, transparent 1px)`,
            backgroundSize: "24px 24px", opacity: 0.15, zIndex: 0,
          }} />

          {/* ── Header ── */}
          <header className="relative z-10 flex h-11 shrink-0 items-center gap-2 px-4 border-b bg-[#080d12]" style={{ borderColor: C.border }}>
            <SidebarTrigger className="-ml-1 hover:bg-transparent" style={{ color: C.dim }} />
            <div className="w-px h-4" style={{ backgroundColor: C.border }} />
            <button onClick={() => router.push("/dashboard")}
              className="hidden sm:flex h-7 px-2 text-[10px] uppercase tracking-widest"
              style={{ color: C.dim, background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
              onMouseLeave={e => (e.currentTarget.style.color = C.dim)}>Home</button>
            <div className="w-px h-4 hidden sm:block" style={{ backgroundColor: C.border }} />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/stock/suppliers" className="text-[10px] uppercase tracking-widest hidden sm:block" style={{ color: C.dim }}>Stock</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" style={{ color: C.muted }} />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[10px] uppercase tracking-widest font-bold" style={{ color: C.accent }}>BuildChem Products</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider hidden sm:block" style={{ color: C.dim }}>Supabase</span>
            </div>
          </header>

          {/* ── Title bar ── */}
          <div className="relative z-10 shrink-0 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: C.border, backgroundColor: C.panel }}>
            <div className="flex h-8 w-8 items-center justify-center border" style={{ borderColor: C.border, backgroundColor: "#0f1923" }}>
              <Package className="size-4" style={{ color: C.accent }} />
            </div>
            <div>
              <h1 className="text-xs font-bold uppercase tracking-widest" style={{ color: C.accent }}>BuildChem Products</h1>
              <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: C.muted }}>
                Supabase · products · {products.length} total
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => { setDialogProduct(null); setDialogOpen(true); }}
                className="flex items-center gap-1.5 h-7 px-3 text-[10px] font-bold uppercase tracking-wider border transition-colors"
                style={{ borderColor: C.accent, color: C.accent, backgroundColor: "rgba(232,99,10,0.1)" }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(232,99,10,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(232,99,10,0.1)"; }}>
                <Plus className="size-3" /> New Product
              </button>
              <button onClick={fetchProducts}
                className="flex items-center gap-1.5 h-7 px-3 text-[10px] font-bold uppercase tracking-wider border transition-colors"
                style={{ borderColor: C.border, color: C.dim, backgroundColor: "transparent" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}>
                <RefreshCw className="size-3" /> Refresh
              </button>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="relative z-10 shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-b" style={{ borderColor: C.border, backgroundColor: C.bg }}>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3" style={{ color: C.dim }} />
              <input placeholder="Search name, code, description…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 h-8 text-[11px] focus:outline-none"
                style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, color: C.text, fontFamily: C.font }}
                onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={e  => (e.currentTarget.style.borderColor = C.border as string)} />
              {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="size-3" style={{ color: C.dim }} /></button>}
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="h-8 text-[11px] px-2 focus:outline-none"
              style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, color: typeFilter ? C.text : C.dim, fontFamily: C.font }}>
              <option value="">All Types</option>
              {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {typeFilter && (
              <button onClick={() => setTypeFilter("")}
                className="flex items-center gap-1 h-8 px-2 text-[10px] transition-colors" style={{ color: C.dim }}
                onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={e => (e.currentTarget.style.color = C.dim)}>
                <X className="size-3" /> Clear
              </button>
            )}
            <div className="ml-auto text-[10px]" style={{ color: C.muted }}>
              <span style={{ color: C.text }}>{filtered.length}</span> products
            </div>
          </div>

          {/* ── Table ── */}
          <div className="relative z-10 flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full gap-3">
                <Loader2 className="size-4 animate-spin" style={{ color: C.accent }} />
                <span className="text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>Loading from Supabase…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
                <Package className="size-8 opacity-20" style={{ color: "#f87171" }} />
                <p className="text-[11px] font-bold" style={{ color: "#f87171" }}>{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Package className="size-8 opacity-20" style={{ color: C.accent }} />
                <p className="text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>No products found</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr style={{ backgroundColor: C.panel, borderBottom: `1px solid ${C.border}` }}>
                    {["Image", "Product Name", "Code", "Type", "Description", "Created", "Actions"].map((h, i) => (
                      <th key={i} className="text-left px-4 py-2.5 whitespace-nowrap text-[9px] font-bold uppercase tracking-widest"
                        style={{ color: C.accent, borderRight: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, i) => (
                    <tr key={p.id} className="border-b transition-colors"
                      style={{ borderColor: (C.muted + "30") as string, backgroundColor: i % 2 === 0 ? C.bg : C.panel }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(232,99,10,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? C.bg : C.panel)}>

                      {/* Image */}
                      <td className="px-3 py-2.5" style={{ borderRight: `1px solid ${C.border}`, width: "56px" }}>
                        {p.product_image ? (
                          <img src={p.product_image} alt={p.product_name ?? ""}
                            className="h-10 w-10 object-contain border"
                            style={{ borderColor: C.border }}
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="h-10 w-10 flex items-center justify-center border"
                            style={{ borderColor: C.border }}>
                            <ImageIcon className="size-4 opacity-20" style={{ color: C.dim }} />
                          </div>
                        )}
                      </td>

                      {/* Product Name */}
                      <td className="px-4 py-2.5" style={{ borderRight: `1px solid ${C.border}`, minWidth: "200px" }}>
                        <span className="text-[11px] font-bold" style={{ color: C.text }}>
                          {p.product_name || "—"}
                        </span>
                      </td>

                      {/* Code */}
                      <td className="px-4 py-2.5 whitespace-nowrap" style={{ borderRight: `1px solid ${C.border}` }}>
                        <span className="text-[10px] font-mono" style={{ color: C.muted }}>{p.product_code || "—"}</span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-2.5 whitespace-nowrap" style={{ borderRight: `1px solid ${C.border}` }}>
                        {p.product_type ? (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 border"
                            style={{ borderColor: "#60a5fa40", color: "#60a5fa", backgroundColor: "rgba(96,165,250,0.08)" }}>
                            {p.product_type}
                          </span>
                        ) : <span style={{ color: C.muted }}>—</span>}
                      </td>

                      {/* Description */}
                      <td className="px-4 py-2.5 max-w-[200px]" style={{ borderRight: `1px solid ${C.border}` }}>
                        <span className="text-[10px] truncate block" style={{ color: C.dim }}>
                          {p.product_description || "—"}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-2.5 whitespace-nowrap" style={{ borderRight: `1px solid ${C.border}` }}>
                        <span className="text-[9px] font-mono" style={{ color: C.muted }}>{formatDate(p.created_at)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setDialogProduct(p); setDialogOpen(true); }}
                            className="h-7 w-7 flex items-center justify-center border transition-colors"
                            style={{ borderColor: C.border, color: C.dim, backgroundColor: "transparent" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}>
                            <Pencil className="size-3" />
                          </button>
                          <button
                            onClick={() => setDeleteId(p.id)}
                            className="h-7 w-7 flex items-center justify-center border transition-colors"
                            style={{ borderColor: C.border, color: C.dim, backgroundColor: "transparent" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#f87171"; e.currentTarget.style.color = "#f87171"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}>
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Pagination ── */}
          {filtered.length > PAGE_SIZE && (
            <div className="relative z-10 shrink-0 flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: C.border, backgroundColor: C.panel }}>
              <span className="text-[10px]" style={{ color: C.muted }}>
                Page <span style={{ color: C.text }}>{page}</span> of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="h-7 px-3 text-[10px] border transition-colors disabled:opacity-30"
                  style={{ borderColor: C.border, color: C.dim, backgroundColor: "transparent" }}>← Prev</button>
                <span className="text-[10px] font-mono px-2" style={{ color: C.muted }}>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="h-7 px-3 text-[10px] border transition-colors disabled:opacity-30"
                  style={{ borderColor: C.border, color: C.dim, backgroundColor: "transparent" }}>Next →</button>
              </div>
            </div>
          )}
        </SidebarInset>
      </SidebarProvider>

      {/* ── Product Form Dialog ── */}
      {dialogOpen && (
        <ProductDialog
          product={dialogProduct}
          onClose={() => { setDialogOpen(false); setDialogProduct(null); }}
          onSave={handleSave}
        />
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null); }}>
          <div className="w-full max-w-sm border flex flex-col"
            style={{ backgroundColor: C.panel, borderColor: C.border, fontFamily: C.font }}>
            <div className="px-5 py-4">
              <p className="text-[11px] font-bold mb-2" style={{ color: C.accent }}>Delete Product</p>
              <p className="text-[10px]" style={{ color: C.dim }}>Are you sure you want to delete this product? This action cannot be undone.</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: C.border, backgroundColor: C.bg }}>
              <button
                onClick={() => setDeleteId(null)}
                className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider border transition-colors"
                style={{ borderColor: C.border, color: C.dim, backgroundColor: "transparent" }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(deleteId);
                  setDeleteId(null);
                }}
                className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider border transition-colors"
                style={{ borderColor: "#f87171", color: "#f87171", backgroundColor: "rgba(248,113,113,0.1)" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedPageWrapper>
  );
}

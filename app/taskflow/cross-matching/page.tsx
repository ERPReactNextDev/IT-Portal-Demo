"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { PageShell } from "@/components/page-shell";
import ProtectedPageWrapper from "@/components/protected-page-wrapper";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectGroup,
  SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  GitCompare, Search, RefreshCw, Loader2,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  Download, ExternalLink, UserPlus,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchStatus =
  | "MATCH"
  | "TSM_MISMATCH"
  | "MANAGER_MISMATCH"
  | "BOTH_MISMATCH"
  | "NO_MASTER";

interface CrossMatchRow {
  id: string | number;
  referenceId: string;
  companyName: string;
  activityDate: string;
  activityType: string;
  correctTsm: string;
  correctManager: string;
  currentTsm: string;
  currentManager: string;
  matchStatus: MatchStatus;
}

interface Summary {
  total: number;
  matched: number;
  mismatch: number;
  noMaster: number;
}

type StatusFilter = "ALL" | "MISMATCH" | "MATCH" | "NO_MASTER";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROWS_PER_PAGE = 20;

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusBadge(status: MatchStatus) {
  switch (status) {
    case "MATCH":
      return (
        <Badge className="gap-1 rounded-none text-[10px] px-2 py-0.5 font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="size-3" /> MATCH
        </Badge>
      );
    case "TSM_MISMATCH":
      return (
        <Badge className="gap-1 rounded-none text-[10px] px-2 py-0.5 font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="size-3" /> TSM MISMATCH
        </Badge>
      );
    case "MANAGER_MISMATCH":
      return (
        <Badge className="gap-1 rounded-none text-[10px] px-2 py-0.5 font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="size-3" /> MGR MISMATCH
        </Badge>
      );
    case "BOTH_MISMATCH":
      return (
        <Badge className="gap-1 rounded-none text-[10px] px-2 py-0.5 font-mono bg-red-500/10 text-red-400 border border-red-500/30">
          <XCircle className="size-3" /> BOTH MISMATCH
        </Badge>
      );
    case "NO_MASTER":
      return (
        <Badge className="gap-1 rounded-none text-[10px] px-2 py-0.5 font-mono bg-slate-500/10 text-slate-400 border border-slate-500/30">
          <HelpCircle className="size-3" /> NO MASTER DATA
        </Badge>
      );
  }
}

function rowClass(status: MatchStatus) {
  switch (status) {
    case "MATCH":          return "hover:bg-emerald-500/5";
    case "TSM_MISMATCH":
    case "MANAGER_MISMATCH": return "bg-amber-500/5 hover:bg-amber-500/8";
    case "BOTH_MISMATCH":  return "bg-red-500/5 hover:bg-red-500/8";
    case "NO_MASTER":      return "bg-slate-800/30 hover:bg-slate-800/50";
    default:               return "";
  }
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return iso; }
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: number;
  icon: React.ElementType; color: string;
}) {
  return (
    <div
      className="relative flex flex-col gap-1 p-4 border bg-[#0d1117] overflow-hidden"
      style={{ borderColor: color + "30" }}
    >
      {/* corner brackets */}
      <div className="absolute top-0 left-0 w-2 h-2 border-l border-t" style={{ borderColor: color + "60" }} />
      <div className="absolute top-0 right-0 w-2 h-2 border-r border-t" style={{ borderColor: color + "60" }} />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b" style={{ borderColor: color + "60" }} />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b" style={{ borderColor: color + "60" }} />

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</span>
        <Icon className="size-4" style={{ color }} />
      </div>
      <span className="text-3xl font-bold font-mono" style={{ color }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CrossMatchingPage() {
  const [rows, setRows]         = useState<CrossMatchRow[]>([]);
  const [summary, setSummary]   = useState<Summary>({ total: 0, matched: 0, mismatch: 0, noMaster: 0 });
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("MISMATCH");
  const [tsmFilter,    setTsmFilter]    = useState("");
  const [managerFilter, setManagerFilter] = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/taskflow/cross-matching", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to fetch data.");
      setRows(json.data ?? []);
      setSummary(json.summary ?? { total: 0, matched: 0, mismatch: 0, noMaster: 0 });
      setLastFetched(new Date().toLocaleTimeString("en-PH"));
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [statusFilter, tsmFilter, managerFilter, dateFrom, dateTo, search]);

  // ── Derived filter options ────────────────────────────────────────────────
  const uniqueTsms = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.currentTsm && r.currentTsm !== "—") s.add(r.currentTsm); });
    return Array.from(s).sort();
  }, [rows]);

  const uniqueManagers = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.currentManager && r.currentManager !== "—") s.add(r.currentManager); });
    return Array.from(s).sort();
  }, [rows]);

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      // Status filter
      if (statusFilter === "MATCH" && r.matchStatus !== "MATCH") return false;
      if (statusFilter === "NO_MASTER" && r.matchStatus !== "NO_MASTER") return false;
      if (statusFilter === "MISMATCH" &&
          !["TSM_MISMATCH","MANAGER_MISMATCH","BOTH_MISMATCH"].includes(r.matchStatus)) return false;

      // TSM / Manager filter
      if (tsmFilter && r.currentTsm !== tsmFilter) return false;
      if (managerFilter && r.currentManager !== managerFilter) return false;

      // Date range
      if (dateFrom && r.activityDate < dateFrom) return false;
      if (dateTo   && r.activityDate.slice(0, 10) > dateTo) return false;

      // Search box
      const q = search.trim().toLowerCase();
      if (q) {
        const haystack = [
          r.referenceId, r.companyName, r.activityType,
          r.correctTsm, r.currentTsm, r.correctManager, r.currentManager,
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [rows, statusFilter, tsmFilter, managerFilter, dateFrom, dateTo, search]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated  = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCsv = () => {
    const headers = [
      "Reference ID","Company Name","Activity Date","Activity Type",
      "Should Be TSM","Current TSM","Should Be Manager","Current Manager","Status",
    ];
    const csvRows = [
      headers.join(","),
      ...filtered.map((r) =>
        [
          r.referenceId, `"${r.companyName}"`, formatDate(r.activityDate),
          r.activityType, r.correctTsm, r.currentTsm,
          r.correctManager, r.currentManager, r.matchStatus,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `cross-matching-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully.");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ProtectedPageWrapper>
      <SidebarProvider>
        <AppSidebar />
        <PageShell
          breadcrumbs={[
            { label: "Taskflow", href: "/taskflow/customer-database" },
            { label: "Cross-Matching Tracker" },
          ]}
          title="Cross-Matching Tracker"
          subtitle="TSM · MANAGER · ASSIGNMENT VERIFICATION"
          icon={<GitCompare className="w-4 h-4 text-orange-400" />}
          statusItems={lastFetched ? [`Updated ${lastFetched}`] : []}
        >
          <div className="flex flex-col gap-4 px-4 sm:px-6 py-4">

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard label="Total Records Checked" value={summary.total}    icon={GitCompare}    color="#60a5fa" />
              <SummaryCard label="Correctly Matched"     value={summary.matched}  icon={CheckCircle2}  color="#34d399" />
              <SummaryCard label="Mismatch Found"        value={summary.mismatch} icon={AlertTriangle} color="#fbbf24" />
              <SummaryCard label="No Master Data"        value={summary.noMaster} icon={HelpCircle}    color="#94a3b8" />
            </div>

            {/* ── Filter Bar ── */}
            <div className="flex flex-wrap items-end gap-2 p-3 border border-slate-800/60 bg-[#0d1117]">
              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase tracking-widest text-slate-600">Status</label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="h-8 w-44 text-xs rounded-none bg-[#080d12] border-slate-800 text-slate-300 font-mono focus:ring-orange-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-[#0d1117] border-slate-800">
                    <SelectGroup>
                      <SelectItem value="MISMATCH"  className="text-xs font-mono">⚠️ Mismatch Only</SelectItem>
                      <SelectItem value="ALL"       className="text-xs font-mono">All Records</SelectItem>
                      <SelectItem value="MATCH"     className="text-xs font-mono">✅ Match Only</SelectItem>
                      <SelectItem value="NO_MASTER" className="text-xs font-mono">❓ No Master Data</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* TSM */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase tracking-widest text-slate-600">TSM</label>
                <Select value={tsmFilter || "ALL"} onValueChange={(v) => setTsmFilter(v === "ALL" ? "" : v)}>
                  <SelectTrigger className="h-8 w-44 text-xs rounded-none bg-[#080d12] border-slate-800 text-slate-300 font-mono focus:ring-orange-500/30">
                    <SelectValue placeholder="All TSMs" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-[#0d1117] border-slate-800">
                    <SelectGroup>
                      <SelectItem value="ALL" className="text-xs font-mono">All TSMs</SelectItem>
                      {uniqueTsms.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs font-mono">{t}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Manager */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase tracking-widest text-slate-600">Manager</label>
                <Select value={managerFilter || "ALL"} onValueChange={(v) => setManagerFilter(v === "ALL" ? "" : v)}>
                  <SelectTrigger className="h-8 w-44 text-xs rounded-none bg-[#080d12] border-slate-800 text-slate-300 font-mono focus:ring-orange-500/30">
                    <SelectValue placeholder="All Managers" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-[#0d1117] border-slate-800">
                    <SelectGroup>
                      <SelectItem value="ALL" className="text-xs font-mono">All Managers</SelectItem>
                      {uniqueManagers.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs font-mono">{m}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Date from */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase tracking-widest text-slate-600">Date From</label>
                <input
                  type="date" value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 px-2 text-xs bg-[#080d12] border border-slate-800 text-slate-300 font-mono focus:outline-none focus:border-orange-500/40"
                />
              </div>

              {/* Date to */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase tracking-widest text-slate-600">Date To</label>
                <input
                  type="date" value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 px-2 text-xs bg-[#080d12] border border-slate-800 text-slate-300 font-mono focus:outline-none focus:border-orange-500/40"
                />
              </div>

              {/* Search */}
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-[9px] font-mono uppercase tracking-widest text-slate-600">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600" />
                  <Input
                    placeholder="Reference ID, Company, TSM…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-7 h-8 text-xs rounded-none bg-[#080d12] border-slate-800 text-slate-300 placeholder:text-slate-700 focus-visible:ring-orange-500/30 focus-visible:border-orange-500/40 font-mono"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-end gap-2 ml-auto">
                <Button
                  size="sm" variant="outline"
                  onClick={fetchData} disabled={isLoading}
                  className="h-8 rounded-none text-xs font-mono border-slate-700 text-slate-400 hover:text-orange-400 hover:border-orange-500/40 bg-transparent"
                >
                  {isLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw className="size-3 mr-1" />}
                  Refresh
                </Button>
                <Button
                  size="sm" variant="outline"
                  onClick={exportCsv} disabled={filtered.length === 0}
                  className="h-8 rounded-none text-xs font-mono border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 bg-transparent"
                >
                  <Download className="size-3 mr-1" /> Export CSV
                </Button>
              </div>
            </div>

            {/* ── Result count ── */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 uppercase tracking-wider px-0.5">
              <span>
                Showing {filtered.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1}–
                {Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length} records
              </span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-500/70">{summary.matched} matched</span>
                <span className="text-amber-500/70">{summary.mismatch} mismatch</span>
                <span className="text-slate-500">{summary.noMaster} no-master</span>
              </div>
            </div>

            {/* ── Loading / Error states ── */}
            {isLoading && (
              <div className="flex items-center justify-center py-20 gap-3 text-slate-500 text-xs font-mono">
                <Loader2 className="size-4 animate-spin text-orange-500" />
                <span className="uppercase tracking-widest">Fetching and cross-matching records…</span>
              </div>
            )}

            {!isLoading && error && (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-red-400 text-xs font-mono uppercase tracking-widest">
                <XCircle className="size-6" />
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={fetchData}
                  className="mt-2 h-7 text-[10px] rounded-none border-red-500/30 text-red-400 hover:bg-red-500/10">
                  Retry
                </Button>
              </div>
            )}

            {/* ── Main Table ── */}
            {!isLoading && !error && (
              <div className="border border-slate-800/60 overflow-auto">
                {filtered.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-slate-700 text-xs font-mono uppercase tracking-widest">
                    No records match the current filters.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 bg-[#0d1117]/90 hover:bg-[#0d1117]/90">
                        <TableHead className="w-8 text-center text-[9px] uppercase tracking-widest text-slate-600 font-mono">#</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-widest text-slate-600 font-mono">Reference ID</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-widest text-slate-600 font-mono">Company Name</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-widest text-slate-600 font-mono">Activity Date</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-widest text-slate-600 font-mono">Type</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-widest text-emerald-700 font-mono">✅ Should Be TSM</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-widest text-red-700 font-mono">❌ Current TSM</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-widest text-emerald-700 font-mono">✅ Should Be Manager</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-widest text-red-700 font-mono">❌ Current Manager</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-widest text-slate-600 font-mono">Status</TableHead>
                        <TableHead className="text-[9px] uppercase tracking-widest text-slate-600 font-mono text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((row, idx) => (
                        <TableRow
                          key={`${(page - 1) * ROWS_PER_PAGE + idx}-${row.id}`}
                          className={`text-xs border-slate-800/40 transition-colors ${rowClass(row.matchStatus)}`}
                        >
                          <TableCell className="text-center text-[10px] text-slate-700 font-mono">
                            {(page - 1) * ROWS_PER_PAGE + idx + 1}
                          </TableCell>
                          <TableCell className="font-mono text-orange-300 text-[11px]">
                            {row.referenceId}
                          </TableCell>
                          <TableCell className="text-slate-300 font-mono text-[11px] max-w-[160px] truncate">
                            {row.companyName}
                          </TableCell>
                          <TableCell className="text-slate-400 font-mono text-[10px] whitespace-nowrap">
                            {formatDate(row.activityDate)}
                          </TableCell>
                          <TableCell>
                            <Badge className="rounded-none text-[9px] px-1.5 py-0 font-mono bg-slate-800/60 text-slate-400 border border-slate-700/50">
                              {row.activityType}
                            </Badge>
                          </TableCell>
                          {/* Should be TSM */}
                          <TableCell className="font-mono text-[11px] text-emerald-400/80">
                            {row.correctTsm}
                          </TableCell>
                          {/* Current TSM — highlight if wrong */}
                          <TableCell className={`font-mono text-[11px] ${
                            ["TSM_MISMATCH","BOTH_MISMATCH"].includes(row.matchStatus)
                              ? "text-red-400 font-bold"
                              : "text-slate-300"
                          }`}>
                            {row.currentTsm}
                          </TableCell>
                          {/* Should be Manager */}
                          <TableCell className="font-mono text-[11px] text-emerald-400/80">
                            {row.correctManager}
                          </TableCell>
                          {/* Current Manager — highlight if wrong */}
                          <TableCell className={`font-mono text-[11px] ${
                            ["MANAGER_MISMATCH","BOTH_MISMATCH"].includes(row.matchStatus)
                              ? "text-red-400 font-bold"
                              : "text-slate-300"
                          }`}>
                            {row.currentManager}
                          </TableCell>
                          <TableCell>{statusBadge(row.matchStatus)}</TableCell>
                          <TableCell className="text-right">
                            {row.matchStatus === "NO_MASTER" ? (
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => window.open("/admin/roles", "_blank")}
                                className="h-6 px-2 text-[9px] font-mono text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-none gap-1"
                              >
                                <UserPlus className="size-3" /> Add to Users
                              </Button>
                            ) : (
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => window.open(`/taskflow/activity-logs?ref=${encodeURIComponent(row.referenceId)}`, "_blank")}
                                className="h-6 px-2 text-[9px] font-mono text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-none gap-1"
                              >
                                <ExternalLink className="size-3" /> View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* ── Pagination ── */}
            {!isLoading && !error && totalPages > 1 && (
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                <span>Page {page} of {totalPages}</span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm" variant="ghost" disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-7 px-3 text-[10px] rounded-none font-mono text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 disabled:opacity-30"
                  >
                    ← Prev
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const p = start + i;
                    return (
                      <Button key={p} size="sm" variant="ghost"
                        onClick={() => setPage(p)}
                        className={`h-7 w-7 p-0 text-[10px] rounded-none font-mono transition-colors ${
                          p === page
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                            : "text-slate-600 hover:text-orange-400 hover:bg-orange-500/10"
                        }`}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button
                    size="sm" variant="ghost" disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 px-3 text-[10px] rounded-none font-mono text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 disabled:opacity-30"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}

          </div>
        </PageShell>
      </SidebarProvider>
    </ProtectedPageWrapper>
  );
}

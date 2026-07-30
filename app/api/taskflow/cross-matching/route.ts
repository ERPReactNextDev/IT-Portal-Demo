import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase";

/**
 * GET /api/taskflow/cross-matching
 *
 * Fetches both tables from Supabase (all rows, paginated past the 1k default)
 * and performs the cross-match logic server-side:
 *   1. `users`            — official assignment master (ReferenceID, TSM, Manager)
 *   2. `history`          — actual assignments on each activity record
 *
 * Returns a JSON array of cross-match results with a `matchStatus` field:
 *   MATCH | TSM_MISMATCH | MANAGER_MISMATCH | BOTH_MISMATCH | NO_MASTER
 */

export type MatchStatus =
  | "MATCH"
  | "TSM_MISMATCH"
  | "MANAGER_MISMATCH"
  | "BOTH_MISMATCH"
  | "NO_MASTER";

export interface CrossMatchRow {
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

// ── Helper: fetch every row by paginating through Supabase's 1k row cap ───────
async function fetchAll<T>(
  queryFn: (from: number, to: number) => any,
  chunkSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryFn(from, from + chunkSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < chunkSize) break; // reached last page
    from += chunkSize;
  }

  return all;
}

export async function GET(_req: NextRequest) {
  try {
    // ── 1. Fetch ALL users (master reference) — paginated ─────────────────
    const usersRaw = await fetchAll<any>((from, to) =>
      supabase
        .from("users")
        .select("ReferenceID, TSM, Manager")
        .range(from, to)
    );

    // Build a fast lookup: lowercase referenceId → { tsm, manager }
    const masterMap = new Map<string, { tsm: string; manager: string }>();
    for (const u of usersRaw) {
      const refId = (u.ReferenceID ?? "").trim();
      if (!refId) continue;
      masterMap.set(refId.toLowerCase(), {
        tsm:     (u.TSM     ?? "").trim(),
        manager: (u.Manager ?? "").trim(),
      });
    }

    // ── 2. Fetch ALL activity history rows — paginated ─────────────────────
    const historyRaw = await fetchAll<any>((from, to) =>
      supabase
        .from("history")
        .select("id, company_name, type_activity, referenceid, tsm, manager, date_created")
        .order("date_created", { ascending: false })
        .range(from, to)
    );

    // ── 3. Cross-match ─────────────────────────────────────────────────────
    const results: CrossMatchRow[] = historyRaw.map((row: any, i: number) => {
      const refId          = (row.referenceid  ?? "").trim();
      const currentTsm     = (row.tsm          ?? "").trim();
      const currentManager = (row.manager      ?? "").trim();

      const masterEntry = masterMap.get(refId.toLowerCase());

      if (!refId || !masterEntry) {
        return {
          id:             `${i}-${row.id ?? i}`,
          referenceId:    refId || "—",
          companyName:    row.company_name  ?? "—",
          activityDate:   row.date_created  ?? "",
          activityType:   row.type_activity ?? "—",
          correctTsm:     "—",
          correctManager: "—",
          currentTsm:     currentTsm     || "—",
          currentManager: currentManager || "—",
          matchStatus:    "NO_MASTER" as MatchStatus,
        };
      }

      const { tsm: correctTsm, manager: correctManager } = masterEntry;

      const tsmMatch =
        !correctTsm ||
        correctTsm.toLowerCase() === currentTsm.toLowerCase();
      const managerMatch =
        !correctManager ||
        correctManager.toLowerCase() === currentManager.toLowerCase();

      let matchStatus: MatchStatus;
      if      (tsmMatch && managerMatch)   matchStatus = "MATCH";
      else if (!tsmMatch && !managerMatch) matchStatus = "BOTH_MISMATCH";
      else if (!tsmMatch)                  matchStatus = "TSM_MISMATCH";
      else                                 matchStatus = "MANAGER_MISMATCH";

      return {
          id:             `${i}-${row.id ?? i}`,
          referenceId:    refId,
        companyName:    row.company_name  ?? "—",
        activityDate:   row.date_created  ?? "",
        activityType:   row.type_activity ?? "—",
        correctTsm:     correctTsm     || "—",
        correctManager: correctManager || "—",
        currentTsm:     currentTsm     || "—",
        currentManager: currentManager || "—",
        matchStatus,
      };
    });

    // ── 4. Summary counts ──────────────────────────────────────────────────
    const summary = {
      total:    results.length,
      matched:  results.filter((r) => r.matchStatus === "MATCH").length,
      mismatch: results.filter((r) =>
        ["TSM_MISMATCH", "MANAGER_MISMATCH", "BOTH_MISMATCH"].includes(r.matchStatus)
      ).length,
      noMaster: results.filter((r) => r.matchStatus === "NO_MASTER").length,
    };

    return NextResponse.json({ success: true, data: results, summary });
  } catch (err: any) {
    console.error("[cross-matching]", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Internal server error." },
      { status: 500 }
    );
  }
}

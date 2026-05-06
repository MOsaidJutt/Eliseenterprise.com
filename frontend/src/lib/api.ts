import { authHeader } from "./auth";

const API_BASE = "";

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Invalid credentials" }));
    throw new Error(err.detail || "Login failed");
  }
  const data = await res.json();
  return data.token;
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    headers: { ...authHeader() },
  }).catch(() => {});
}

export async function fetchAdminStats(): Promise<{ files_processed: number; active_sessions: number }> {
  const res = await fetch(`${API_BASE}/api/admin/stats`, {
    headers: { ...authHeader() },
  });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

// ── Analysis ─────────────────────────────────────────────────────────────────

export async function analyzeXerFiles(files: File[]): Promise<AnalysisResult> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { ...authHeader() },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Analysis failed");
  }
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KPIs {
  overall_pct_complete: number;
  baseline_pct: number;
  spi: number;
  delay_days: number;
  total_activities: number;
  completed_activities: number;
  in_progress_activities: number;
  critical_activities: number;
  critical_path_risk_pct: number;
  neg_float_activities: number;
  data_date: string;
  project_name: string;
  planned_end: string;
  forecast_end: string;
}

export interface SPIContractor {
  contractor: string;
  pv: number;
  ev: number;
  spi: number;
}

export interface PPCRow {
  data_date: string;
  activity_count: number;
  ppc_starts_actual: number;
  ppc_starts_planned: number;
  ppc_finishes_actual: number;
  ppc_finishes_planned: number;
  ppc_s_pct: number;
  ppc_f_pct: number;
  ppc_t_pct: number;
}

export interface SCurveData {
  labels: string[];
  baseline: number[];
  actual: number[];
  forecast: number[];
  data_date: string;
}

export interface ResourceMonth {
  month: string;
  planned: number;
  actual: number;
}

export interface FloatErosionRow {
  comparison: string;
  previous_dd: string;
  current_dd: string;
  eroded_float_days: number;
  eroded_activities: number;
  increased_activities: number;
  total_compared: number;
  pct_eroded: number;
}

export interface Milestone {
  task_code: string;
  task_name: string;
  baseline: string;
  actual: string;
  forecast: string;
  variance_days: number;
  status: string;
}

export interface CriticalActivity {
  task_code: string;
  task_name: string;
  total_float_days: number;
  status: string;
  pct_complete: string;
  forecast_end: string;
}

export interface AnalysisResult {
  kpis: KPIs;
  spi_by_contractor: SPIContractor[];
  ppc: PPCRow[];
  scurve: SCurveData;
  resources: ResourceMonth[];
  float_erosion: FloatErosionRow[];
  milestones: Milestone[];
  critical_path: CriticalActivity[];
  observations: string[];
  files_analyzed: string[];
  data_dates: string[];
}

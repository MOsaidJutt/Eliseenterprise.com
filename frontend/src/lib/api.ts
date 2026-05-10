import { getToken } from "./auth";

async function apiCall<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
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

export interface SPIContractor { contractor: string; pv: number; ev: number; spi: number; }

export interface PPCRow {
  data_date: string; activity_count: number;
  ppc_starts_actual: number; ppc_starts_planned: number;
  ppc_finishes_actual: number; ppc_finishes_planned: number;
  ppc_s_pct: number; ppc_f_pct: number; ppc_t_pct: number;
}

export interface SCurveData {
  labels: string[]; baseline: number[]; actual: number[]; forecast: number[]; data_date: string;
}

export interface ResourceMonth { month: string; planned: number; actual: number; }

export interface FloatErosionRow {
  comparison: string; previous_dd: string; current_dd: string;
  eroded_float_days: number; eroded_activities: number;
  increased_activities: number; total_compared: number; pct_eroded: number;
}

export interface Milestone {
  task_code: string; task_name: string; baseline: string;
  actual: string; forecast: string; variance_days: number; status: string;
}

export interface CriticalActivity {
  task_code: string; task_name: string; total_float_days: number;
  status: string; pct_complete: string; forecast_end: string;
}

export interface GanttTask {
  id: string; code: string; name: string;
  wbs_id: string; wbs_name: string; wbs_path: string; wbs_level: number;
  planned_start: string; planned_finish: string;
  actual_start: string; actual_finish: string;
  early_start: string; early_finish: string;
  status: string; pct_complete: number;
  is_critical: boolean; total_float_days: number; duration_days: number;
}

export interface GanttData {
  tasks: GanttTask[]; project_start: string; project_end: string; data_date: string;
}

export interface AnalysisResult {
  analysis_id?: number;
  kpis: KPIs;
  spi_by_contractor: SPIContractor[];
  ppc: PPCRow[];
  scurve: SCurveData;
  resources: ResourceMonth[];
  float_erosion: FloatErosionRow[];
  milestones: Milestone[];
  critical_path: CriticalActivity[];
  gantt?: GanttData;
  observations: string[];
  files_analyzed: string[];
  data_dates: string[];
}

export interface AnalysisListItem {
  id: number;
  project_name: string;
  filenames: string[];
  file_type: "baseline" | "update";
  notes: string | null;
  created_at: string;
}

export interface StoredUser {
  id: number; email: string; name: string; role: string; company_id: number | null;
  company_slug?: string | null;
}

export interface AIMessage {
  id: number; role: "user" | "assistant"; content: string; created_at: string;
}

export interface Conversation {
  id: number; title: string; analysis_id: number | null; created_at: string;
}

export interface ConversationDetail extends Conversation { messages: AIMessage[]; }

export interface CompanyInfo {
  id: number; slug: string; name: string; logo_url: string | null;
}

export interface AdminStats {
  total_analyses: number; total_users: number; total_companies: number;
  recent_analyses: AnalysisListItem[];
  // backward compat
  files_processed?: number;
  active_sessions?: number;
  log?: Array<{ id: number; timestamp: string; project: string; files: string[] }>;
}

export interface CompanyWithStats {
  id: number; slug: string; name: string; logo_url: string | null;
  created_at: string; user_count: number; analysis_count: number;
}

export interface DuplicateAnalysis {
  id: number; project_name: string; created_at: string;
  filenames: string[]; file_type: string;
}

export interface DuplicateResponse {
  duplicate: true;
  duplicate_analyses: DuplicateAnalysis[];
}

export interface AdminUser {
  id: number; email: string; name: string; role: string;
  company_id: number | null; company_slug: string | null; created_at: string; is_active?: boolean;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Login failed");
  }
  return res.json() as Promise<{ access_token: string; token_type: string; user: StoredUser }>;
}

export async function fetchMe(): Promise<StoredUser> {
  return apiCall("/api/auth/me");
}

// ── Analysis ──────────────────────────────────────────────────────────────────

export async function analyzeXerFiles(
  files: File[],
  fileType: "baseline" | "update" = "update",
  notes = "",
  force: boolean = false,
): Promise<AnalysisResult | DuplicateResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  form.append("file_type", fileType);
  form.append("notes", notes);
  form.append("force", force ? "true" : "false");
  const token = getToken();
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (res.status === 409) {
    // Duplicate detected — return the response body without throwing
    return res.json() as Promise<DuplicateResponse>;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── History ───────────────────────────────────────────────────────────────────

export async function fetchAnalyses(
  params?: { limit?: number; offset?: number; file_type?: string }
): Promise<{ items: AnalysisListItem[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.file_type) qs.set("file_type", params.file_type);
  return apiCall(`/api/analyses?${qs}`);
}

export async function fetchAnalysis(id: number): Promise<AnalysisResult & { analysis_id: number }> {
  return apiCall(`/api/analyses/${id}`);
}

export async function patchAnalysis(
  id: number,
  data: { file_type?: string; notes?: string }
): Promise<AnalysisListItem> {
  return apiCall(`/api/analyses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteAnalysis(id: number): Promise<void> {
  await apiCall(`/api/analyses/${id}`, { method: "DELETE" });
}

// ── Company ───────────────────────────────────────────────────────────────────

export async function fetchCompany(slug: string): Promise<CompanyInfo> {
  return apiCall(`/api/companies/${slug}`);
}

// ── AI Chat ───────────────────────────────────────────────────────────────────

export async function sendChatMessage(
  message: string,
  analysis_id?: number,
  conversation_id?: number,
): Promise<{ reply: string; conversation_id: number; message_id: number }> {
  return apiCall("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, analysis_id, conversation_id }),
  });
}

export async function fetchConversations(): Promise<Conversation[]> {
  return apiCall("/api/chat/conversations");
}

export async function fetchConversation(id: number): Promise<ConversationDetail> {
  return apiCall(`/api/chat/conversations/${id}`);
}

export async function deleteConversation(id: number): Promise<void> {
  await apiCall(`/api/chat/conversations/${id}`, { method: "DELETE" });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function fetchAdminStats(): Promise<AdminStats> {
  return apiCall("/api/admin/stats");
}

export async function fetchAdminCompanies(): Promise<CompanyWithStats[]> {
  return apiCall("/api/admin/companies");
}

export async function createAdminCompany(data: { slug: string; name: string }): Promise<CompanyInfo> {
  return apiCall("/api/admin/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}

export async function updateAdminCompany(id: number, data: { name: string }): Promise<CompanyInfo> {
  return apiCall(`/api/admin/companies/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}

export async function deleteAdminCompany(id: number): Promise<void> {
  await apiCall(`/api/admin/companies/${id}`, { method: "DELETE" });
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  return apiCall("/api/admin/users");
}

export async function createAdminUser(data: { email: string; password: string; name: string; role: string; company_id: number | null }): Promise<AdminUser> {
  return apiCall("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}

export async function updateAdminUser(id: number, data: { is_active?: boolean; role?: string; name?: string }): Promise<AdminUser> {
  return apiCall(`/api/admin/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}

export async function deactivateAdminUser(id: number): Promise<void> {
  await apiCall(`/api/admin/users/${id}`, { method: "DELETE" });
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUser, clearToken, updateCachedCompany } from "@/lib/auth";
import { logEvent } from "@/lib/debugLog";
import {
  fetchAdminStats,
  fetchAdminCompanies,
  fetchAdminUsers,
  createAdminCompany,
  updateAdminCompany,
  deleteAdminCompany,
  createAdminUser,
  updateAdminUser,
  deleteAdminUserPermanently,
  AdminStats,
  CompanyWithStats,
  AdminUser,
  CompanyInfo,
} from "@/lib/api";

type Tab = "overview" | "clients" | "users";

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D1829] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60 w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.07]">
          <h2 className="text-slate-100 font-semibold text-sm">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Form field ────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = "text", placeholder, children, required,
}: {
  label: string; value?: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; children?: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children ?? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.06] transition-all"
        />
      )}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
// Native dropdown lists are painted by the OS, which ignores the translucent
// `bg-white/[0.04]` used elsewhere — it composites over the popup's own white
// base, leaving light text on a near-white background. A solid colour plus
// `color-scheme: dark` (and explicit per-option colours below) is what actually
// reaches the popup.
const SELECT_CLASS =
  "w-full bg-[#0F1B2E] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm " +
  "text-slate-200 focus:outline-none focus:border-blue-500/60 transition-all cursor-pointer";

export const OPTION_STYLE = { background: "#0F1B2E", color: "#E2E8F0" } as const;

function Select({
  value, onChange, children, className = "", ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{ colorScheme: "dark" }}
      className={`${SELECT_CLASS} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[#0D1829] border border-white/[0.07] rounded-2xl px-6 py-5 flex-1 min-w-0">
      <p className="text-slate-500 text-xs font-medium mb-1.5">{label}</p>
      <p className="text-slate-100 text-2xl font-bold">{value}</p>
    </div>
  );
}

// ── Add Company Modal ─────────────────────────────────────────────────────────
function AddCompanyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: CompanyInfo) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(v: string) {
    setName(v);
    setSlug(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) { setError("Name and slug are required."); return; }
    setLoading(true);
    setError("");
    try {
      const created = await createAdminCompany({ name: name.trim(), slug: slug.trim() });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Add Client" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Company Name" value={name} onChange={handleNameChange} placeholder="Acme Corp" />
        <Field label="URL Slug" value={slug} onChange={setSlug} placeholder="acme-corp" />
        {error && (
          <p className="text-red-400 text-xs mb-3 bg-red-500/[0.08] border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
        )}
        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 border border-white/[0.08] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/40 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2"
          >
            {loading && <Spinner />}
            Create Client
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Rename Company Modal ──────────────────────────────────────────────────────
function RenameCompanyModal({
  company,
  onClose,
  onRenamed,
}: {
  company: CompanyWithStats;
  onClose: () => void;
  onRenamed: (c: CompanyInfo) => void;
}) {
  const [name, setName] = useState(company.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setLoading(true);
    setError("");
    try {
      const updated = await updateAdminCompany(company.id, { name: name.trim() });
      onRenamed(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Rename Client" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Company Name" value={name} onChange={setName} placeholder="Company name" />
        {error && (
          <p className="text-red-400 text-xs mb-3 bg-red-500/[0.08] border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
        )}
        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 border border-white/[0.08] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/40 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2"
          >
            {loading && <Spinner />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Add User Modal ────────────────────────────────────────────────────────────
function AddUserModal({
  companies,
  onClose,
  onCreated,
}: {
  companies: CompanyWithStats[];
  onClose: () => void;
  onCreated: (u: AdminUser) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email, and password are required.");
      return;
    }
    // A user with no company has no workspace to upload into, so this is
    // enforced rather than merely encouraged.
    if (companyId === null) {
      setError("Please select a company for this user.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const created = await createAdminUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        company_id: companyId,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Add User" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Full Name" value={name} onChange={setName} placeholder="Jane Smith" required />
        <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="jane@example.com" required />
        <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" required />
        <Field label="Role" required>
          <Select value={role} onChange={(e) => setRole(e.target.value as "admin" | "user")}>
            <option value="user" style={OPTION_STYLE}>User</option>
            <option value="admin" style={OPTION_STYLE}>Admin</option>
          </Select>
        </Field>
        <Field label="Company" required>
          <Select
            value={companyId ?? ""}
            onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : null)}
            required
          >
            <option value="" disabled style={OPTION_STYLE}>— Select a company —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id} style={OPTION_STYLE}>{c.name}</option>
            ))}
          </Select>
          {companies.length === 0 && (
            <p className="text-amber-400/80 text-[11px] mt-1.5">
              No clients exist yet — create one in the Clients tab first.
            </p>
          )}
        </Field>
        {error && (
          <p className="text-red-400 text-xs mb-3 bg-red-500/[0.08] border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
        )}
        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 border border-white/[0.08] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/40 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2"
          >
            {loading && <Spinner />}
            Create User
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete User Confirm Dialog ────────────────────────────────────────────────
function DeleteUserDialog({
  user,
  onClose,
  onDeleted,
}: {
  user: AdminUser;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const canDelete = confirmText.trim().toLowerCase() === "delete";

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    setError("");
    try {
      await deleteAdminUserPermanently(user.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Delete User" onClose={onClose}>
      <p className="text-slate-300 text-sm mb-3">
        Permanently delete <span className="font-semibold text-white">{user.name}</span>
        <span className="text-slate-500"> ({user.email})</span>?
      </p>
      <ul className="text-slate-500 text-xs mb-4 space-y-1.5 list-disc pl-4">
        <li>The account is removed and can no longer sign in.</li>
        <li>Their schedule analyses are <span className="text-slate-300">kept</span> and transferred to your account, so the client&apos;s history stays intact.</li>
        <li>Their private AI chat history is deleted.</li>
      </ul>
      <p className="text-slate-500 text-xs mb-2">
        To confirm, type <span className="font-mono text-slate-300">delete</span> below.
      </p>
      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="delete"
        autoFocus
        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-red-500/60 transition-all mb-4"
      />
      {error && (
        <p className="text-red-400 text-xs mb-3 bg-red-500/[0.08] border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 border border-white/[0.08] rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={loading || !canDelete}
          className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:bg-red-900/40 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2"
        >
          {loading && <Spinner />}
          Delete Permanently
        </button>
      </div>
    </Modal>
  );
}

// ── Delete Company Confirm Dialog ─────────────────────────────────────────────
function DeleteCompanyDialog({
  company,
  onClose,
  onDeleted,
}: {
  company: CompanyWithStats;
  onClose: () => void;
  onDeleted: (id: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      await deleteAdminCompany(company.id);
      onDeleted(company.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Delete Client" onClose={onClose}>
      <p className="text-slate-300 text-sm mb-2">
        Are you sure you want to delete <span className="font-semibold text-white">{company.name}</span>?
      </p>
      <p className="text-slate-500 text-xs mb-5">
        This will permanently delete all {company.user_count} user(s) and {company.analysis_count} analysis record(s) associated with this client.
      </p>
      {error && (
        <p className="text-red-400 text-xs mb-3 bg-red-500/[0.08] border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 border border-white/[0.08] rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:bg-red-900/40 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2"
        >
          {loading && <Spinner />}
          Delete Permanently
        </button>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [globalError, setGlobalError] = useState("");

  // Modals
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [renameTarget, setRenameTarget] = useState<CompanyWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyWithStats | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<AdminUser | null>(null);

  const currentUser = getUser();

  // Prefer the server's view of which client this admin belongs to; the cached
  // login payload is only a fallback for the first paint, before /users loads.
  const myServerRecord = users.find((u) => u.id === currentUser?.id);
  const workspaceSlug =
    (myServerRecord?.company_id
      ? companies.find((c) => c.id === myServerRecord.company_id)?.slug
      : null) ??
    currentUser?.company_slug ??
    null;

  useEffect(() => {
    logEvent(`admin page mounted isLoggedIn=${isLoggedIn()} currentUser=${currentUser ? JSON.stringify(currentUser) : "null"}`);
    if (!isLoggedIn()) { logEvent("admin: not logged in -> /login"); router.replace("/login"); return; }
    // Only bounce away on a confirmed non-admin role. A missing cached user
    // object (e.g. a stale/partial local write) isn't proof of that — let
    // the admin-only API calls below be the source of truth instead.
    if (currentUser && currentUser.role !== "admin") {
      logEvent(`admin: currentUser.role="${currentUser.role}" !== admin -> /dashboard`);
      router.replace("/dashboard"); return;
    }

    async function loadAll() {
      try {
        const [s, c, u] = await Promise.all([
          fetchAdminStats().finally(() => setLoadingStats(false)),
          fetchAdminCompanies().finally(() => setLoadingCompanies(false)),
          fetchAdminUsers().finally(() => setLoadingUsers(false)),
        ]);
        setStats(s);
        setCompanies(c);
        setUsers(u);
        logEvent("admin: loadAll ok");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load admin data";
        logEvent(`admin: loadAll FAILED — ${msg}`);
        setGlobalError(msg);
        setLoadingStats(false);
        setLoadingCompanies(false);
        setLoadingUsers(false);
      }
    }
    loadAll();
  }, []);

  const reloadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    try {
      const c = await fetchAdminCompanies();
      setCompanies(c);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to reload companies");
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  const reloadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const u = await fetchAdminUsers();
      setUsers(u);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to reload users");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  async function handleToggleActive(user: AdminUser) {
    try {
      await updateAdminUser(user.id, { is_active: !user.is_active });
      await reloadUsers();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  async function handleChangeCompany(user: AdminUser, companyId: number) {
    if (!companyId || companyId === user.company_id) return;
    try {
      await updateAdminUser(user.id, { company_id: companyId });
      await reloadUsers();
      await reloadCompanies();
      // Own company drives this admin's workspace link, so refresh the cache.
      if (user.id === currentUser?.id) {
        const slug = companies.find((c) => c.id === companyId)?.slug ?? null;
        if (slug) updateCachedCompany(companyId, slug);
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to change company");
    }
  }

  async function handleToggleRole(user: AdminUser) {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await updateAdminUser(user.id, { role: newRole });
      await reloadUsers();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to update user role");
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "clients", label: "Clients" },
    { id: "users", label: "Users" },
  ];

  return (
    <div className="min-h-screen bg-[#070C18] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.07] bg-[#070C18]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Back to dashboard"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="w-px h-4 bg-white/10" />
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-900/40">
              P
            </div>
            <span className="font-bold text-sm text-slate-200">Plainview Admin</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Admins are users too — this is their route into a workspace,
                where uploading and analysing actually happens. */}
            {workspaceSlug ? (
              <button
                onClick={() => router.push(`/${workspaceSlug}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/20"
                title={`Open your workspace (/${workspaceSlug}) to upload and analyse XER files`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload XER
              </button>
            ) : (
              <button
                onClick={() => setTab("users")}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/30 text-amber-400 hover:border-amber-500/60 text-xs font-semibold rounded-xl transition-all"
                title="Assign your account to a client in the Users tab to enable uploads"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                No workspace
              </button>
            )}
            <span className="text-slate-500 text-xs">{currentUser?.email}</span>
            <button
              onClick={() => { clearToken(); router.replace("/login"); }}
              className="text-slate-600 hover:text-slate-400 transition-colors"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {globalError && (
          <div className="mb-6 bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
            {globalError}
          </div>
        )}

        {!loadingUsers && !loadingCompanies && !workspaceSlug && (
          <div className="mb-6 bg-amber-500/[0.07] border border-amber-500/20 text-amber-300/90 text-sm px-4 py-3 rounded-xl flex items-start gap-3">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">Your account isn&apos;t linked to a client yet</p>
              <p className="text-amber-300/60 text-xs mt-0.5">
                Uploading and analysing happens inside a client workspace. Pick a client for
                your account in the <button onClick={() => setTab("users")} className="underline hover:text-amber-200">Users tab</button> to enable it.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === t.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === "overview" && (
          <div>
            {/* Stats row */}
            <div className="flex gap-4 mb-8">
              {loadingStats ? (
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <Spinner /> Loading stats…
                </div>
              ) : (
                <>
                  <StatCard label="Total Clients" value={stats?.total_companies ?? 0} />
                  <StatCard label="Total Users" value={stats?.total_users ?? 0} />
                  <StatCard label="Total Analyses" value={stats?.total_analyses ?? 0} />
                </>
              )}
            </div>

            {/* Recent analyses table */}
            <div className="bg-[#0D1829] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.07]">
                <h3 className="text-sm font-semibold text-slate-200">Recent Analyses</h3>
                <p className="text-xs text-slate-500 mt-0.5">Last 20 analyses across all clients</p>
              </div>
              {loadingStats ? (
                <div className="flex items-center justify-center py-12 gap-3 text-slate-500 text-sm">
                  <Spinner /> Loading…
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Project</th>
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Type</th>
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Files</th>
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats?.recent_analyses ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-slate-600">No analyses yet</td>
                        </tr>
                      ) : (
                        (stats?.recent_analyses ?? []).map((a) => (
                          <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3 text-slate-200 font-medium truncate max-w-xs">{a.project_name || "—"}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                a.file_type === "baseline"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-blue-500/15 text-blue-400"
                              }`}>
                                {a.file_type}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-400">{(a.filenames ?? []).length} file{(a.filenames ?? []).length !== 1 ? "s" : ""}</td>
                            <td className="px-5 py-3 text-slate-500">{new Date(a.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Clients Tab ── */}
        {tab === "clients" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Clients</h3>
                <p className="text-xs text-slate-500 mt-0.5">{companies.length} client{companies.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={() => setShowAddCompany(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Client
              </button>
            </div>

            <div className="bg-[#0D1829] border border-white/[0.07] rounded-2xl overflow-hidden">
              {loadingCompanies ? (
                <div className="flex items-center justify-center py-12 gap-3 text-slate-500 text-sm">
                  <Spinner /> Loading clients…
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Company Name</th>
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">URL</th>
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Users</th>
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Analyses</th>
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Created</th>
                        <th className="text-right px-5 py-3 text-slate-500 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-slate-600">No clients yet</td>
                        </tr>
                      ) : (
                        companies.map((c) => {
                          const isOwn = currentUser?.company_id ? false : false; // guard
                          return (
                            <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="px-5 py-3 text-slate-200 font-medium">{c.name}</td>
                              <td className="px-5 py-3">
                                <a
                                  href={`/${c.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-500 hover:text-slate-300 transition-colors font-mono"
                                >
                                  /{c.slug}
                                </a>
                              </td>
                              <td className="px-5 py-3 text-slate-400">{c.user_count}</td>
                              <td className="px-5 py-3 text-slate-400">{c.analysis_count}</td>
                              <td className="px-5 py-3 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2 justify-end">
                                  <button
                                    onClick={() => setRenameTarget(c)}
                                    className="px-2.5 py-1 text-[10px] font-medium text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:border-white/[0.15] rounded-lg transition-all"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget(c)}
                                    className="px-2.5 py-1 text-[10px] font-medium text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-all"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Users Tab ── */}
        {tab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Users</h3>
                <p className="text-xs text-slate-500 mt-0.5">{users.length} user{users.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add User
              </button>
            </div>

            <div className="bg-[#0D1829] border border-white/[0.07] rounded-2xl overflow-hidden">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12 gap-3 text-slate-500 text-sm">
                  <Spinner /> Loading users…
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Name</th>
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Email</th>
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Role</th>
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Company</th>
                        <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                        <th className="text-right px-5 py-3 text-slate-500 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-slate-600">No users yet</td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3 text-slate-200 font-medium">{u.name}</td>
                            <td className="px-5 py-3 text-slate-400">{u.email}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.role === "admin"
                                  ? "bg-blue-500/15 text-blue-400"
                                  : "bg-white/[0.06] text-slate-400"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <Select
                                value={u.company_id ?? ""}
                                onChange={(e) => handleChangeCompany(u, Number(e.target.value))}
                                className="!py-1 !px-2 !text-[11px] !rounded-lg min-w-[130px]"
                                title="Assign this user to a client"
                              >
                                {u.company_id === null && (
                                  <option value="" disabled style={OPTION_STYLE}>— Unassigned —</option>
                                )}
                                {companies.map((c) => (
                                  <option key={c.id} value={c.id} style={OPTION_STYLE}>{c.name}</option>
                                ))}
                              </Select>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.is_active !== false
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-red-500/15 text-red-400"
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${u.is_active !== false ? "bg-emerald-400" : "bg-red-400"}`} />
                                {u.is_active !== false ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  onClick={() => handleToggleRole(u)}
                                  disabled={u.id === currentUser?.id}
                                  className="px-2.5 py-1 text-[10px] font-medium text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:border-white/[0.15] rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={u.role === "admin" ? "Make user" : "Make admin"}
                                >
                                  {u.role === "admin" ? "→ User" : "→ Admin"}
                                </button>
                                <button
                                  onClick={() => handleToggleActive(u)}
                                  disabled={u.id === currentUser?.id}
                                  className={`px-2.5 py-1 text-[10px] font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                    u.is_active !== false
                                      ? "text-amber-500 border border-amber-500/20 hover:border-amber-500/40"
                                      : "text-emerald-500 border border-emerald-500/20 hover:border-emerald-500/40"
                                  }`}
                                >
                                  {u.is_active !== false ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  onClick={() => setDeleteUserTarget(u)}
                                  disabled={u.id === currentUser?.id}
                                  className="px-2.5 py-1 text-[10px] font-medium text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={u.id === currentUser?.id ? "You cannot delete your own account" : "Delete this user permanently"}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAddCompany && (
        <AddCompanyModal
          onClose={() => setShowAddCompany(false)}
          onCreated={() => reloadCompanies()}
        />
      )}

      {renameTarget && (
        <RenameCompanyModal
          company={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRenamed={() => { reloadCompanies(); setRenameTarget(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteCompanyDialog
          company={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { reloadCompanies(); setDeleteTarget(null); }}
        />
      )}

      {showAddUser && (
        <AddUserModal
          companies={companies}
          onClose={() => setShowAddUser(false)}
          onCreated={() => { reloadUsers(); reloadCompanies(); }}
        />
      )}

      {deleteUserTarget && (
        <DeleteUserDialog
          user={deleteUserTarget}
          onClose={() => setDeleteUserTarget(null)}
          onDeleted={() => { reloadUsers(); reloadCompanies(); setDeleteUserTarget(null); }}
        />
      )}
    </div>
  );
}

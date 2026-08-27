"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  UserPlus,
  Mail,
  Search,
  Upload,
} from "lucide-react";

type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: "active" | "invited";
  created_at: string;
  last_sign_in_at: string | null;
};

export default function PeoplePage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("learner");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");

  // Edit modal state
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMessage, setEditMessage] = useState("");

  // Delete confirmation
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk import state
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [csvUsers, setCsvUsers] = useState<
    { email: string; full_name: string; role: string }[]
  >([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    invited: number;
    failed: number;
    skipped: number;
  } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/users");

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to load users");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setUsers(data.users);
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMessage("");

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail.trim(),
        full_name: inviteName.trim(),
        role: inviteRole,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setInviteMessage(data.error || "Failed to send invitation");
      setInviting(false);
      return;
    }

    setInviteMessage(data.warning || "Invitation sent successfully.");
    setInviteEmail("");
    setInviteName("");
    setInviteRole("learner");
    setInviting(false);

    // Refresh the user list
    fetchUsers();

    setTimeout(() => {
      setShowInvite(false);
      setInviteMessage("");
    }, 1500);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;

    setSaving(true);
    setEditMessage("");

    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: editName.trim(),
        role: editRole,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setEditMessage(data.error || "Failed to update user");
      setSaving(false);
      return;
    }

    setEditMessage("User updated.");
    setSaving(false);
    fetchUsers();
    router.refresh();

    setTimeout(() => {
      setEditUser(null);
      setEditMessage("");
    }, 1000);
  }

  async function handleDelete() {
    if (!deleteUser) return;

    setDeleting(true);

    const res = await fetch(`/api/admin/users/${deleteUser.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete user");
    }

    setDeleting(false);
    setDeleteUser(null);
    fetchUsers();
    router.refresh();
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvUsers([]);
        return;
      }

      // Parse header
      const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const emailIdx = header.findIndex((h) =>
        h.includes("email")
      );
      const nameIdx = header.findIndex(
        (h) => h.includes("name") || h.includes("full")
      );
      const roleIdx = header.findIndex((h) => h.includes("role"));

      if (emailIdx < 0) {
        setCsvUsers([]);
        return;
      }

      const parsed = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        return {
          email: cols[emailIdx] ?? "",
          full_name: nameIdx >= 0 ? cols[nameIdx] ?? "" : "",
          role: roleIdx >= 0 ? cols[roleIdx]?.toLowerCase() ?? "learner" : "learner",
        };
      }).filter((u) => u.email.includes("@"));

      setCsvUsers(parsed);
    };
    reader.readAsText(file);
  }

  async function handleBulkInvite() {
    if (csvUsers.length === 0) return;
    setBulkImporting(true);
    setBulkResults(null);

    const res = await fetch("/api/admin/bulk-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users: csvUsers }),
    });

    const data = await res.json();
    setBulkImporting(false);

    if (res.ok && data.summary) {
      setBulkResults(data.summary);
      fetchUsers();
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            People
          </h1>

          <div className="mt-3 h-1 w-12 rounded-full bg-pd-red" />

          <p className="mt-4 flex items-center gap-2 text-slate-500">
            Manage users and send invitations.
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {users.length} total
            </span>
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowBulkImport(true);
              setCsvUsers([]);
              setBulkResults(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Upload size={18} />
            Bulk Import
          </button>

          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-pd-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pd-red-hover"
          >
            <UserPlus size={18} />
            Invite user
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-pd-red"
          />
        </div>
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 font-semibold text-slate-700">Name</th>
              <th className="px-6 py-3.5 font-semibold text-slate-700">Email</th>
              <th className="px-6 py-3.5 font-semibold text-slate-700">Role</th>
              <th className="px-6 py-3.5 font-semibold text-slate-700">Status</th>
              <th className="px-6 py-3.5 font-semibold text-slate-700">
                Last sign in
              </th>
              <th className="px-6 py-3.5 font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-slate-400"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {u.full_name || "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        u.status === "active"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          u.status === "active"
                            ? "bg-green-500"
                            : "bg-amber-500"
                        }`}
                      />
                      {u.status === "active" ? "Active" : "Invited"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditUser(u);
                          setEditName(u.full_name);
                          setEditRole(u.role);
                          setEditMessage("");
                        }}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title="Edit user"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => setDeleteUser(u)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-right text-xs text-slate-400">
        {search
          ? `Showing ${filteredUsers.length} of ${users.length}`
          : `${users.length} user${users.length !== 1 ? "s" : ""} total`}
      </p>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Invite a user
              </h2>
              <button
                onClick={() => {
                  setShowInvite(false);
                  setInviteMessage("");
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Full name{" "}
                  <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
                  placeholder="Their full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
                >
                  <option value="learner">Learner</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Sets the user&apos;s access level immediately.
                </p>
              </div>

              {inviteMessage && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {inviteMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInvite(false);
                    setInviteMessage("");
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="inline-flex items-center gap-2 rounded-xl bg-pd-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pd-red-hover disabled:opacity-50"
                >
                  {inviting && <Loader2 size={16} className="animate-spin" />}
                  <Mail size={16} />
                  {inviting ? "Sending..." : "Send invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Edit user
              </h2>
              <button
                onClick={() => setEditUser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-500">{editUser.email}</p>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-pd-red"
                >
                  <option value="learner">Learner</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {editMessage && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {editMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-pd-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pd-red-hover disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Delete user?
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              This will permanently remove{" "}
              <span className="font-medium text-slate-700">
                {deleteUser.full_name || deleteUser.email}
              </span>{" "}
              and all their data. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                <Trash2 size={16} />
                {deleting ? "Deleting..." : "Delete user"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import modal */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Bulk Import Users
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload a CSV file with columns: email, full_name, role
                </p>
              </div>
              <button
                onClick={() => setShowBulkImport(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* File upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select CSV file
                </label>

                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      const csv = "email,full_name,role\njohn@example.com,John Smith,learner\njane@example.com,Jane Doe,admin\n";
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "user_import_template.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-pd-red hover:text-pd-red-hover"
                  >
                    <Upload size={15} />
                    Download CSV template
                  </button>
                </div>

                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-pd-red/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-pd-red"
                />
                <p className="mt-2 text-xs text-slate-400">
                  CSV format: email, full_name (optional), role (optional:
                  learner/admin/super_admin). First row should be headers.
                </p>
              </div>

              {/* Preview table */}
              {csvUsers.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Preview ({csvUsers.length} users)
                  </p>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 border-b border-slate-200 bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 font-medium text-slate-600">
                            Email
                          </th>
                          <th className="px-4 py-2 font-medium text-slate-600">
                            Name
                          </th>
                          <th className="px-4 py-2 font-medium text-slate-600">
                            Role
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvUsers.map((u, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-slate-900">
                              {u.email}
                            </td>
                            <td className="px-4 py-2 text-slate-600">
                              {u.full_name || "—"}
                            </td>
                            <td className="px-4 py-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                                {u.role}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Results */}
              {bulkResults && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
                  <p className="font-medium text-slate-900">Import complete</p>
                  <div className="mt-2 flex gap-4">
                    <span className="text-green-700">
                      {bulkResults.invited} invited
                    </span>
                    {bulkResults.failed > 0 && (
                      <span className="text-red-600">
                        {bulkResults.failed} failed
                      </span>
                    )}
                    {bulkResults.skipped > 0 && (
                      <span className="text-slate-500">
                        {bulkResults.skipped} skipped
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button
                onClick={() => setShowBulkImport(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {bulkResults ? "Done" : "Cancel"}
              </button>
              {!bulkResults && (
                <button
                  onClick={handleBulkInvite}
                  disabled={bulkImporting || csvUsers.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-pd-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pd-red-hover disabled:opacity-50"
                >
                  {bulkImporting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {bulkImporting
                    ? "Inviting..."
                    : `Invite ${csvUsers.length} users`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

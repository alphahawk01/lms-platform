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
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setInviteMessage(data.error || "Failed to send invitation");
      setInviting(false);
      return;
    }

    setInviteMessage("Invitation sent successfully.");
    setInviteEmail("");
    setInviteName("");
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

          <p className="mt-4 text-slate-500">
            Manage users and send invitations.
          </p>
        </div>

        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-pd-red px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pd-red-hover"
        >
          <UserPlus size={18} />
          Invite user
        </button>
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
        {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
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
    </div>
  );
}

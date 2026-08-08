import React, { useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { SERVER_ROOT } from "../services/api";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/users/me", { full_name: fullName, bio });
      updateUser(data);
      showToast("Profile updated", "success");
    } catch {
      showToast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploadingAvatar(true);
    try {
      const { data } = await api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser(data);
      showToast("Avatar updated", "success");
    } catch {
      showToast("Failed to upload avatar", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="p-6 pb-28 max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-8">Your Profile</h1>

      <div className="flex items-center gap-5 mb-8">
        <div className="w-20 h-20 rounded-full bg-brand-green overflow-hidden flex items-center justify-center text-black text-2xl font-bold shrink-0">
          {user?.avatar_path ? (
            <img src={`${SERVER_ROOT}/uploads/${user.avatar_path}`} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            user?.username?.[0]?.toUpperCase()
          )}
        </div>
        <div>
          <label className="text-sm text-brand-green hover:underline cursor-pointer">
            {uploadingAvatar ? "Uploading..." : "Change photo"}
            <input type="file" accept=".jpg,.jpeg,.png,.webp" hidden onChange={handleAvatarChange} disabled={uploadingAvatar} />
          </label>
          <p className="text-xs text-textmuted mt-1">JPG, PNG or WEBP</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-textmuted mb-1 block">Username</label>
          <input disabled value={user?.username || ""} className="w-full bg-surface-hover border border-surface-border rounded-md px-3 py-2 text-sm text-textmuted" />
        </div>
        <div>
          <label className="text-xs text-textmuted mb-1 block">Email</label>
          <input disabled value={user?.email || ""} className="w-full bg-surface-hover border border-surface-border rounded-md px-3 py-2 text-sm text-textmuted" />
        </div>
        <div>
          <label className="text-xs text-textmuted mb-1 block">Full Name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
        </div>
        <div>
          <label className="text-xs text-textmuted mb-1 block">Bio</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="self-start bg-brand-green hover:bg-brand-greenDark text-black font-semibold rounded-full px-6 py-2.5 text-sm disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

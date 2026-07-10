"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Input from "@/shared/components/Input";
import Badge from "@/shared/components/Badge";
import Icon from "@/shared/components/Icon";
import Modal from "@/shared/components/Modal";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
];

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => (n != null && n > 0) ? `$${n.toFixed(4)}` : "$0.00";
const fmtShortCost = (n) => {
  if (!n || n === 0) return "$0";
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
};

// ── Main Component ──────────────────────────────────────────

export default function TeamsTab() {
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Team form state
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Member form state
  const [memberKey, setMemberKey] = useState("");
  const [memberType, setMemberType] = useState("connection");
  const [memberName, setMemberName] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Team detail state
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [teamUsage, setTeamUsage] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [period, setPeriod] = useState("7d");

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeams(data.teams || []);
    } catch (e) {
      console.error("Failed to fetch teams:", e);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  // Fetch team detail (members + usage)
  const fetchTeamDetail = useCallback(async (teamId, p) => {
    setLoadingMembers(true);
    setLoadingUsage(true);
    try {
      const [membersRes, usageRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/members`),
        fetch(`/api/teams/${teamId}/usage?period=${p}`),
      ]);
      const membersData = await membersRes.json();
      const usageData = await usageRes.json();
      setMembers(membersData.members || []);
      setTeamUsage(usageData);
    } catch (e) {
      console.error("Failed to fetch team detail:", e);
    } finally {
      setLoadingMembers(false);
      setLoadingUsage(false);
    }
  }, []);

  // Select a team
  const selectTeam = useCallback((team) => {
    setSelectedTeam(team);
    fetchTeamDetail(team.id, period);
  }, [fetchTeamDetail, period]);

  // Change period — refetch usage when period changes
  useEffect(() => {
    if (selectedTeam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on period change
      fetchTeamDetail(selectedTeam.id, period);
    }
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  // Create team
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim(), description: teamDescription }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setTeamName("");
        setTeamDescription("");
        await fetchTeams();
      }
    } catch (e) {
      console.error("Failed to create team:", e);
    } finally {
      setSaving(false);
    }
  };

  // Edit team
  const handleEdit = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim(), description: teamDescription }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTeam(data.team);
        setShowEditModal(false);
        setTeamName("");
        setTeamDescription("");
        await fetchTeams();
      }
    } catch (e) {
      console.error("Failed to update team:", e);
    } finally {
      setSaving(false);
    }
  };

  // Delete team
  const handleDelete = async () => {
    if (!confirm(`Delete team "${selectedTeam.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedTeam(null);
        setTeamUsage(null);
        setMembers([]);
        await fetchTeams();
      }
    } catch (e) {
      console.error("Failed to delete team:", e);
    }
  };

  // Add member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberKey.trim()) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberKey: memberKey.trim(), memberType, memberName: memberName || null }),
      });
      if (res.ok) {
        setMemberKey("");
        setMemberType("connection");
        setMemberName("");
        fetchTeamDetail(selectedTeam.id, period);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add member");
      }
    } catch (e) {
      console.error("Failed to add member:", e);
    } finally {
      setAddingMember(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId) => {
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        fetchTeamDetail(selectedTeam.id, period);
      }
    } catch (e) {
      console.error("Failed to remove member:", e);
    }
  };

  // Open edit modal
  const openEditModal = () => {
    setTeamName(selectedTeam.name || "");
    setTeamDescription(selectedTeam.description || "");
    setShowEditModal(true);
  };

  // ── Render ────────────────────────────────────────────────

  if (loadingTeams) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        <Icon name="progress_activity" size={32} className="animate-spin" />
      </div>
    );
  }

  // If a team is selected, show team detail
  if (selectedTeam) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <button
            className="p-1.5 rounded-[6px] hover:bg-surface-2 text-text-muted hover:text-text-main transition-colors"
            onClick={() => { setSelectedTeam(null); setTeamUsage(null); setMembers([]); }}
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{selectedTeam.name}</h2>
            {selectedTeam.description && (
              <p className="text-sm text-text-muted truncate">{selectedTeam.description}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" icon="edit" onClick={openEditModal}>Edit</Button>
          <Button variant="ghost" size="sm" icon="delete" className="text-red-500 hover:text-red-600" onClick={handleDelete}>Delete</Button>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted font-medium">Period:</span>
          <div className="inline-flex items-center p-1 rounded-[6px] bg-surface-2">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded-[6px] text-xs font-medium transition-all ${
                  period === p.value ? "bg-surface text-text-main shadow-sm" : "text-text-muted hover:text-text-main"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Usage summary cards */}
        {teamUsage && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card padding="xs" className="flex flex-col gap-1 px-4 py-3">
              <span className="text-text-muted text-xs uppercase font-semibold">Requests</span>
              <span className="text-xl font-bold">{fmt(teamUsage.totalRequests)}</span>
            </Card>
            <Card padding="xs" className="flex flex-col gap-1 px-4 py-3">
              <span className="text-text-muted text-xs uppercase font-semibold">Tokens In</span>
              <span className="text-xl font-bold text-primary">{fmt(teamUsage.totalPromptTokens)}</span>
            </Card>
            <Card padding="xs" className="flex flex-col gap-1 px-4 py-3">
              <span className="text-text-muted text-xs uppercase font-semibold">Tokens Out</span>
              <span className="text-xl font-bold text-success">{fmt(teamUsage.totalCompletionTokens)}</span>
            </Card>
            <Card padding="xs" className="flex flex-col gap-1 px-4 py-3">
              <span className="text-text-muted text-xs uppercase font-semibold">Total Cost</span>
              <span className="text-xl font-bold text-warning">{fmtShortCost(teamUsage.totalCost)}</span>
            </Card>
          </div>
        )}

        {/* Two-column: Members + Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Members panel */}
          <Card title="Members" icon="group" padding="none">
            <div className="px-4 pb-3">
              {/* Add member form */}
              <form onSubmit={handleAddMember} className="flex flex-col gap-2 mt-3">
                <div className="flex gap-2">
                  <select
                    value={memberType}
                    onChange={(e) => setMemberType(e.target.value)}
                    className="h-9 px-2 rounded-[6px] bg-surface-2 border border-border text-sm text-text-main"
                  >
                    <option value="connection">Connection ID</option>
                    <option value="apikey">API Key</option>
                  </select>
                  <Input
                    placeholder={memberType === "connection" ? "Paste connection ID" : "Paste API key"}
                    value={memberKey}
                    onChange={(e) => setMemberKey(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Display name (optional)"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" icon="add" loading={addingMember} disabled={!memberKey.trim()}>
                    Add
                  </Button>
                </div>
              </form>
            </div>

            {/* Members list */}
            <div className="divide-y divide-border-subtle">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8 text-text-muted">
                  <Icon name="progress_activity" size={20} className="animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <div className="px-4 py-8 text-center text-text-muted text-sm">
                  No members yet. Add members by Connection ID or API Key.
                </div>
              ) : (
                members.map((m) => (
                  <Card.ListItem
                    key={m.id}
                    actions={
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="delete"
                        className="text-red-500 hover:text-red-600 !px-2"
                        onClick={() => handleRemoveMember(m.id)}
                      />
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.memberName || (m.memberKey.length > 20 ? `${m.memberKey.slice(0, 12)}...${m.memberKey.slice(-8)}` : m.memberKey)}
                        </p>
                        <p className="text-[11px] text-text-muted font-mono truncate" title={m.memberKey}>
                          {m.memberKey}
                        </p>
                      </div>
                      <Badge variant="neutral" size="sm">{m.memberType}</Badge>
                    </div>
                  </Card.ListItem>
                ))
              )}
            </div>
          </Card>

          {/* Usage breakdown panel */}
          <Card title="Usage Breakdown" icon="bar_chart" padding="none">
            {loadingUsage ? (
              <div className="flex items-center justify-center py-8 text-text-muted">
                <Icon name="progress_activity" size={20} className="animate-spin" />
              </div>
            ) : !teamUsage || teamUsage.totalRequests === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted text-sm">
                No usage data for this period.
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {/* By Provider */}
                {Object.keys(teamUsage.byProvider).length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-text-muted uppercase mb-2">By Provider</p>
                    {Object.entries(teamUsage.byProvider)
                      .sort((a, b) => b[1].cost - a[1].cost)
                      .map(([prov, st]) => (
                        <div key={prov} className="flex items-center justify-between py-1 text-sm">
                          <span className="font-medium">{prov}</span>
                          <span className="text-xs text-text-muted">
                            {fmt(st.requests)} req · {fmtShortCost(st.cost)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {/* By Member */}
                {Object.keys(teamUsage.byMember).length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-text-muted uppercase mb-2">By Member</p>
                    {Object.entries(teamUsage.byMember)
                      .sort((a, b) => b[1].cost - a[1].cost)
                      .map(([name, st]) => (
                        <div key={name} className="flex items-center justify-between py-1 text-sm">
                          <span className="font-medium truncate max-w-[150px]">{name}</span>
                          <span className="text-xs text-text-muted">
                            {fmt(st.requests)} req · {fmtShortCost(st.cost)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {/* By Model */}
                {Object.keys(teamUsage.byModel).length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-text-muted uppercase mb-2">By Model</p>
                    {Object.entries(teamUsage.byModel)
                      .sort((a, b) => b[1].cost - a[1].cost)
                      .slice(0, 10)
                      .map(([model, st]) => (
                        <div key={model} className="flex items-center justify-between py-1 text-sm">
                          <span className="font-medium truncate max-w-[180px]">{model}</span>
                          <span className="text-xs text-text-muted">
                            {fmt(st.requests)} req · {fmtShortCost(st.cost)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Team"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowEditModal(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={handleEdit} loading={saving}>Save</Button>
            </>
          }
        >
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-main">Team Name</span>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="My Team" required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-main">Description</span>
              <Input value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} placeholder="Optional description" />
            </label>
          </form>
        </Modal>
      </div>
    );
  }

  // ── Team list view ─────────────────────────────────────────

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Teams</h2>
          <p className="text-sm text-text-muted">
            Group members to track combined usage across connections and API keys
          </p>
        </div>
        <Button icon="add" size="sm" onClick={() => setShowCreateModal(true)}>
          New Team
        </Button>
      </div>

      {/* Team list */}
      {teams.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-3">
          <Icon name="group" size={48} className="text-text-muted/40" />
          <div className="text-center">
            <p className="text-text-muted font-medium">No teams yet</p>
            <p className="text-text-muted/60 text-sm mt-1">
              Create a team to track combined usage across multiple members
            </p>
          </div>
          <Button variant="secondary" size="sm" icon="add" onClick={() => setShowCreateModal(true)}>
            Create Your First Team
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              hover
              padding="sm"
              className="cursor-pointer"
              onClick={() => selectTeam(team)}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-[6px] bg-brand-500/10 text-brand-500">
                  <Icon name="group" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{team.name}</h3>
                  {team.description && (
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{team.description}</p>
                  )}
                  <p className="text-[10px] text-text-muted/60 mt-1.5">
                    Created {new Date(team.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Icon name="chevron_right" size={18} className="text-text-muted flex-shrink-0 mt-1" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Team"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving}>Create</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-main">Team Name</span>
            <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="My Team" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-main">Description</span>
            <Input value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} placeholder="Optional description" />
          </label>
        </form>
      </Modal>
    </div>
  );
}

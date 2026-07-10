import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";

/**
 * Teams repository — CRUD for teams and team members,
 * plus team-level usage aggregation.
 */

// ── Teams CRUD ──────────────────────────────────────────────

export async function getTeams() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM teams ORDER BY name ASC`);
  return rows.map(rowToTeam);
}

export async function getTeamById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM teams WHERE id = ?`, [id]);
  return row ? rowToTeam(row) : null;
}

export async function createTeam({ name, description }) {
  const db = await getAdapter();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO teams(id, name, description, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?)`,
    [id, name, description || null, now, now]
  );
  return getTeamById(id);
}

export async function updateTeam(id, { name, description }) {
  const db = await getAdapter();
  const existing = db.get(`SELECT * FROM teams WHERE id = ?`, [id]);
  if (!existing) return null;
  const now = new Date().toISOString();
  db.run(
    `UPDATE teams SET name = ?, description = ?, updatedAt = ? WHERE id = ?`,
    [name ?? existing.name, description ?? existing.description, now, id]
  );
  return getTeamById(id);
}

export async function deleteTeam(id) {
  const db = await getAdapter();
  // teamMembers cascades via FK, but delete explicitly anyway
  db.run(`DELETE FROM teamMembers WHERE teamId = ?`, [id]);
  db.run(`DELETE FROM teams WHERE id = ?`, [id]);
}

// ── Team Members CRUD ───────────────────────────────────────

export async function getTeamMembers(teamId) {
  const db = await getAdapter();
  const rows = db.all(
    `SELECT * FROM teamMembers WHERE teamId = ? ORDER BY createdAt ASC`,
    [teamId]
  );
  return rows.map(rowToMember);
}

export async function addTeamMember({ teamId, memberKey, memberType, memberName }) {
  const db = await getAdapter();
  // Check team exists
  const team = db.get(`SELECT id FROM teams WHERE id = ?`, [teamId]);
  if (!team) throw new Error(`Team ${teamId} not found`);

  // Deduplicate — same (teamId, memberKey) pair
  const existing = db.get(
    `SELECT * FROM teamMembers WHERE teamId = ? AND memberKey = ?`,
    [teamId, memberKey]
  );
  if (existing) return rowToMember(existing);

  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO teamMembers(id, teamId, memberKey, memberType, memberName, createdAt) VALUES(?, ?, ?, ?, ?, ?)`,
    [id, teamId, memberKey, memberType, memberName || null, now]
  );
  return rowToMember(db.get(`SELECT * FROM teamMembers WHERE id = ?`, [id]));
}

export async function removeTeamMember(memberId) {
  const db = await getAdapter();
  db.run(`DELETE FROM teamMembers WHERE id = ?`, [memberId]);
}

// ── Team Usage ──────────────────────────────────────────────

/**
 * Aggregate usage for a team by joining teamMembers → usageHistory.
 * @param {string} teamId
 * @param {string} period — "today" | "24h" | "7d" | "30d" | "60d"
 */
export async function getTeamUsage(teamId, period = "7d") {
  const db = await getAdapter();
  const members = await getTeamMembers(teamId);
  if (!members.length) {
    return emptyUsageStats();
  }

  const PERIOD_MS = { "24h": 86400000, "7d": 604800000, "30d": 2592000000, "60d": 5184000000 };

  let cutoff;
  if (period === "today") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    cutoff = startOfDay.toISOString();
  } else {
    const ms = PERIOD_MS[period] || PERIOD_MS["7d"];
    cutoff = new Date(Date.now() - ms).toISOString();
  }

  const memberKeys = members.map((m) => m.memberKey);
  const placeholders = memberKeys.map(() => "?").join(", ");

  // Match usageHistory by connectionId OR apiKey
  const rows = db.all(
    `SELECT timestamp, provider, model, connectionId, apiKey,
            promptTokens, completionTokens, cost, sessionId, clientTool
     FROM usageHistory
     WHERE timestamp >= ?
       AND (connectionId IN (${placeholders}) OR apiKey IN (${placeholders}))
     ORDER BY timestamp DESC`,
    [cutoff, ...memberKeys, ...memberKeys]
  );

  return aggregateRows(rows, members);
}

function emptyUsageStats() {
  return {
    totalRequests: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalCost: 0,
    byProvider: {},
    byModel: {},
    byMember: {},
    recentRequests: [],
    chartData: [],
  };
}

function aggregateRows(rows, members) {
  const memberMap = {};
  for (const m of members) {
    memberMap[m.memberKey] = m.memberName || m.memberKey.slice(0, 12) + "...";
  }

  const stats = {
    totalRequests: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalCost: 0,
    byProvider: {},
    byModel: {},
    byMember: {},
    recentRequests: [],
  };

  for (const r of rows) {
    stats.totalRequests++;
    stats.totalPromptTokens += r.promptTokens || 0;
    stats.totalCompletionTokens += r.completionTokens || 0;
    stats.totalCost += r.cost || 0;

    // byProvider
    const prov = r.provider || "unknown";
    if (!stats.byProvider[prov]) {
      stats.byProvider[prov] = { requests: 0, promptTokens: 0, completionTokens: 0, cost: 0 };
    }
    stats.byProvider[prov].requests++;
    stats.byProvider[prov].promptTokens += r.promptTokens || 0;
    stats.byProvider[prov].completionTokens += r.completionTokens || 0;
    stats.byProvider[prov].cost += r.cost || 0;

    // byModel
    const modelKey = r.provider ? `${r.model} (${r.provider})` : r.model;
    if (!stats.byModel[modelKey]) {
      stats.byModel[modelKey] = { requests: 0, promptTokens: 0, completionTokens: 0, cost: 0 };
    }
    stats.byModel[modelKey].requests++;
    stats.byModel[modelKey].promptTokens += r.promptTokens || 0;
    stats.byModel[modelKey].completionTokens += r.completionTokens || 0;
    stats.byModel[modelKey].cost += r.cost || 0;

    // byMember — match by connectionId or apiKey
    const matchedKey = members.find(
      (m) => m.memberKey === r.connectionId || m.memberKey === r.apiKey
    );
    if (matchedKey) {
      const name = memberMap[matchedKey.memberKey] || matchedKey.memberKey;
      if (!stats.byMember[name]) {
        stats.byMember[name] = { requests: 0, promptTokens: 0, completionTokens: 0, cost: 0 };
      }
      stats.byMember[name].requests++;
      stats.byMember[name].promptTokens += r.promptTokens || 0;
      stats.byMember[name].completionTokens += r.completionTokens || 0;
      stats.byMember[name].cost += r.cost || 0;
    }

    // Recent requests (last 20)
    if (stats.recentRequests.length < 20) {
      stats.recentRequests.push({
        timestamp: r.timestamp,
        provider: r.provider,
        model: r.model,
        promptTokens: r.promptTokens || 0,
        completionTokens: r.completionTokens || 0,
        cost: r.cost || 0,
        sessionId: r.sessionId || null,
        clientTool: r.clientTool || null,
      });
    }
  }

  return stats;
}

// ── Helpers ─────────────────────────────────────────────────

function rowToTeam(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    teamId: row.teamId,
    memberKey: row.memberKey,
    memberType: row.memberType,
    memberName: row.memberName,
    createdAt: row.createdAt,
  };
}

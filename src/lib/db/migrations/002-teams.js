// Add teams and teamMembers tables
import { TABLES, buildCreateTableSql } from "../schema.js";

export default {
  version: 2,
  name: "teams",
  up(db) {
    for (const name of ["teams", "teamMembers"]) {
      const def = TABLES[name];
      if (!def) continue;
      db.exec(buildCreateTableSql(name, def));
      for (const idx of def.indexes || []) db.exec(idx);
    }
  },
};

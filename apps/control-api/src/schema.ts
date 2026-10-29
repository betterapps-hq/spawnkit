import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  lifecycle: text("lifecycle").notNull().default("active"),
  configuration: text("configuration", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
  revision: integer("revision").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
})

export const projectHostnames = sqliteTable("project_hostnames", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id),
  slug: text("slug").notNull().unique()
})

export const environments = sqliteTable(
  "environments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    name: text("name").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull(),
    currentReleaseId: text("current_release_id"),
    generation: integer("generation").notNull().default(0)
  },
  (table) => [uniqueIndex("environment_project_name").on(table.projectId, table.name)]
)

export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  sha256: text("sha256").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  status: text("status").notNull(),
  expiresAt: text("expires_at").notNull()
})

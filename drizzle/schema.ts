import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table with username/password authentication
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Checklist table - stores barcode checking sessions
 */
export const checklists = mysqlTable('checklists', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  fileName: varchar('fileName', { length: 255 }).notNull(),
  totalItems: int('totalItems').notNull(),
  completedItems: int('completedItems').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type Checklist = typeof checklists.$inferSelect;
export type InsertChecklist = typeof checklists.$inferInsert;

/**
 * Checklist items table - individual items in a checklist
 */
export const checklistItems = mysqlTable('checklistItems', {
  id: int('id').autoincrement().primaryKey(),
  checklistId: int('checklistId').notNull().references(() => checklists.id, { onDelete: 'cascade' }),
  barcode: varchar('barcode', { length: 255 }).notNull(),
  productName: varchar('productName', { length: 255 }).notNull(),
  productCode: varchar('productCode', { length: 255 }),
  targetQuantity: int('targetQuantity').notNull(),
  verifiedQuantity: int('verifiedQuantity').default(0).notNull(),
  isCompleted: boolean('isCompleted').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

/**
 * Scan records table - tracks each barcode scan
 */
export const scanRecords = mysqlTable('scanRecords', {
  id: int('id').autoincrement().primaryKey(),
  checklistId: int('checklistId').notNull().references(() => checklists.id, { onDelete: 'cascade' }),
  barcode: varchar('barcode', { length: 255 }).notNull(),
  scanMethod: varchar('scanMethod', { length: 64 }).notNull(), // 'camera' or 'manual'
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type ScanRecord = typeof scanRecords.$inferSelect;
export type InsertScanRecord = typeof scanRecords.$inferInsert;

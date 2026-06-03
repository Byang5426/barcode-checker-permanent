import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import bcrypt from 'bcryptjs';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Register a new user with username and password
 */
export async function registerUser(username: string, password: string, name?: string): Promise<any> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await db.insert(users).values({
      username,
      password: hashedPassword,
      name: name || username,
      role: 'user',
    });

    // Get the inserted user
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user[0];
  } catch (error) {
    if (error instanceof Error && error.message.includes('Duplicate entry')) {
      throw new Error('Username already exists');
    }
    throw error;
  }
}

/**
 * Authenticate user with username and password
 */
export async function authenticateUser(username: string, password: string): Promise<any> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const user = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (user.length === 0) {
    throw new Error('Invalid username or password');
  }

  const dbUser = user[0];
  const passwordMatch = await bcrypt.compare(password, dbUser.password);

  if (!passwordMatch) {
    throw new Error('Invalid username or password');
  }

  // Update last signed in
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, dbUser.id));

  return dbUser;
}

/**
 * Get user by ID
 */
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.


/**
 * Create a new checklist
 */
export async function createChecklist(userId: number, name: string, fileName: string, totalItems: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(users).values({
    username: name,
    password: '',
  });
}

/**
 * Get all checklists for a user
 */
export async function getChecklistsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { checklists } = await import('../drizzle/schema');
  return await db.select().from(checklists).where(eq(checklists.userId, userId));
}

/**
 * Get a specific checklist by ID
 */
export async function getChecklistById(checklistId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { checklists } = await import('../drizzle/schema');
  return await db.select().from(checklists).where(eq(checklists.id, checklistId));
}

/**
 * Get all items in a checklist
 */
export async function getChecklistItemsByChecklistId(checklistId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { checklistItems } = await import('../drizzle/schema');
  return await db.select().from(checklistItems).where(eq(checklistItems.checklistId, checklistId));
}

/**
 * Get a checklist item by barcode
 */
export async function getChecklistItemByBarcode(checklistId: number, barcode: string) {
  const db = await getDb();
  if (!db) return [];
  
  const { checklistItems } = await import('../drizzle/schema');
  const { and } = await import('drizzle-orm');
  
  return await db.select().from(checklistItems).where(
    and(
      eq(checklistItems.checklistId, checklistId),
      eq(checklistItems.barcode, barcode)
    )
  );
}

/**
 * Get all scan records for a checklist
 */
export async function getScanRecordsByChecklistId(checklistId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { scanRecords } = await import('../drizzle/schema');
  return await db.select().from(scanRecords).where(eq(scanRecords.checklistId, checklistId));
}

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createChecklist, getChecklistsByUserId, getChecklistById, getChecklistItemsByChecklistId, getChecklistItemByBarcode, getScanRecordsByChecklistId, registerUser, authenticateUser } from "./db";
import { parseChecklistFile } from "./fileParser";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { checklistItems, scanRecords, checklists, InsertChecklistItem } from "../drizzle/schema";
import { eq, and, count } from "drizzle-orm";

export const appRouter = router({
    system: systemRouter,
    auth: router({
      me: publicProcedure.query(opts => opts.ctx.user),
      
      register: publicProcedure
        .input(z.object({
          username: z.string().min(3).max(64),
          password: z.string().min(6),
          name: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          try {
            const user = await registerUser(input.username, input.password, input.name);
            return {
              success: true,
              user: {
                id: user.id,
                username: user.username,
                name: user.name,
              },
            };
          } catch (error) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: error instanceof Error ? error.message : 'Registration failed',
            });
          }
        }),

      login: publicProcedure
        .input(z.object({
          username: z.string(),
          password: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
          try {
            const user = await authenticateUser(input.username, input.password);
            
            // Set session cookie using Express cookie method
            const cookieOptions = getSessionCookieOptions(ctx.req);
            const token = JSON.stringify({
              userId: user.id,
              username: user.username,
              name: user.name,
              role: user.role,
            });
            
            ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
            
            return {
              success: true,
              user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
              },
            };
          } catch (error) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: error instanceof Error ? error.message : 'Login failed',
            });
          }
        }),

      logout: publicProcedure.mutation(({ ctx }) => {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return {
          success: true,
        } as const;
      }),
    }),

    checklist: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getChecklistsByUserId(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ checklistId: z.number() }))
      .query(async ({ ctx, input }) => {
        const checklist = await getChecklistById(input.checklistId);
        if (!checklist || checklist.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist not found' });
        }

        const result = checklist[0];
        if (result.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        return result;
      }),

    getItems: protectedProcedure
      .input(z.object({ checklistId: z.number() }))
      .query(async ({ ctx, input }) => {
        const checklist = await getChecklistById(input.checklistId);
        if (!checklist || checklist.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist not found' });
        }
        if (checklist[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        return await getChecklistItemsByChecklistId(input.checklistId);
      }),

    uploadAndParse: protectedProcedure
      .input(z.object({
        fileData: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

        try {
          const buffer = Buffer.from(input.fileData, 'base64');
          const parsed = await parseChecklistFile(buffer, input.fileName);

          const checklistName = input.fileName.replace(/\.[^.]+$/, '');
          const result = await db.insert(checklists).values({
            userId: ctx.user.id,
            name: checklistName,
            fileName: input.fileName,
            totalItems: parsed.items.length,
            completedItems: 0,
          });

          // Get the inserted checklist ID by querying the database
          const insertedChecklists = await db.select().from(checklists)
            .where(eq(checklists.userId, ctx.user.id))
            .orderBy((c) => c.id)
            .limit(1);
          
          if (!insertedChecklists || insertedChecklists.length === 0) {
            throw new Error('Failed to retrieve inserted checklist');
          }
          
          const checklistId = insertedChecklists[insertedChecklists.length - 1].id;

          // Insert all checklist items
          for (const item of parsed.items) {
            await db.insert(checklistItems).values({
              checklistId,
              barcode: item.barcode,
              productName: item.productName,
              productCode: item.productCode || undefined,
              targetQuantity: item.targetQuantity,
              verifiedQuantity: 0,
              isCompleted: false,
            } as any);
          }

          return {
            success: true,
            checklistId,
            itemCount: parsed.items.length,
          };
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error instanceof Error ? error.message : 'Failed to parse file',
          });
        }
      }),

    scan: protectedProcedure
      .input(z.object({
        checklistId: z.number(),
        barcode: z.string(),
        scanMethod: z.enum(['camera', 'manual']),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

        const checklist = await getChecklistById(input.checklistId);
        if (!checklist || checklist.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist not found' });
        }

        if (checklist[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        try {
          const item = await getChecklistItemByBarcode(input.checklistId, input.barcode);
          if (!item || item.length === 0) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Barcode not found in this checklist' });
          }

          const dbItem = item[0];
          const newQuantity = dbItem.verifiedQuantity + 1;
          const isCompleted = newQuantity >= dbItem.targetQuantity;

          await db.update(checklistItems)
            .set({
              verifiedQuantity: newQuantity,
              isCompleted: isCompleted,
            })
            .where(eq(checklistItems.id, dbItem.id));

          // Recompute and persist the parent checklist's completedItems count
          // so the list page stays in sync with the detail page.
          const [completedRow] = await db
            .select({ value: count() })
            .from(checklistItems)
            .where(
              and(
                eq(checklistItems.checklistId, input.checklistId),
                eq(checklistItems.isCompleted, true)
              )
            );
          await db.update(checklists)
            .set({ completedItems: Number(completedRow?.value ?? 0) })
            .where(eq(checklists.id, input.checklistId));

          await db.insert(scanRecords).values({
            checklistId: input.checklistId,
            barcode: input.barcode,
            scanMethod: input.scanMethod,
          });

          return {
            success: true,
            item: dbItem,
            newQuantity,
            isCompleted,
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Scan failed',
          });
        }
      }),

    getScanRecords: protectedProcedure
      .input(z.object({ checklistId: z.number() }))
      .query(async ({ ctx, input }) => {
        const checklist = await getChecklistById(input.checklistId);
        if (!checklist || checklist.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist not found' });
        }

        if (checklist[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        return await getScanRecordsByChecklistId(input.checklistId);
      }),

    reset: protectedProcedure
      .input(z.object({ checklistId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

        const checklist = await getChecklistById(input.checklistId);
        if (!checklist || checklist.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist not found' });
        }

        if (checklist[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        try {
          await db.update(checklistItems)
            .set({ verifiedQuantity: 0, isCompleted: false })
            .where(eq(checklistItems.checklistId, input.checklistId));

          await db.delete(scanRecords)
            .where(eq(scanRecords.checklistId, input.checklistId));

          await db.update(checklists)
            .set({ completedItems: 0 })
            .where(eq(checklists.id, input.checklistId));

          return { success: true };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Reset failed',
          });
        }
      }),

    delete: protectedProcedure
      .input(z.object({ checklistId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

        const checklist = await getChecklistById(input.checklistId);
        if (!checklist || checklist.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist not found' });
        }

        if (checklist[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        try {
          await db.delete(checklists)
            .where(eq(checklists.id, input.checklistId));

          return { success: true };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Delete failed',
          });
        }
      }),
    }),
});

export type AppRouter = typeof appRouter;

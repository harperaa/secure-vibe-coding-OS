import { internalMutation, mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    // Extract primary email from Clerk's email_addresses array
    let primaryEmail: string | undefined;
    if (data.email_addresses && data.primary_email_address_id) {
      const primary = data.email_addresses.find(
        (e: { id: string }) => e.id === data.primary_email_address_id
      );
      primaryEmail = primary?.email_address;
    }

    const userAttributes = {
      name: `${data.first_name} ${data.last_name}`,
      externalId: data.id,
      email: primaryEmail,
    };

    const user = await userByExternalId(ctx, data.id);
    if (user === null) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});



export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("User is not authenticated. Please sign in.");
  }

  const userRecord = await userByExternalId(ctx, identity.subject);
  if (!userRecord) {
    throw new Error(
      `User not found in database. Clerk ID: ${identity.subject}. The user may need to be synced from Clerk.`
    );
  }

  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}

export async function userByEmail(ctx: QueryCtx, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("byEmail", (q) => q.eq("email", email))
    .unique();
}

/**
 * Check if the current user is an admin.
 * Admin is determined by matching email against ADMIN_EMAIL environment variable.
 * Throws an error if ADMIN_EMAIL is not configured.
 */
export async function isCurrentUserAdmin(ctx: QueryCtx): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL environment variable is not configured in Convex dashboard");
  }

  const user = await getCurrentUser(ctx);
  if (!user?.email) return false;

  return user.email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Query to check if the current user is an admin.
 * Used by the frontend to conditionally render admin UI.
 */
export const checkIsAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    return await isCurrentUserAdmin(ctx);
  },
});

/**
 * Check if the current user is an admin (for mutations).
 * Uses the same logic as isCurrentUserAdmin but works with MutationCtx.
 */
export async function isCurrentUserAdminMutation(ctx: MutationCtx): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL environment variable is not configured in Convex dashboard");
  }

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  const user = await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
    .unique();

  if (!user?.email) return false;

  return user.email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Get current user for mutations, with auto-creation fallback
 * Use this in mutations where you want to auto-create the user if they don't exist
 */
export async function getCurrentUserOrThrowForMutation(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("User is not authenticated. Please sign in.");
  }

  let userRecord = await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
    .unique();

  // Auto-create user if they don't exist (fallback for webhook issues)
  if (!userRecord) {
    console.log(`Auto-creating user record for Clerk ID: ${identity.subject}`);
    const userId = await ctx.db.insert("users", {
      name: identity.name ?? identity.email ?? "Unknown User",
      externalId: identity.subject,
      email: identity.email,
    });
    userRecord = await ctx.db.get(userId);
    if (!userRecord) {
      throw new Error("Failed to create user record");
    }
  }

  return userRecord;
}
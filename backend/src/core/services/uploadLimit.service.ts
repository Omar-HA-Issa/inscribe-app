import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../shared/utils/logger";

const WEEKLY_UPLOAD_LIMIT = 5;

/**
 * Get the start of the current week (Monday 00:00 GMT)
 */
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday needs special handling

  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  return weekStart;
}

/**
 * Check if user has reached weekly upload limit
 * Returns: { allowed: boolean, count: number, limit: number, resetDate: Date }
 */
export async function checkUploadLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
  resetDate: Date;
}> {
  const weekStart = getWeekStart();
  const weekStartISO = weekStart.toISOString();

  // Get next Monday for reset date
  const resetDate = new Date(weekStart);
  resetDate.setUTCDate(weekStart.getUTCDate() + 7);

  logger.info(`Checking upload limit for user ${userId}`, {
    weekStart: weekStartISO,
    resetDate: resetDate.toISOString(),
  });

  // Query documents uploaded this week
  const { data, error, count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", weekStartISO);

  if (error) {
    logger.error("Error checking upload limit:", { error });
    throw new Error("Failed to check upload limit");
  }

  const uploadCount = count ?? 0;
  const allowed = uploadCount < WEEKLY_UPLOAD_LIMIT;

  logger.info(`Upload limit check result:`, {
    userId,
    uploadCount,
    limit: WEEKLY_UPLOAD_LIMIT,
    allowed,
  });

  return {
    allowed,
    count: uploadCount,
    limit: WEEKLY_UPLOAD_LIMIT,
    resetDate,
  };
}

/**
 * Get remaining uploads for user this week
 */
export async function getRemainingUploads(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  remaining: number;
  total: number;
  used: number;
  resetDate: Date;
}> {
  const result = await checkUploadLimit(supabase, userId);

  return {
    remaining: Math.max(0, result.limit - result.count),
    total: result.limit,
    used: result.count,
    resetDate: result.resetDate,
  };
}

/**
 * Notifications Repository
 * 
 * Writes to the notifications table that already exists but had
 * nothing writing to it. Now wired into analysis completion,
 * and available for future events (overdue findings, legislation changes).
 */

import { getServiceClient } from './auth';

export type NotificationType = 'analysis_complete' | 'finding_critical' | 'finding_overdue' | 'legislation_change' | 'info';

export interface CreateNotification {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(notification: CreateNotification): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: notification.user_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      link: notification.link || null,
      read: false,
    });

  if (error) {
    console.error('Failed to create notification:', error.message);
  }
}

/**
 * Create notification after analysis completes
 */
export async function notifyAnalysisComplete(
  userId: string,
  score: number,
  sectorName: string,
  documentName: string,
  findingsCount: number,
  criticalCount: number,
): Promise<void> {
  const emoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '🔴';
  
  let message = `Your ${sectorName} document "${documentName}" scored ${score}%.`;
  if (criticalCount > 0) {
    message += ` ${criticalCount} critical finding${criticalCount > 1 ? 's' : ''} need attention.`;
  } else if (findingsCount > 0) {
    message += ` ${findingsCount} finding${findingsCount > 1 ? 's' : ''} created.`;
  }

  await createNotification({
    user_id: userId,
    title: `${emoji} Analysis Complete — ${score}%`,
    message,
    type: 'analysis_complete',
    link: '/dashboard/findings',
  });
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = getServiceClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Get recent notifications for a user
 */
export async function getNotifications(userId: string, limit = 10) {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const supabase = getServiceClient();

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const supabase = getServiceClient();

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}

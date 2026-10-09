export interface ActiveVisitor {
  id: string;
  userId?: number;
  username?: string;
  role?: string;
  isPremium: boolean;
  ip: string;
  userAgent: string;
  currentPath: string;
  firstSeen: number;
  lastSeen: number;
}

const visitorsMap = new Map<string, ActiveVisitor>();
const TIMEOUT_MS = 120 * 1000; // 2 minutes window for active presence

export function recordPresence(params: {
  id: string;
  userId?: number;
  username?: string;
  role?: string;
  isPremium?: boolean;
  ip?: string;
  userAgent?: string;
  currentPath?: string;
}) {
  if (!params.id) return;

  const now = Date.now();
  const existing = visitorsMap.get(params.id);

  visitorsMap.set(params.id, {
    id: params.id,
    userId: params.userId !== undefined ? params.userId : existing?.userId,
    username: params.username || existing?.username,
    role: params.role || existing?.role,
    isPremium: params.isPremium !== undefined ? params.isPremium : (existing?.isPremium || false),
    ip: params.ip || existing?.ip || '127.0.0.1',
    userAgent: params.userAgent || existing?.userAgent || 'Unknown Browser',
    currentPath: params.currentPath || existing?.currentPath || '/',
    firstSeen: existing ? existing.firstSeen : now,
    lastSeen: now
  });
}

export function cleanupInactiveVisitors() {
  const cutoff = Date.now() - TIMEOUT_MS;
  for (const [id, visitor] of visitorsMap.entries()) {
    if (visitor.lastSeen < cutoff) {
      visitorsMap.delete(id);
    }
  }
}

// Prune every 30 seconds
setInterval(cleanupInactiveVisitors, 30000);

export function getOnlinePresenceStats() {
  cleanupInactiveVisitors();

  const now = Date.now();
  const visitorsList = Array.from(visitorsMap.values()).map(v => ({
    id: v.id,
    userId: v.userId,
    username: v.username || (v.userId ? `User #${v.userId}` : 'Guest Viewer'),
    role: v.role || 'guest',
    isPremium: v.isPremium,
    userType: v.isPremium ? 'premium' : (v.userId ? 'free_user' : 'guest'),
    ip: v.ip,
    userAgent: v.userAgent,
    currentPath: v.currentPath,
    lastSeenSecondsAgo: Math.max(0, Math.floor((now - v.lastSeen) / 1000)),
    sessionMinutes: Math.max(1, Math.floor((now - v.firstSeen) / 60000))
  }));

  // Sort by most recently active
  visitorsList.sort((a, b) => a.lastSeenSecondsAgo - b.lastSeenSecondsAgo);

  const totalOnline = visitorsList.length;
  const onlinePremium = visitorsList.filter(v => v.isPremium).length;
  const onlineFree = visitorsList.filter(v => !v.isPremium && v.userId).length;
  const onlineGuests = visitorsList.filter(v => !v.userId).length;

  return {
    totalOnline,
    onlinePremium,
    onlineFree,
    onlineGuests,
    visitors: visitorsList.slice(0, 50)
  };
}

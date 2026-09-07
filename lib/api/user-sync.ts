import { createLogger } from '@/lib/logger';
import { getApiToken } from '@/lib/auth-token';
import { useSessionsStore, type LearningSession } from '@/lib/store/sessions';
import { useLearningPathStore } from '@/lib/store/learning-path';
import { useResourcesStore } from '@/lib/store/resources';
import type { LearningPath } from '@/lib/types/learning-path';
import type { Resource } from '@/lib/types/resource';

const log = createLogger('UserSync');

interface SyncResponse {
  sessions?: LearningSession[];
  learningPaths?: LearningPath[];
  resources?: Resource[];
}

function authHeaders(): Record<string, string> {
  const token = getApiToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Load all user state from the server and merge into local stores.
 * Merges server data with local data so new resources from other devices
 * are always picked up, even if the local store already has data.
 *
 * @param userId - The current user's ID
 */
export async function loadUserStateFromServer(userId: string): Promise<void> {
  try {
    const res = await fetch(
      `/api/v1/user/sync?userId=${encodeURIComponent(userId)}`,
      { headers: { ...authHeaders() } },
    );
    if (!res.ok) {
      log.warn(`loadUserStateFromServer failed: HTTP ${res.status}`);
      return;
    }
    const json = await res.json();
    const data = json?.data as SyncResponse | undefined;
    if (!data) return;

    const hasData = !!(data.sessions?.length || data.learningPaths?.length || data.resources?.length);
    if (!hasData) return;

    // 1. Merge sessions: server has newer → use server; local only → keep local
    if (data.sessions && data.sessions.length > 0) {
      const currentSessions = useSessionsStore.getState().sessions;
      const serverMap = new Map(data.sessions.map((s) => [s.id, s]));
      const localMap = new Map(currentSessions.map((s) => [s.id, s]));

      // Server sessions that local doesn't have
      for (const [id, s] of serverMap) {
        if (!localMap.has(id)) localMap.set(id, s);
      }

      const merged = Array.from(localMap.values());
      const lastSession = merged.reduce((latest, s) =>
        s.updatedAt > latest.updatedAt ? s : latest,
      );

      useSessionsStore.setState({
        sessions: merged,
        currentSessionId: currentSessions.length === 0
          ? lastSession.id
          : useSessionsStore.getState().currentSessionId,
      });
      log.info(`Merged sessions: ${currentSessions.length} local + ${data.sessions.length} server = ${merged.length}`);
    }

    // 2. Merge learning paths: prefer server if it's newer
    if (data.learningPaths && data.learningPaths.length > 0) {
      const currentPath = useLearningPathStore.getState().path;
      const latestServer = data.learningPaths.reduce((latest, p) =>
        p.updatedAt > latest.updatedAt ? p : latest,
      );

      if (!currentPath || latestServer.updatedAt > currentPath.updatedAt) {
        // Merge: keep local nodes that have resources, supplement with server nodes
        if (currentPath) {
          const serverNodeMap = new Map(latestServer.nodes.map((n) => [n.id, n]));
          for (const node of currentPath.nodes) {
            if (!serverNodeMap.has(node.id)) {
              latestServer.nodes.push(node);
            }
          }
        }
        useLearningPathStore.getState().setPath(latestServer);
        log.info(`Loaded learning path from server (updatedAt=${latestServer.updatedAt})`);
      }
    }

    // 3. Merge resources: always pull new ones from server
    if (data.resources && data.resources.length > 0) {
      const sid = useSessionsStore.getState().currentSessionId;
      if (sid) {
        // Reset sync flag so we always check for new data on each page load
        useResourcesStore.setState({ synced: false });
        await useResourcesStore.getState().syncFromServer(userId, sid);
      }
    }
  } catch (err) {
    log.error('loadUserStateFromServer failed:', err);
  }
}

/**
 * Save all user state (sessions + learning paths + resources) to the server.
 */
export async function saveUserStateToServer(userId: string): Promise<void> {
  try {
    const sessionState = useSessionsStore.getState();
    const pathState = useLearningPathStore.getState();
    const resourceState = useResourcesStore.getState();

    const payload: {
      sessions?: LearningSession[];
      learningPaths?: LearningPath[];
      resources?: Resource[];
    } = {};

    if (sessionState.sessions.length > 0) {
      payload.sessions = sessionState.sessions;
    }
    if (pathState.path) {
      payload.learningPaths = [pathState.path];
    }

    // Collect all unique resources across all sessions
    const allResources = Object.values(resourceState.storedResources).flat();
    const seen = new Set<string>();
    payload.resources = allResources.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    if (!payload.sessions && !payload.learningPaths && !payload.resources) return;

    const res = await fetch('/api/v1/user/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      log.warn(`saveUserStateToServer failed: HTTP ${res.status}`);
      return;
    }

    log.info(`Saved user state to server for user=${userId}`);
  } catch (err) {
    log.error('saveUserStateToServer failed:', err);
  }
}

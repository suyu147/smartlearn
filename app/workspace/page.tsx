'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLearningPathStore } from '@/lib/store/learning-path';
import { useLearningProfileStore } from '@/lib/store/learning-profile';
import { useResourcesStore } from '@/lib/store/resources';
import { useSessionsStore } from '@/lib/store/sessions';
import { useSettingsStore } from '@/lib/store/settings';
import { isProfileComplete } from '@/lib/utils/profile-utils';
import { LearningPathPanel } from '@/components/workspace/learning-path-panel';
import { ResourceViewer } from '@/components/workspace/resource-viewer';
import { TutorChatPanel } from '@/components/workspace/tutor-chat-panel';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import type { Resource, ResourceType } from '@/lib/types/resource';
import type { LearningPath, LearningPathNode, PathNodeStatus } from '@/lib/types/learning-path';
import { decideResourceTypes, shouldGeneratePPT } from '@/lib/generation/resource-decision';

const VALID_NODE_STATUSES: PathNodeStatus[] = ['locked', 'available', 'in_progress', 'completed'];

function getNodeOrder(path: LearningPath, nodeId: string) {
  const index = path.nodes.findIndex((node) => node.id === nodeId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function getNodeDependencies(path: LearningPath, node: LearningPathNode) {
  if (node.prerequisites.length > 0) {
    return node.prerequisites;
  }

  return path.edges.filter((edge) => edge.to === node.id).map((edge) => edge.from);
}

function areDependenciesSatisfied(path: LearningPath, node: LearningPathNode, completedNodeIds: Set<string>) {
  const dependencies = getNodeDependencies(path, node);
  if (dependencies.length === 0) {
    return true;
  }

  return dependencies.every((dependencyId) => completedNodeIds.has(dependencyId));
}

function reconcilePathStatuses(path: LearningPath): LearningPath {
  const completedNodeIds = new Set(
    path.nodes.filter((node) => node.status === 'completed').map((node) => node.id),
  );
  const inProgressNodeIds = new Set(
    path.nodes.filter((node) => node.status === 'in_progress').map((node) => node.id),
  );

  const eligibleNodeIds = new Set(
    path.nodes
      .filter((node) => node.status !== 'completed')
      .filter((node) => areDependenciesSatisfied(path, node, completedNodeIds))
      .map((node) => node.id),
  );

  let nextActiveNodeId = path.nodes.find(
    (node) => node.status === 'in_progress' && eligibleNodeIds.has(node.id),
  )?.id;

  if (!nextActiveNodeId) {
    nextActiveNodeId = path.nodes.find(
      (node) => node.status !== 'completed' && eligibleNodeIds.has(node.id),
    )?.id;
  }

  let changed = false;
  const nextNodes = path.nodes.map((node) => {
    let nextStatus: PathNodeStatus;

    if (node.status === 'completed') {
      nextStatus = 'completed';
    } else if (!eligibleNodeIds.has(node.id)) {
      nextStatus = 'locked';
    } else if (node.id === nextActiveNodeId) {
      nextStatus = 'in_progress';
    } else {
      nextStatus = 'available';
    }

    if (nextStatus !== node.status) {
      changed = true;
      return { ...node, status: nextStatus };
    }

    if (node.status === 'in_progress' && !inProgressNodeIds.has(node.id)) {
      changed = true;
    }

    return node;
  });

  return changed ? { ...path, nodes: nextNodes } : path;
}

function normalizePlannedPath(path: LearningPath): LearningPath {
  const nodes = path.nodes.map((node, index) => ({
    ...node,
    resources: [],
    status: VALID_NODE_STATUSES.includes(node.status)
      ? node.status
      : index === 0
        ? 'in_progress'
        : 'locked',
  }));

  return reconcilePathStatuses({ ...path, nodes });
}

export default function WorkspacePage() {
  const router = useRouter();
  const { profile } = useLearningProfileStore();
  const { path, setPath, storedPaths, updateNodeStatus, loadPathForSession, isPlanning, setPlanning } =
    useLearningPathStore();
  const { addResource, loadResourcesForSession } = useResourcesStore();
  const { sessions, currentSessionId, createSession, getCurrentSession } = useSessionsStore();
  const { providerId, modelId, apiKey, baseUrl, generatePptImages } = useSettingsStore();

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [generatingNodes, setGeneratingNodes] = useState<Set<string>>(new Set());

  const lastProfileIdRef = useRef<string | null>(null);
  const hasAutoPlanned = useRef(false);
  const isGeneratingRef = useRef(false);
  const generatingNodeSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isProfileComplete(profile?.dimensions ?? null)) {
      router.replace('/profile');
    }
  }, [profile, router]);

  useEffect(() => {
    setSelectedResource(null);
    hasAutoPlanned.current = false;

    if (currentSessionId) {
      loadPathForSession(currentSessionId);
      loadResourcesForSession(currentSessionId);
      return;
    }

    setPath(null);
  }, [currentSessionId, loadPathForSession, loadResourcesForSession, setPath]);

  useEffect(() => {
    if (!profile) return;

    const currentSession = currentSessionId ? getCurrentSession() : null;
    const profileChanged = lastProfileIdRef.current !== null && lastProfileIdRef.current !== profile.id;
    const dimensions = profile.dimensions;
    const goal =
      dimensions.learningGoals.shortTerm?.join('；') ||
      dimensions.learningGoals.longTerm ||
      dimensions.knowledgeBase.subjects.map((subject) => subject.name).join('、');

    if (!currentSession && sessions.length === 0) {
      createSession(profile.id, goal);
      lastProfileIdRef.current = profile.id;
      return;
    }

    if (profileChanged && currentSession?.profileId !== profile.id) {
      createSession(profile.id, goal);
    }

    lastProfileIdRef.current = profile.id;
  }, [profile, currentSessionId, sessions.length, createSession, getCurrentSession]);

  useEffect(() => {
    if (!path) return;

    const reconciledPath = reconcilePathStatuses(path);
    if (reconciledPath !== path) {
      setPath(reconciledPath);
    }
  }, [path, setPath]);

  const updateNodeResource = useCallback((nodeId: string, resource: Resource) => {
    const sessionId = useSessionsStore.getState().currentSessionId;
    useLearningPathStore.setState((state) => {
      if (!state.path) return {};

      let changed = false;
      const nextNodes = state.path.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        if (node.resources.some((item) => item.resourceId === resource.id)) {
          return node;
        }

        if (node.resources.some((item) => item.type === resource.type)) {
          return node;
        }

        changed = true;
        return {
          ...node,
          resources: [
            ...node.resources,
            {
              resourceId: resource.id,
              type: resource.type,
              title: resource.title,
            },
          ],
        };
      });

      if (!changed) return {};

      const nextPath = { ...state.path, nodes: nextNodes };
      return {
        path: nextPath,
        storedPaths: sessionId ? { ...state.storedPaths, [sessionId]: nextPath } : state.storedPaths,
      };
    });
  }, []);

  const parseResourceSSE = useCallback(
    async (response: Response, nodeId: string) => {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'resource_delta' && data.resource) {
              addResource(data.resource);
              updateNodeResource(nodeId, data.resource);
            }
          } catch {
          }
        }
      }
    },
    [addResource, updateNodeResource],
  );

  const parsePPTSSE = useCallback(
    async (response: Response, nodeId: string) => {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'generation_complete' && data.scenes) {
              const currentPath = useLearningPathStore.getState().path;
              const nodeTitle = currentPath?.nodes.find((node) => node.id === nodeId)?.title ?? nodeId;
              const pptResource: Resource = {
                id: crypto.randomUUID(),
                userId: 'current',
                type: 'ppt',
                title: `${nodeTitle} - 动态课件`,
                content: JSON.stringify(data.scenes),
                sourceAgent: 'ppt',
                status: 'ready',
                createdAt: new Date().toISOString(),
                metadata: { pptData: data.scenes },
              };
              addResource(pptResource);
              updateNodeResource(nodeId, pptResource);
            }
          } catch {
          }
        }
      }
    },
    [addResource, updateNodeResource],
  );

  const generateNodeResources = useCallback(
    async (node: LearningPathNode) => {
      if (!profile || !currentSessionId) return;

      generatingNodeSetRef.current.add(node.id);
      setGeneratingNodes((prev) => new Set(prev).add(node.id));

      try {
        const existingTypes = node.resources.map((resource) => resource.type) as ResourceType[];
        const decision = decideResourceTypes({
          knowledgePoints: node.knowledgePoints,
          nodeTitle: node.title,
          profile: profile.dimensions,
          existingTypes,
        });
        const shouldRequestPPT = shouldGeneratePPT(
          node.knowledgePoints,
          existingTypes.includes('ppt'),
        );

        if (decision.types.length === 0 && !shouldRequestPPT) {
          return;
        }

        const resourcesPromise = fetch('/api/generate/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            knowledgePoints: node.knowledgePoints,
            resourceTypes: decision.types,
            profile: profile.dimensions,
            aiConfig: { providerId, modelId, apiKey, baseUrl },
          }),
        });

        const pptPromise = shouldRequestPPT
          ? fetch('/api/generate/ppt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requirement: `讲解：${node.knowledgePoints.join('、')}`,
                language: 'zh-CN',
                aiConfig: { providerId, modelId, apiKey, baseUrl },
                enableImageGeneration: generatePptImages,
              }),
            })
          : Promise.resolve(null);

        const [resourcesResponse, pptResponse] = await Promise.all([resourcesPromise, pptPromise]);
        await Promise.all([
          parseResourceSSE(resourcesResponse, node.id),
          pptResponse ? parsePPTSSE(pptResponse, node.id) : Promise.resolve(),
        ]);
      } catch (error) {
        console.error(`Failed to generate resources for node ${node.id}:`, error);
      } finally {
        generatingNodeSetRef.current.delete(node.id);
        setGeneratingNodes((prev) => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
      }
    },
    [apiKey, baseUrl, currentSessionId, generatePptImages, modelId, parsePPTSSE, parseResourceSSE, profile, providerId],
  );

  const autoPlanPath = useCallback(
    async (goal: string) => {
      if (!profile) return;

      setPlanning(true);
      try {
        const response = await fetch('/api/path/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal,
            profile: profile.dimensions,
            aiConfig: { providerId, modelId, apiKey, baseUrl },
          }),
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'path_update' && data.path) {
                setPath(normalizePlannedPath(data.path as LearningPath));
              }
            } catch {
            }
          }
        }
      } catch (error) {
        console.error('Path planning error:', error);
      } finally {
        setPlanning(false);
      }
    },
    [apiKey, baseUrl, modelId, profile, providerId, setPath, setPlanning],
  );

  useEffect(() => {
    if (!profile || !currentSessionId || path || isPlanning || hasAutoPlanned.current) {
      return;
    }

    const currentSession = getCurrentSession();
    if (!currentSession) return;

    const storedPath = storedPaths[currentSessionId];
    if (storedPath) {
      hasAutoPlanned.current = true;
      loadPathForSession(currentSessionId);
      return;
    }

    hasAutoPlanned.current = true;
    autoPlanPath(currentSession.goal);
  }, [
    autoPlanPath,
    currentSessionId,
    getCurrentSession,
    isPlanning,
    loadPathForSession,
    path,
    profile,
    storedPaths,
  ]);

  useEffect(() => {
    if (!currentSessionId || !path || isGeneratingRef.current) return;

    const nextNode = path.nodes
      .filter((node) => node.status === 'in_progress')
      .filter((node) => node.resources.length === 0)
      .filter((node) => !generatingNodeSetRef.current.has(node.id))
      .sort((left, right) => getNodeOrder(path, left.id) - getNodeOrder(path, right.id))[0];

    if (!nextNode) return;

    isGeneratingRef.current = true;
    generateNodeResources(nextNode).finally(() => {
      isGeneratingRef.current = false;
    });
  }, [currentSessionId, generateNodeResources, path]);

  const handleNodeComplete = useCallback(
    (nodeId: string) => {
      updateNodeStatus(nodeId, 'completed');
    },
    [updateNodeStatus],
  );

  return (
    <div className="flex h-screen flex-col">
      <WorkspaceHeader profile={profile} />
      <div className="flex flex-1 overflow-hidden">
        <LearningPathPanel
          path={path}
          generatingNodes={generatingNodes}
          onSelectResource={setSelectedResource}
          onNodeComplete={handleNodeComplete}
        />
        <div className="flex-1 overflow-auto border-x">
          <ResourceViewer resource={selectedResource} />
        </div>
        <TutorChatPanel />
      </div>
    </div>
  );
}

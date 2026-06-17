import type { Resource } from '@/lib/types/resource';
import type { LearnEvent } from '../types';
import type { LearningStateType } from '../state';
import { generateResource } from '../helpers/resource-generators';
import { generatePptScenes } from '../helpers/ppt-generator';

function getWriter(config: { configurable?: { writer?: (event: LearnEvent) => void } }) {
  return config.configurable?.writer ?? (() => undefined);
}

export async function generateResourcesNode(
  state: LearningStateType,
  config: { configurable?: { writer?: (event: LearnEvent) => void } },
) {
  const write = getWriter(config);
  const node = state.currentNode;
  const resourcePlan = state.resourcePlan;
  if (!node || !resourcePlan) return { phase: 'generate' };
  write({ type: 'phase_start', phase: 'generate' });

  try {
    const generatedResources: Resource[] = [];
    for (const type of resourcePlan.execution.resourceTypes) {
      const generated = await generateResource(type, node.knowledgePoints, state.profile, state.aiConfig);
      const resource: Resource = {
        id: crypto.randomUUID(), userId: 'current', type, title: generated.title, content: generated.content,
        sourceAgent: type, status: 'ready', createdAt: new Date().toISOString(), metadata: { knowledgePoints: node.knowledgePoints, profileUsed: true, ...generated.metadata },
      };
      generatedResources.push(resource);
      write({ type: 'resource_delta', resource });
    }

    let pptScenes = null;
    if (resourcePlan.execution.shouldGeneratePPT) {
      pptScenes = await generatePptScenes(`讲解：${node.knowledgePoints.join('、')}`, state.aiConfig, true, true);
      if (pptScenes.length > 0) write({ type: 'ppt_ready', scenes: pptScenes });
    }

    const path = {
      id: state.sessionId,
      userId: 'current',
      goal: state.goal,
      nodes: [...state.completedNodes, { ...node, resources: generatedResources.map((resource) => ({ resourceId: resource.id, type: resource.type, title: resource.title })) }],
      edges: state.completedNodes.length > 0 ? [{ from: state.completedNodes[state.completedNodes.length - 1].id, to: node.id }] : [],
      estimatedDays: Math.max(1, state.completedNodes.length + 1),
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    write({ type: 'path_update', path });
    write({ type: 'phase_end', phase: 'generate' });
    return { generatedResources, pptScenes, phase: 'generate' };
  } catch (error) {
    write({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    write({ type: 'phase_end', phase: 'generate' });
    return { phase: 'generate' };
  }
}

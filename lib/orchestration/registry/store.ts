import { create } from 'zustand';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  modelId?: string;
  color?: string;
  avatar?: string;
  tools?: string[];
  createdAt?: string;
  updatedAt?: string;
  isDefault?: boolean;
}

interface AgentRegistryState {
  agents: AgentConfig[];
  registerAgent: (agent: AgentConfig) => void;
  unregisterAgent: (id: string) => void;
  getAgent: (id: string) => AgentConfig | undefined;
  getAllAgents: () => AgentConfig[];
}

export const useAgentRegistry = create<AgentRegistryState>()((set, get) => ({
  agents: [],
  registerAgent: (agent) =>
    set((state) => ({
      agents: [...state.agents.filter((a) => a.id !== agent.id), agent],
    })),
  unregisterAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
    })),
  getAgent: (id) => get().agents.find((a) => a.id === id),
  getAllAgents: () => get().agents,
}));

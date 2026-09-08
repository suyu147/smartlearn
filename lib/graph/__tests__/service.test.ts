import { describe, expect, it } from 'vitest';
import {
  CATEGORY_COLORS,
  buildGraphScene,
  buildNodeFacts,
  categoryOf,
  defaultLimit,
  extractSourceUrls,
  normalizeQuery,
  radiusOf,
} from '@/lib/graph/service';
import type { GraphData } from '@/lib/graph/types';

function graphData(overrides: Partial<GraphData> = {}): GraphData {
  return {
    viewMode: 'role',
    nodes: [
      {
        id: 'role_1',
        name: '后端工程师',
        type: 'job',
        level: '岗位',
        value: 100,
        properties: { postingCount: 320, roleFamily: '软件工程' },
      },
      {
        id: 'skill_1',
        name: 'Java',
        type: 'skill',
        level: '核心能力',
        value: 78,
        properties: { tier: 'core', sourceCount: 12 },
      },
      {
        id: 'skill_2',
        name: 'Docker',
        type: 'skill',
        level: '加分能力',
        value: 20,
        properties: { tier: 'bonus' },
      },
      {
        id: 'course_1',
        name: '云原生实战',
        type: 'course',
        level: '',
        value: 30,
        properties: { provider_canonical: '某平台' },
      },
    ],
    edges: [
      { id: 'e1', source: 'role_1', target: 'skill_1', relation: '核心能力', weight: 0.8 },
      { id: 'e2', source: 'role_1', target: 'skill_2', relation: '加分能力', weight: 0.2 },
      { id: 'e3', source: 'skill_1', target: 'course_1', relation: '推荐课程', weight: 0.4 },
      // 指向不存在节点的脏边应被丢弃
      { id: 'e4', source: 'role_1', target: 'missing', relation: '未知', weight: 0.1 },
    ],
    totalNodes: 4,
    totalEdges: 4,
    truncated: false,
    statistics: { roleCount: 1, skillCount: 2, relationCount: 4, typeCounts: { job: 1, skill: 2, course: 1 } },
    ...overrides,
  };
}

describe('categoryOf', () => {
  it('岗位映射为 job', () => {
    expect(categoryOf({ type: 'job' })).toBe('job');
  });

  it('技能按 tier 细分', () => {
    expect(categoryOf({ type: 'skill', properties: { tier: 'core' } })).toBe('skillCore');
    expect(categoryOf({ type: 'skill', properties: { tier: 'advanced' } })).toBe('skillAdvanced');
    expect(categoryOf({ type: 'skill', properties: { tier: 'bonus' } })).toBe('skillBonus');
  });

  it('技能无 tier 时回落到 level 文案', () => {
    expect(categoryOf({ type: 'skill', level: '核心能力' })).toBe('skillCore');
  });

  it('未知类型回落为 other', () => {
    expect(categoryOf({ type: 'whatever' })).toBe('other');
  });
});

describe('radiusOf', () => {
  it('岗位固定为最大半径', () => {
    expect(radiusOf({ type: 'job', value: 100 })).toBe(32);
  });

  it('其余节点按 value 缩放并落在 10-24 之间', () => {
    expect(radiusOf({ type: 'skill', value: 0 })).toBe(10);
    expect(radiusOf({ type: 'skill', value: 100 })).toBe(24);
    expect(radiusOf({ type: 'skill', value: 50 })).toBeGreaterThan(10);
  });

  it('value 缺失时不产生 NaN', () => {
    expect(Number.isFinite(radiusOf({ type: 'skill' }))).toBe(true);
  });
});

describe('buildGraphScene', () => {
  it('转换节点与关系，并丢弃悬空边', () => {
    const scene = buildGraphScene(graphData());
    expect(scene.nodes).toHaveLength(4);
    expect(scene.links).toHaveLength(3);
  });

  it('节点带上类别、颜色与标签', () => {
    const scene = buildGraphScene(graphData());
    const job = scene.nodes.find((node) => node.id === 'role_1');
    expect(job?.category).toBe('job');
    expect(job?.color).toBe(CATEGORY_COLORS.job);
    expect(job?.label).toBe('后端工程师');
  });

  it('图例列出图中出现过的全部类别', () => {
    const scene = buildGraphScene(
      graphData({
        nodes: [
          { id: 'role_1', name: '岗位', type: 'job', value: 100 },
          { id: 'skill_1', name: 'A', type: 'skill', value: 80, properties: { tier: 'core' } },
          { id: 'skill_2', name: 'B', type: 'skill', value: 20, properties: { tier: 'core' } },
          { id: 'skill_3', name: 'C', type: 'skill', value: 10, properties: { tier: 'bonus' } },
        ],
      }),
    );
    // 同数量时保持出现顺序，核心能力(2) 排在岗位(1) 之前
    expect(scene.categories[0]).toBe('skillCore');
    expect(scene.categories).toEqual(['skillCore', 'job', 'skillBonus']);
  });

  it('透传 truncated 标记', () => {
    expect(buildGraphScene(graphData({ truncated: true })).truncated).toBe(true);
  });
});

describe('normalizeQuery', () => {
  it('只保留当前视图生效的参数', () => {
    const params = normalizeQuery({
      viewMode: 'role',
      roleId: 'role_1',
      techStack: 'ai',
      seniority: 'senior',
      entityType: 'skill',
      skillTier: 'core',
    });
    expect(params).toEqual({
      viewMode: 'role',
      limit: '100',
      roleId: 'role_1',
      skillTier: 'core',
    });
  });

  it('技术栈视图保留 techStack 与 seniority', () => {
    const params = normalizeQuery({
      viewMode: 'stack',
      techStack: 'cloud',
      seniority: 'entry',
      roleId: 'role_1',
    });
    expect(params.techStack).toBe('cloud');
    expect(params.seniority).toBe('entry');
    expect(params.roleId).toBeUndefined();
  });

  it('全实体视图的默认上限更大', () => {
    expect(defaultLimit('entity')).toBe(220);
    expect(normalizeQuery({ viewMode: 'entity' }).limit).toBe('220');
  });

  it('空关键词不进入查询串', () => {
    expect(normalizeQuery({ viewMode: 'role', keyword: '   ' }).keyword).toBeUndefined();
  });
});

describe('buildNodeFacts', () => {
  it('按字典输出可读条目并跳过空值', () => {
    const facts = buildNodeFacts({
      posting_count: 320,
      source_url: 'https://example.com',
      empty: '',
      unknown_key: 'x',
    });
    expect(facts).toEqual([{ label: '样本量', value: '320' }]);
  });

  it('数组值用顿号连接，tier 转成中文', () => {
    const facts = buildNodeFacts({ techStacks: ['云计算', '大数据'], tier: 'core' });
    expect(facts[0].value).toBe('云计算、大数据');
    expect(facts.find((fact) => fact.label === '能力层级')?.value).toBe('核心能力');
  });

  it('无属性时返回空数组', () => {
    expect(buildNodeFacts(undefined)).toEqual([]);
  });
});

describe('extractSourceUrls', () => {
  it('收集属性中的 http(s) 链接并去重', () => {
    const urls = extractSourceUrls({
      source_url: 'https://a.com https://b.com',
      sources: ['https://a.com'],
      name: 'x',
    });
    expect(urls).toEqual(['https://a.com', 'https://b.com']);
  });

  it('无链接时返回空数组', () => {
    expect(extractSourceUrls({ name: 'x' })).toEqual([]);
  });
});

/**
 * 台词角色分配后处理器
 *
 * 为每个 Scene 中的 speech action 分配 speaker (agentId)。
 * 策略：规则启发式 + 可选 LLM 精确分配。
 *
 * 规则启发式：
 *  - 疑问句 → 学生角色
 *  - 短语/感叹 → 好奇同学
 *  - 含"补充"/"另外"/"注意" → 助教
 *  - 其余 → 主讲老师
 *
 * LLM 分配：将所有台词发送给模型，让它为每句标注角色。
 */

import type { Scene } from '@/lib/types/stage';
import type { SpeechAction, Action } from '@/lib/types/action';
import { CLASSROOM_SPEAKERS, type ClassroomSpeaker } from './speaker-roster';

// ── 规则启发式分配 ──────────────────────────────────────

const QUESTION_PATTERNS = /[？?]|为什么|怎么样|怎么办|难道|是不是|能不能|有没有|什么|哪个|哪些|如何|为何|是否|对吗|理解|明白/;
const SHORT_EXCLAMATION_PATTERNS = /^[^，。！？,\.!\?]{1,12}[！!。~]$/;
const ASSISTANT_PATTERNS = /补充|另外|注意|其实|换句话说|举个例子|也就是说|进一步|延伸|拓展|比如|类比|对比/;

function classifyByRule(text: string): ClassroomSpeaker {
  const trimmed = text.trim();

  // 疑问句 → 学生
  if (QUESTION_PATTERNS.test(trimmed)) {
    // 短小感叹 → 好奇同学
    if (SHORT_EXCLAMATION_PATTERNS.test(trimmed)) {
      return CLASSROOM_SPEAKERS[2]; // student-curious
    }
    // 较长的问题 → 思考者
    if (trimmed.length > 30) {
      return CLASSROOM_SPEAKERS[3]; // student-thinker
    }
    return CLASSROOM_SPEAKERS[2]; // student-curious
  }

  // 补充/拓展类 → 助教
  if (ASSISTANT_PATTERNS.test(trimmed)) {
    return CLASSROOM_SPEAKERS[1]; // assistant
  }

  // 默认 → 主讲老师
  return CLASSROOM_SPEAKERS[0]; // teacher
}

/** 纯规则分配（跳过 LLM 已分配的角色） */
function assignSpeakersByRule(actions: Action[]): void {
  let lastSpeakerId = '';

  for (const action of actions) {
    if (action.type !== 'speech' || !action.text) continue;

    // LLM 已在 prompt 输出中直接标注了 agentId，保留不动
    if (action.agentId && CLASSROOM_SPEAKERS.some((s) => s.id === action.agentId)) {
      lastSpeakerId = action.agentId;
      continue;
    }

    const speaker = classifyByRule(action.text);

    // 避免连续同一学生角色说太多——偶尔穿插老师
    if (speaker.role === 'student' && lastSpeakerId === speaker.id) {
      const alt = speaker.id === 'student-curious' ? CLASSROOM_SPEAKERS[3] : CLASSROOM_SPEAKERS[2];
      (action as SpeechAction).agentId = alt.id;
      lastSpeakerId = alt.id;
      continue;
    }

    (action as SpeechAction).agentId = speaker.id;
    lastSpeakerId = speaker.id;
  }
}

// ── 公共 API ────────────────────────────────────────────

/**
 * 为所有场景中的 speech action 分配 agentId（角色标识）。
 * 纯规则驱动：slide-actions 生成时 LLM 已在输出中直接标注了 agentId，
 * 此处仅对少量未标注的台词用规则补全。
 */
export function assignSpeakersToScenes(scenes: Scene[]): void {
  for (const scene of scenes) {
    if (!scene.actions?.length) continue;
    assignSpeakersByRule(scene.actions);
  }
}

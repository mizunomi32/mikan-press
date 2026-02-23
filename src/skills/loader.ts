import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { AgentName, Skill } from '../types/index.js';

interface Frontmatter {
  name: string;
  description: string;
  agents: AgentName[];
}

export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid skill file: missing frontmatter');
  }

  const yamlContent = match[1];
  const body = match[2].trim();

  const frontmatter: Frontmatter = {
    name: extractYamlField(yamlContent, 'name'),
    description: extractYamlField(yamlContent, 'description'),
    agents: extractYamlArrayField(yamlContent, 'agents'),
  };

  return { frontmatter, body };
}

function extractYamlField(yaml: string, fieldName: string): string {
  const regex = new RegExp(`^${fieldName}:\\s*(.+)$`, 'm');
  const match = yaml.match(regex);
  if (!match) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return match[1].trim().replace(/^["']|["']$/g, '');
}

function extractYamlArrayField(yaml: string, fieldName: string): AgentName[] {
  const lines = yaml.split('\n');
  const items: string[] = [];
  let foundField = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!foundField) {
      // フィールド名を探す
      if (line.trim().startsWith(`${fieldName}:`)) {
        foundField = true;
        // 同じ行に配列がある場合 ["a", "b"]
        const bracketMatch = line.match(/\[(.*?)\]/);
        if (bracketMatch) {
          const inner = bracketMatch[1];
          if (inner.trim() === '') {
            return [];
          }
          return inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(s => s !== '') as AgentName[];
        }
      }
      continue;
    }

    // 次のフィールドに到達したら終了
    if (line.trim() && !line.trim().startsWith('-') && !line.startsWith('  ') && line.match(/^\w+\s*:/)) {
      break;
    }

    // 配列アイテムを収集
    const trimmed = line.trim();
    if (trimmed.startsWith('-')) {
      const value = trimmed.slice(1).trim().replace(/^["']|["']$/g, '');
      if (value !== '') {
        items.push(value);
      }
    }
  }

  if (items.length === 0) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  return items as AgentName[];
}

export async function loadSkills(skillsDir?: string): Promise<Skill[]> {
  if (!skillsDir) {
    return [];
  }

  try {
    const files = await readdir(skillsDir);
    const skillFiles = files.filter(f => f.endsWith('.skill.md'));

    if (skillFiles.length === 0) {
      return [];
    }

    const skills: Skill[] = [];
    for (const file of skillFiles) {
      const filePath = join(skillsDir, file);
      const content = await readFile(filePath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      skills.push({
        name: frontmatter.name,
        description: frontmatter.description,
        agents: frontmatter.agents,
        content: body,
      });
    }

    return skills;
  } catch (error) {
    // ディレクトリが存在しない場合は空配列を返す
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export function getSkillsForAgent(skills: Skill[], agentName: AgentName): Skill[] {
  return skills.filter(skill => skill.agents.includes(agentName));
}

export function formatSkillsForPrompt(skills: Skill[]): string {
  if (skills.length === 0) {
    return '';
  }

  const parts: string[] = [];
  parts.push('## 追加のスキル・ガイドライン\n');

  for (const skill of skills) {
    parts.push(`### ${skill.name}`);
    parts.push(skill.content);
    parts.push('');
  }

  return parts.join('\n').trim();
}

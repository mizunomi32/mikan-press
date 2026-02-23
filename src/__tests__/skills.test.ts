import { describe, it, expect, beforeEach } from 'bun:test';
import { rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { parseFrontmatter, loadSkills, getSkillsForAgent, formatSkillsForPrompt } from '../skills/loader';
import type { AgentName } from '../types/index';

const tempDir = '/tmp/test-skills';

describe('スキルローダー', async () => {
  beforeEach(async () => {
    try {
      await rm(tempDir, { recursive: true });
    } catch {
      // ディレクトリが存在しない場合は無視
    }
    await mkdir(tempDir, { recursive: true });
  });

  describe('parseFrontmatter', () => {
    it('YAML frontmatterを正しくパースする', () => {
      const content = `---
name: test-skill
description: テスト用スキル
agents:
  - writer
  - editor
---

## スキル内容

これはスキルの本文です。`;

      const { frontmatter, body } = parseFrontmatter(content);
      expect(frontmatter.name).toBe('test-skill');
      expect(frontmatter.description).toBe('テスト用スキル');
      expect(frontmatter.agents).toEqual(['writer', 'editor']);
      expect(body).toContain('## スキル内容');
      expect(body).toContain('これはスキルの本文です。');
    });

    it('配列形式のagentsをパースする（JSON風）', () => {
      const content = `---
name: test
description: テスト
agents: ["writer", "editor"]
---

本文`;

      const { frontmatter } = parseFrontmatter(content);
      expect(frontmatter.agents).toEqual(['writer', 'editor']);
    });

    it('frontmatterがない場合はエラーを投げる', () => {
      const content = '## 見出し\n本文';
      expect(() => parseFrontmatter(content)).toThrow('Invalid skill file: missing frontmatter');
    });

    it('必須フィールドがない場合はエラーを投げる', () => {
      const content = `---
name: test
description: テスト
---

本文`;
      expect(() => parseFrontmatter(content)).toThrow('Missing required field: agents');
    });
  });

  describe('loadSkills', () => {
    it('ディレクトリが存在しない場合は空配列を返す', async () => {
      const skills = await loadSkills('/nonexistent-directory');
      expect(skills).toEqual([]);
    });

    it('スキルファイルを読み込む', async () => {
      const skillContent = `---
name: test-skill
description: テスト用スキル
agents:
  - writer
---

## テスト内容

これはテストです。`;

      await writeFile(join(tempDir, 'test.skill.md'), skillContent, 'utf-8');
      const skills = await loadSkills(tempDir);

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('test-skill');
      expect(skills[0].description).toBe('テスト用スキル');
      expect(skills[0].agents).toEqual(['writer']);
      expect(skills[0].content).toContain('## テスト内容');
    });

    it('複数のスキルファイルを読み込む', async () => {
      const skill1 = `---
name: skill1
description: スキル1
agents:
  - writer
---

内容1`;

      const skill2 = `---
name: skill2
description: スキル2
agents:
  - editor
---

内容2`;

      await writeFile(join(tempDir, 'skill1.skill.md'), skill1, 'utf-8');
      await writeFile(join(tempDir, 'skill2.skill.md'), skill2, 'utf-8');

      const skills = await loadSkills(tempDir);
      expect(skills).toHaveLength(2);
      const skillNames = skills.map(s => s.name).sort();
      expect(skillNames).toContain('skill1');
      expect(skillNames).toContain('skill2');
    });

    it('.skill.mdで終わらないファイルは無視する', async () => {
      await writeFile(join(tempDir, 'readme.md'), 'これは読み込まれない', 'utf-8');
      await writeFile(join(tempDir, 'skill.txt'), 'これも読み込まれない', 'utf-8');

      const skills = await loadSkills(tempDir);
      expect(skills).toHaveLength(0);
    });

    it('スキルファイルが空の場合は空配列を返す', async () => {
      const skills = await loadSkills(tempDir);
      expect(skills).toHaveLength(0);
    });
  });

  describe('getSkillsForAgent', () => {
    const skills = [
      {
        name: 'writer-skill',
        description: 'Writer用',
        agents: ['writer' as AgentName],
        content: 'Writerスキル',
      },
      {
        name: 'editor-skill',
        description: 'Editor用',
        agents: ['editor' as AgentName],
        content: 'Editorスキル',
      },
      {
        name: 'universal-skill',
        description: '全エージェント用',
        agents: ['writer' as AgentName, 'editor' as AgentName, 'research' as AgentName],
        content: 'Universalスキル',
      },
    ];

    it('指定したエージェントのスキルのみを返す', () => {
      const writerSkills = getSkillsForAgent(skills, 'writer');
      expect(writerSkills).toHaveLength(2);
      expect(writerSkills[0].name).toBe('writer-skill');
      expect(writerSkills[1].name).toBe('universal-skill');
    });

    it('該当するスキルがない場合は空配列を返す', () => {
      const reviewSkills = getSkillsForAgent(skills, 'review');
      expect(reviewSkills).toHaveLength(0);
    });
  });

  describe('formatSkillsForPrompt', () => {
    it('スキルをプロンプト用の文字列に整形する', () => {
      const skills = [
        {
          name: 'test-skill',
          description: 'テスト用',
          agents: ['writer' as AgentName],
          content: '## ガイドライン\n- ルール1\n- ルール2',
        },
      ];

      const formatted = formatSkillsForPrompt(skills);
      expect(formatted).toContain('## 追加のスキル・ガイドライン');
      expect(formatted).toContain('### test-skill');
      expect(formatted).toContain('## ガイドライン');
      expect(formatted).toContain('- ルール1');
      expect(formatted).toContain('- ルール2');
    });

    it('空配列の場合は空文字列を返す', () => {
      const formatted = formatSkillsForPrompt([]);
      expect(formatted).toBe('');
    });

    it('複数のスキルを結合する', () => {
      const skills = [
        {
          name: 'skill1',
          description: 'スキル1',
          agents: ['writer' as AgentName],
          content: '内容1',
        },
        {
          name: 'skill2',
          description: 'スキル2',
          agents: ['writer' as AgentName],
          content: '内容2',
        },
      ];

      const formatted = formatSkillsForPrompt(skills);
      expect(formatted).toContain('### skill1');
      expect(formatted).toContain('内容1');
      expect(formatted).toContain('### skill2');
      expect(formatted).toContain('内容2');
    });
  });
});

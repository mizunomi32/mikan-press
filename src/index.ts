import { program } from 'commander';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import 'dotenv/config';
import { SupervisorAgent } from './agents/SupervisorAgent';
import { logger } from './logger';

program
  .name('mikan-press')
  .description('記事執筆AIエージェント — GLM-5 + Gemini 2.5 Flash Lite')
  .version('0.1.0');

program
  .requiredOption('-t, --topic <topic>', '記事のトピック')
  .option('-l, --language <lang>', '出力言語 (ja / en)', 'ja')
  .option('-n, --length <number>', '目標文字数', '3000')
  .option('-o, --output <path>', '出力ファイルパス (省略時は標準出力)')
  .option('--max-retries <number>', 'レビュー差し戻し最大回数', '2');

program.parse();

const opts = program.opts<{
  topic: string;
  language: 'ja' | 'en';
  length: string;
  output?: string;
  maxRetries: string;
}>();

const agent = new SupervisorAgent({
  topic: opts.topic,
  language: opts.language,
  maxLength: parseInt(opts.length, 10),
  output: opts.output,
  maxRetries: parseInt(opts.maxRetries, 10),
});

const article = await agent.run();

if (opts.output) {
  mkdirSync(dirname(opts.output), { recursive: true });
  writeFileSync(opts.output, article.content, 'utf-8');
  logger.always(`記事を保存しました: ${opts.output}`);
} else {
  logger.always(article.content);
}

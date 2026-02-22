import { program } from 'commander';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import 'dotenv/config';
import { ArticleAgent } from './agents/ArticleAgent';

program
  .name('mikan-press')
  .description('記事執筆AIエージェント — GLM-5 + Gemini 2.5 Flash Lite')
  .version('0.1.0');

program
  .requiredOption('-t, --topic <topic>', '記事のトピック')
  .option('-l, --language <lang>', '出力言語 (ja / en)', 'ja')
  .option('-n, --length <number>', '目標文字数', '3000')
  .option('-o, --output <path>', '出力ファイルパス (省略時は標準出力)');

program.parse();

const opts = program.opts<{
  topic: string;
  language: 'ja' | 'en';
  length: string;
  output?: string;
}>();

const agent = new ArticleAgent({
  topic: opts.topic,
  language: opts.language,
  maxLength: parseInt(opts.length, 10),
  output: opts.output,
});

const article = await agent.run();

if (opts.output) {
  mkdirSync(dirname(opts.output), { recursive: true });
  writeFileSync(opts.output, article.content, 'utf-8');
  console.log(`記事を保存しました: ${opts.output}`);
} else {
  console.log(article.content);
}

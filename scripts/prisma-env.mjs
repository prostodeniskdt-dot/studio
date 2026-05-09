/**
 * Подтягивает .env и .env.local перед вызовом Prisma CLI (как делает Next.js).
 * Так `npm run db:migrate:deploy` видит DATABASE_URL без ручного export в консоли.
 */
import { config } from 'dotenv';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

config({ path: path.join(root, '.env') });
config({ path: path.join(root, '.env.local'), override: true });

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error('Использование: node scripts/prisma-env.mjs <команда prisma> [аргументы…]');
  console.error('Пример: node scripts/prisma-env.mjs migrate deploy');
  process.exit(1);
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    '\n× Не задан DATABASE_URL.\n' +
      '  Создайте файл `.env` в корне проекта (скопируйте `.env.example`) и укажите строку подключения к Postgres.\n' +
      '  Либо задайте DATABASE_URL в `.env.local`.\n'
  );
  process.exit(1);
}

const child = spawn('npx', ['prisma', ...prismaArgs], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 1));

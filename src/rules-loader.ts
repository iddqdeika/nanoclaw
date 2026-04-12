import fs from 'fs';
import path from 'path';

const RULES_DIR = path.join(process.cwd(), 'rules');

function readScopeFiles(scope: 'core' | 'admin' | 'untrusted'): string[] {
  const dir = path.join(RULES_DIR, scope);
  if (!fs.existsSync(dir)) return [];

  let files: string[];
  try {
    files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .sort();
  } catch {
    return [];
  }

  return files.flatMap((f) => {
    try {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8').trim();
      return content ? [content] : [];
    } catch {
      return [];
    }
  });
}

/**
 * Load rules for a container invocation.
 * Core rules apply to all groups; admin rules apply to main groups only;
 * untrusted rules apply to non-main groups only.
 */
export function loadRules(isMain: boolean): string {
  const parts = [
    ...readScopeFiles('core'),
    ...readScopeFiles(isMain ? 'admin' : 'untrusted'),
  ];
  return parts.join('\n\n---\n\n');
}

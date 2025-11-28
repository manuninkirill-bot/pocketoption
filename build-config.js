#!/usr/bin/env node
// Minimal build script that excludes vite from production bundle
import esbuild from 'esbuild';
import { execSync } from 'child_process';

// First build the frontend
console.log('Building frontend...');
execSync('vite build', { stdio: 'inherit' });

// Build backend with vite excluded
console.log('Building backend...');
await esbuild.build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  packages: 'external',
  external: ['vite', 'vite/client'],
  format: 'esm',
  outdir: 'dist',
  target: 'node20',
});

console.log('✅ Production build ready - no vite runtime dependency');

// src/utils/path-utils.ts
import path from 'path';
import os from 'os';

export function getPclHome(): string {
  return process.env.PCL_HOME || path.join(os.homedir(), '.pcl');
}
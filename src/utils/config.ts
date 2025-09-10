import fs from 'fs-extra';
import path from 'path';
import { ForgeConfig, ForgeConfigSchema } from '../schemas/component';

export async function loadForgeConfig(cwd: string = process.cwd()): Promise<ForgeConfig> {
  const configPath = path.join(cwd, 'forge.config.json');
  
  if (!(await fs.pathExists(configPath))) {
    throw new Error('No forge.config.json found. Run "forge init" first.');
  }
  
  const configData = await fs.readJSON(configPath);
  return ForgeConfigSchema.parse(configData);
}

export async function saveForgeConfig(config: ForgeConfig, cwd: string = process.cwd()): Promise<void> {
  const configPath = path.join(cwd, 'forge.config.json');
  const validatedConfig = ForgeConfigSchema.parse(config);
  await fs.writeJSON(configPath, validatedConfig, { spaces: 2 });
}

export async function updateForgeConfig(
  updates: Partial<ForgeConfig>, 
  cwd: string = process.cwd()
): Promise<ForgeConfig> {
  const config = await loadForgeConfig(cwd);
  const updatedConfig = { ...config, ...updates };
  await saveForgeConfig(updatedConfig, cwd);
  return updatedConfig;
}
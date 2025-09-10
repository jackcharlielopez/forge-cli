import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { loadForgeConfig } from '../utils/config.js';
import { Component } from '../schemas/component.js';

interface SearchOptions {
  category?: string;
}

export async function searchCommand(query: string, options: SearchOptions = {}) {
  const spinner = ora('Searching components...').start();
  
  try {
    const config = await loadForgeConfig();
    const { componentsDir } = config;
    
    // Get all component directories
    const componentDirs = await fs.readdir(componentsDir);
    const components: Component[] = [];
    
    // Load all components
    for (const dir of componentDirs) {
      const componentPath = path.join(componentsDir, dir);
      const stat = await fs.stat(componentPath);
      
      if (stat.isDirectory()) {
        const componentJsonPath = path.join(componentPath, 'component.json');
        if (await fs.pathExists(componentJsonPath)) {
          try {
            const component = await fs.readJSON(componentJsonPath);
            components.push(component);
          } catch (error) {
            spinner.warn(`Failed to read ${dir}/component.json`);
          }
        }
      }
    }
    
    // Filter components by search query
    const searchTerms = query.toLowerCase().split(/\s+/);
    let results = components.filter(component => {
      const searchableText = [
        component.name,
        component.displayName,
        component.description,
        ...component.tags,
        component.category,
      ].join(' ').toLowerCase();
      
      return searchTerms.every(term => searchableText.includes(term));
    });
    
    // Filter by category if specified
    if (options.category) {
      results = results.filter(c => c.category === options.category);
    }
    
    spinner.stop();
    
    // Display results
    if (results.length === 0) {
      console.log(chalk.yellow(`No components found matching "${query}"`));
      if (options.category) {
        console.log(chalk.gray(`Tip: Try searching without --category=${options.category}`));
      }
      return;
    }
    
    console.log(chalk.blue(`Found ${results.length} components matching "${query}":`));
    console.log();
    
    // Sort results by relevance (name matches first)
    results.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
      const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      return 0;
    });
    
    // Display results
    for (const component of results) {
      console.log(chalk.green(`${component.displayName} (${component.name})`));
      console.log(chalk.gray(`  Category: ${component.category}`));
      console.log(chalk.gray(`  Description: ${component.description}`));
      
      if (component.tags.length > 0) {
        console.log(chalk.gray(`  Tags: ${component.tags.join(', ')}`));
      }
      
      if (component.deprecated) {
        console.log(chalk.yellow('  ⚠ Deprecated'));
      }
      
      if (component.experimental) {
        console.log(chalk.yellow('  🧪 Experimental'));
      }
      
      console.log();
    }
    
    // Show usage tip
    console.log(chalk.gray('Tip: Use `forge add <component-name>` to add a component to your project'));
    
  } catch (error) {
    spinner.fail('Search failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import { execSync } from 'child_process';
import { Component, ComponentSchema, ComponentRegistry, ForgeConfig } from '../schemas/component.js';
import { loadForgeConfig } from '../utils/config.js';
import { validateComponent } from '../utils/validation.js';

export const buildCommand = async (options: any) => {
  const spinner = ora('Building component library...').start();
  
  try {
    const config = await loadForgeConfig();
    
    spinner.text = 'Scanning components...';
    
    // Find all component definitions
    const componentPaths = glob.sync(path.join(config.componentsDir, '**/component.json'));
    
    if (componentPaths.length === 0) {
      spinner.warn('No components found. Add components with: forge add <component-name>');
      return;
    }
    
    const components: Component[] = [];
    const componentNames = new Set<string>();
    const errors: string[] = [];
    
    spinner.text = 'Processing components...';
    
    for (const componentPath of componentPaths) {
      try {
        const componentData = await fs.readJSON(componentPath);
        
        // Validate component schema
        const component = ComponentSchema.parse(componentData);
        
        // Check for duplicate names
        if (componentNames.has(component.name)) {
          errors.push(`Duplicate component name: ${component.name}`);
          continue;
        }
        
        componentNames.add(component.name);
        
        // Validate component files exist
        const componentDir = path.dirname(componentPath);
        const missingFiles: string[] = [];
        
        for (const file of component.files) {
          const filePath = path.join(componentDir, file.path);
          if (!(await fs.pathExists(filePath))) {
            missingFiles.push(file.path);
          }
        }
        
        if (missingFiles.length > 0) {
          errors.push(`Component ${component.name} missing files: ${missingFiles.join(', ')}`);
          continue;
        }
        
        // Additional validation
        const validationErrors = await validateComponent(component, componentDir);
        if (validationErrors.length > 0) {
          errors.push(`Component ${component.name}: ${validationErrors.join(', ')}`);
          continue;
        }
        
        components.push(component);
        
        if (options.verbose) {
          console.log(chalk.green(`✓ ${component.name} (${component.files.length} files)`));
        }
        
      } catch (error) {
        errors.push(`Failed to process ${componentPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Report errors
    if (errors.length > 0) {
      spinner.fail('Build failed with errors:');
      errors.forEach(error => console.error(chalk.red(`  ✗ ${error}`)));
      return;
    }
    
    spinner.text = 'Generating registry...';
    
    // Generate registry
    const registry: ComponentRegistry = {
      name: config.name,
      description: config.description || '',
      version: '1.0.0',
      author: config.author || '',
      license: config.license,
      repository: config.repository || '',
      homepage: config.homepage || '',
      components,
      categories: [...new Set(components.map(c => c.category))],
      tags: [...new Set(components.flatMap(c => c.tags))],
      lastUpdated: new Date().toISOString(),
    };

    // Ensure output directory exists
    await fs.ensureDir(config.outputDir);

    // Write registry file
    await fs.writeJSON(path.join(config.outputDir, 'registry.json'), registry, { spaces: 2 });

    spinner.text = 'Copying component files...';

    // Copy component files to output directory
    const componentsOutputDir = path.join(config.outputDir, 'components');
    await fs.ensureDir(componentsOutputDir);

    for (const component of components) {
      const componentDir = path.join(config.componentsDir, component.name);
      const outputComponentDir = path.join(componentsOutputDir, component.name);
      
      await fs.ensureDir(outputComponentDir);
      
      // Copy component files
      for (const file of component.files) {
        const sourcePath = path.join(componentDir, file.path);
        const destPath = path.join(outputComponentDir, file.path);
        await fs.copy(sourcePath, destPath);
      }
      
      // Copy component.json
      await fs.copy(
        path.join(componentDir, 'component.json'),
        path.join(outputComponentDir, 'component.json')
      );
    }

    spinner.text = 'Generating documentation...';

    // Generate documentation
    await generateDocumentation(config, registry);

    // Generate index files
    await generateIndexFiles(config, components);

    // Generate dependency manifest
    await generateDependencyManifest(config, components);

    // Build Storybook
    spinner.start('Building Storybook...');
    try {
      execSync('npm run build-storybook', { stdio: 'inherit' });
      spinner.succeed('Storybook built successfully!');
    } catch (error) {
      spinner.warn('Storybook build failed. You may need to run npm install first.');
    }

    spinner.succeed(`Built ${components.length} components successfully!`);

    // Summary
    console.log(chalk.blue('\n📊 Build Summary:'));
    console.log(chalk.green(`  Components: ${components.length}`));
    console.log(chalk.green(`  Categories: ${registry.categories.length}`));
    console.log(chalk.green(`  Tags: ${registry.tags.length}`));
    console.log(chalk.gray(`  Output: ${config.outputDir}/`));

    if (options.verbose) {
      console.log(chalk.blue('\n📂 Generated Files:'));
      console.log(chalk.gray(`  ${config.outputDir}/registry.json`));
      console.log(chalk.gray(`  ${config.outputDir}/components/`));
      console.log(chalk.gray(`  ${config.outputDir}/docs/`));
      console.log(chalk.gray(`  ${config.outputDir}/index.json`));
      console.log(chalk.gray(`  ${config.outputDir}/storybook-static/`));
    }

  } catch (error) {
    spinner.fail('Build failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function generateDocumentation(config: ForgeConfig, registry: ComponentRegistry) {
  const docsDir = path.join(config.outputDir, 'docs');
  await fs.ensureDir(docsDir);

  // Generate index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${registry.name} - Component Library</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .gradient-bg {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
  </style>
</head>
<body class="bg-gray-50">
  <div class="gradient-bg text-white py-16">
    <div class="max-w-4xl mx-auto px-4">
      <h1 class="text-5xl font-bold mb-4">${registry.name}</h1>
      <p class="text-xl opacity-90 mb-8">${registry.description}</p>
      <div class="flex gap-4">
        <span class="bg-white/20 px-3 py-1 rounded-full text-sm">${registry.components.length} Components</span>
        <span class="bg-white/20 px-3 py-1 rounded-full text-sm">${registry.categories.length} Categories</span>
        <span class="bg-white/20 px-3 py-1 rounded-full text-sm">v${registry.version}</span>
      </div>
    </div>
  </div>

  <div class="max-w-4xl mx-auto px-4 py-12">
    <div class="mb-12">
      <h2 class="text-3xl font-bold mb-6">Getting Started</h2>
      <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
        <div class="mb-2"># Install the CLI</div>
        <div class="mb-4">npm install -g forge-cli</div>
        <div class="mb-2"># Add a component to your project</div>
        <div>forge add button</div>
      </div>
    </div>

    <div class="mb-12">
      <h2 class="text-3xl font-bold mb-6">Components</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${registry.components.map((component: Component) => `
          <div class="border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h3 class="text-xl font-semibold mb-2">${component.displayName}</h3>
            <p class="text-gray-600 mb-4">${component.description}</p>
            <div class="flex flex-wrap gap-2 mb-4">
              <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">${component.category}</span>
              ${component.tags.map((tag: string) => `<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">${tag}</span>`).join('')}
            </div>
            <code class="bg-gray-100 p-2 rounded text-sm block">forge add ${component.name}</code>
          </div>
        `).join('')}
      </div>
    </div>

    <div>
      <h2 class="text-3xl font-bold mb-6">Categories</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${registry.categories.map((category: string) => {
          const count = registry.components.filter((c: Component) => c.category === category).length;
          return `
            <div class="text-center p-4 border rounded-lg">
              <div class="text-2xl font-bold text-blue-600">${count}</div>
              <div class="text-sm text-gray-600 capitalize">${category.replace('-', ' ')}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  </div>

  <footer class="bg-gray-900 text-white py-8 mt-16">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <p>&copy; ${new Date().getFullYear()} ${registry.author}. Licensed under ${registry.license}.</p>
      ${registry.repository ? `<p class="mt-2"><a href="${registry.repository}" class="text-blue-400 hover:underline">View on GitHub</a></p>` : ''}
    </div>
  </footer>

  <script>
    // Add some interactivity
    document.querySelectorAll('code').forEach(code => {
      code.addEventListener('click', () => {
        navigator.clipboard.writeText(code.textContent);
        const original = code.textContent;
        code.textContent = 'Copied!';
        setTimeout(() => code.textContent = original, 1000);
      });
    });
  </script>
</body>
</html>`;

  await fs.writeFile(path.join(docsDir, 'index.html'), indexHtml);

  // Generate component documentation pages
  for (const component of registry.components) {
    const componentHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${component.displayName} - ${registry.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/components/prism-core.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/plugins/autoloader/prism-autoloader.min.js"></script>
</head>
<body class="bg-gray-50">
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-4xl mx-auto px-4 py-4">
      <a href="index.html" class="text-blue-600 hover:underline">&larr; Back to ${registry.name}</a>
    </div>
  </nav>

  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-2">${component.displayName}</h1>
      <p class="text-xl text-gray-600 mb-4">${component.description}</p>
      <div class="flex flex-wrap gap-2">
        <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">${component.category}</span>
        ${component.tags.map(tag => `<span class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">${tag}</span>`).join('')}
      </div>
    </div>

    <div class="mb-8">
      <h2 class="text-2xl font-bold mb-4">Installation</h2>
      <pre class="bg-gray-900 text-green-400 p-4 rounded-lg"><code>forge add ${component.name}</code></pre>
    </div>

    ${component.examples.length > 0 ? `
    <div class="mb-8">
      <h2 class="text-2xl font-bold mb-4">Examples</h2>
      ${component.examples.map((example: string) => `
        <div class="mb-4">
          <pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto"><code class="language-jsx">${example}</code></pre>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${component.props.length > 0 ? `
    <div class="mb-8">
      <h2 class="text-2xl font-bold mb-4">Props</h2>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 px-4 py-2 text-left">Name</th>
              <th class="border border-gray-300 px-4 py-2 text-left">Type</th>
              <th class="border border-gray-300 px-4 py-2 text-left">Required</th>
              <th class="border border-gray-300 px-4 py-2 text-left">Default</th>
              <th class="border border-gray-300 px-4 py-2 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            ${component.props.map((prop: any) => `
              <tr>
                <td class="border border-gray-300 px-4 py-2 font-mono text-sm">${prop.name}</td>
                <td class="border border-gray-300 px-4 py-2 font-mono text-sm">${prop.type}</td>
                <td class="border border-gray-300 px-4 py-2">${prop.required ? '✓' : '—'}</td>
                <td class="border border-gray-300 px-4 py-2 font-mono text-sm">${prop.default || '—'}</td>
                <td class="border border-gray-300 px-4 py-2">${prop.description || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

    <div class="mb-8">
      <h2 class="text-2xl font-bold mb-4">Files</h2>
      <ul class="space-y-2">
        ${component.files.map((file: any) => `
          <li class="flex items-center gap-2">
            <span class="bg-gray-100 px-2 py-1 rounded text-xs font-mono">${file.type}</span>
            <code>${file.path}</code>
          </li>
        `).join('')}
      </ul>
    </div>

    ${component.dependencies?.length > 0 ? `
    <div class="mb-8">
      <h2 class="text-2xl font-bold mb-4">Dependencies</h2>
      <ul class="space-y-1">
        ${component.dependencies?.map((dep: { name: string; version?: string; dev: boolean }) => `
          <li><code>${dep.name}${dep.version ? `@${dep.version}` : ''}</code></li>
        `).join('')}
      </ul>
    </div>
    ` : ''}
  </div>
</body>
</html>`;

    await fs.writeFile(path.join(docsDir, `${component.name}.html`), componentHtml);
  }
}

async function generateIndexFiles(config: ForgeConfig, components: Component[]) {
  // Generate a simple index for programmatic access
  const index = {
    components: components.map(c => ({
      name: c.name,
      displayName: c.displayName,
      description: c.description,
      category: c.category,
      version: c.version,
      tags: c.tags,
      files: c.files.length,
    })),
    categories: [...new Set(components.map(c => c.category))],
    totalComponents: components.length,
    lastUpdated: new Date().toISOString(),
  };

  await fs.writeJSON(path.join(config.outputDir, 'index.json'), index, { spaces: 2 });
}

async function generateDependencyManifest(config: ForgeConfig, components: Component[]) {
  const allDependencies = new Map<string, string>();
  const allPeerDependencies = new Map<string, string>();

  // Collect all dependencies
  for (const component of components) {
    if (component.dependencies) {
      for (const dep of component.dependencies) {
        if (!dep.dev) {
          allDependencies.set(dep.name, dep.version || 'latest');
        }
      }
    }
    if (component.peerDependencies) {
      for (const peerDep of component.peerDependencies) {
        allPeerDependencies.set(peerDep.name, peerDep.version || 'latest');
      }
    }
  }

  const manifest = {
    dependencies: Object.fromEntries(allDependencies),
    peerDependencies: Object.fromEntries(allPeerDependencies),
    generatedAt: new Date().toISOString(),
    componentCount: components.length,
  };

  await fs.writeJSON(path.join(config.outputDir, 'dependencies.json'), manifest, { spaces: 2 });
}

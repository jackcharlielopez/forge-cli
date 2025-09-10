# 🔥 Forge - Component Library Template

**Forge** is a powerful CLI template that lets you build your own component library with shadcn-like functionality. Create, manage, and distribute your components with ease.

## ✨ Features

- 🎯 **CLI-First**: Intuitive command-line interface for component management
- 📦 **Component Registry**: Automatic registry generation like shadcn/ui
- 🔐 **Private Support**: Token-based authentication for private components  
- 🏗️ **Multiple Templates**: Pre-built templates for buttons, inputs, hooks, and more
- 📖 **Auto Documentation**: Generates beautiful documentation automatically
- 🚀 **GitHub Pages**: One-command deployment to GitHub Pages
- ✅ **Validation**: Built-in component validation and error checking
- 🎨 **TypeScript First**: Full TypeScript support with type safety
- 🌊 **Tailwind Ready**: Pre-configured for Tailwind CSS

## 🚀 Quick Start

### 1. Install Forge CLI

```bash
npm install -g forge-cli
```

### 2. Initialize Your Component Library

```bash
mkdir my-component-library
cd my-component-library
forge init
```

### 3. Add Your First Component

```bash
forge add button --template button
```

### 4. Build and Deploy

```bash
forge build
forge publish
```

## 📚 Commands

### `forge init`
Initialize a new component library

```bash
forge init [options]
  -n, --name <name>          Component library name
  -d, --description <desc>   Description
  -t, --typescript           Use TypeScript (default: true)
  --tailwind                 Use Tailwind CSS (default: true)
```

### `forge add`
Add a new component

```bash
forge add <component-name> [options]
  -t, --template <template>  Template to use (basic, button, input, card, modal, hook, utility)
  -c, --category <category>  Component category
  -i, --interactive          Interactive mode
```

### `forge build`
Build the component library

```bash
forge build [options]
  -w, --watch                Watch for changes
  -v, --verbose              Verbose output
```

### `forge list`
List all components

```bash
forge list [options]
  -c, --category <category>  Filter by category
  -t, --tag <tag>           Filter by tag
  --json                    Output as JSON
```

### `forge validate`
Validate all components

```bash
forge validate [options]
  -f, --fix                 Auto-fix issues where possible
```

### `forge publish`
Publish to GitHub Pages

```bash
forge publish [options]
  -m, --message <message>   Commit message
```

### Other Commands

- `forge search <query>` - Search components
- `forge remove <name>` - Remove component
- `forge update <name>` - Update component
- `forge config` - Manage configuration

## 🏗️ Component Structure

Each component follows this structure:

```
src/components/button/
├── component.json         # Component definition
├── button.tsx            # Component implementation
└── button.types.ts       # TypeScript types (if using TS)
```

### Component Definition (`component.json`)

```json
{
  "name": "button",
  "displayName": "Button",
  "description": "A customizable button component",
  "category": "ui",
  "version": "1.0.0",
  "props": [
    {
      "name": "variant",
      "type": "'primary' | 'secondary'",
      "required": false,
      "default": "'primary'",
      "description": "Button style variant"
    }
  ],
  "files": [
    {
      "name": "button",
      "path": "button.tsx",
      "type": "component"
    }
  ],
  "examples": [
    "<Button>Click me</Button>",
    "<Button variant=\"secondary\">Secondary</Button>"
  ],
  "tags": ["interactive", "form"]
}
```

## 🔧 Configuration

Forge uses `forge.config.json` for configuration:

```json
{
  "name": "my-components",
  "description": "My awesome component library",
  "author": "Your Name",
  "license": "MIT",
  "componentsDir": "src/components",
  "outputDir": "public",
  "typescript": true,
  "tailwind": true,
  "categories": ["ui", "forms", "layout"]
}
```

## 📦 Built Output

Forge generates a complete registry structure:

```
public/
├── registry.json          # Main registry file
├── components/           # Component files
│   └── button/
│       ├── button.tsx
│       └── component.json
├── docs/                # Generated documentation
│   ├── index.html
│   └── button.html
├── index.json           # Simple index
└── dependencies.json    # Dependency manifest
```

## 🚀 GitHub Pages Deployment

Forge includes automatic GitHub Actions workflow:

1. **Validates** all components
2. **Builds** the registry
3. **Tests** the components
4. **Deploys** to GitHub Pages

The workflow is automatically created during `forge init`.

## 🎨 Component Templates

### Available Templates

- **basic** - Simple component with props
- **button** - Interactive button with variants and sizes
- **input** - Form input component with validation
- **card** - Content container component
- **modal** - Overlay dialog component
- **hook** - Custom React hook
- **utility** - Utility function

### Creating Custom Templates

You can extend Forge by adding custom templates to the `templates/` directory:

```typescript
// templates/my-template.ts
export const myTemplate = {
  files: [
    {
      name: 'component',
      filename: 'component.tsx',
      type: 'component',
      content: `// Your template content here`
    }
  ],
  props: [
    // Default props for this template
  ],
  examples: [
    // Usage examples
  ]
};
```

## 🔐 Private Components

Forge supports private component libraries with token authentication:

### Setup Private Registry

1. **Enable in config:**
```json
{
  "tokenRequired": true,
  "registryUrl": "https://your-private-registry.com"
}
```

2. **Set authentication token:**
```bash
forge config --set token=your-private-token
```

3. **Components marked as private:**
```json
{
  "name": "premium-button",
  "private": true
}
```

### Consuming Private Components

```bash
# Set token for consumers
export FORGE_TOKEN=your-token

# Install private component
forge add premium-button
```

## 📖 Documentation Generation

Forge automatically generates beautiful documentation:

### Features

- **Component showcase** with live examples
- **Props documentation** with types and descriptions
- **Installation instructions** for each component
- **Search functionality** across all components
- **Category filtering** and organization
- **Responsive design** that works on all devices

### Custom Documentation

Override default documentation by creating:

```
src/docs/
├── custom.md           # Custom documentation
├── examples/          # Custom examples
└── assets/           # Images and assets
```

## 🧪 Testing

Forge includes testing utilities:

### Component Testing

```typescript
// src/components/button/__tests__/button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Validation Testing

```bash
# Run validation tests
forge validate

# Run with auto-fix
forge validate --fix
```

## 🎯 Best Practices

### Component Design

1. **Single Responsibility**: Each component should do one thing well
2. **Composable**: Design components to work together
3. **Accessible**: Follow WCAG guidelines
4. **Consistent**: Use consistent naming and patterns
5. **Documented**: Provide clear descriptions and examples

### File Organization

```
src/components/button/
├── button.tsx           # Main component
├── button.types.ts      # TypeScript definitions
├── button.test.tsx      # Tests
├── button.stories.tsx   # Storybook stories (optional)
├── component.json       # Forge definition
└── README.md           # Component documentation
```

### Naming Conventions

- **Components**: PascalCase (`Button`, `InputField`)
- **Files**: kebab-case (`button.tsx`, `input-field.tsx`)
- **Props**: camelCase (`variant`, `isDisabled`)
- **CSS Classes**: kebab-case (`btn-primary`, `input-error`)

## 🔌 Integrations

### Storybook

```bash
# Add Storybook support
npx storybook@latest init

# Generate stories for all components
forge build --storybook
```

### Design Tokens

```json
// forge.config.json
{
  "designTokens": {
    "colors": "./tokens/colors.json",
    "spacing": "./tokens/spacing.json",
    "typography": "./tokens/typography.json"
  }
}
```

### Figma

Export Figma components to Forge format:

```bash
# Install Figma plugin
npm install -g @forge/figma-plugin

# Export from Figma
forge import figma --file-key=your-figma-key
```

## 🚀 Advanced Usage

### Multi-Package Setup

For large organizations, set up multiple component libraries:

```
packages/
├── core/              # Base components
├── marketing/         # Marketing components  
├── admin/            # Admin components
└── mobile/           # Mobile-specific components
```

### Component Variants

Create component variants for different use cases:

```typescript
// button/variants/
├── button.primary.tsx
├── button.secondary.tsx
└── button.ghost.tsx
```

### Custom CLI Commands

Extend Forge with custom commands:

```typescript
// scripts/custom-command.ts
import { Command } from 'commander';

export function customCommand() {
  const program = new Command();
  
  program
    .command('my-command')
    .description('My custom command')
    .action(() => {
      // Your custom logic
    });
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/forge.git
cd forge

# Install dependencies
npm install

# Build the CLI
npm run build

# Link for local testing
npm link

# Run tests
npm test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Inspired by [shadcn/ui](https://ui.shadcn.com) for the registry pattern
- Built with [Commander.js](https://github.com/tj/commander.js) for CLI functionality
- Uses [Zod](https://github.com/colinhacks/zod) for schema validation

## 📞 Support

- 📖 [Documentation](https://forge-cli.dev)
- 🐛 [Issue Tracker](https://github.com/your-org/forge/issues)
- 💬 [Discussions](https://github.com/your-org/forge/discussions)
- 📧 Email: support@forge-cli.dev

---

**Happy Forging! 🔥**
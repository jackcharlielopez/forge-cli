#!/bin/bash

# 🔥 Forge Component Library Setup Script
# This script demonstrates how to set up a complete component library using Forge

set -e

echo "🔥 Setting up Forge Component Library..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
LIBRARY_NAME="${1:-my-component-library}"
AUTHOR_NAME="${2:-$(git config user.name || echo 'Your Name')}"
REPO_URL="${3:-}"

echo -e "${BLUE}📦 Creating component library: ${LIBRARY_NAME}${NC}"

# Create directory and initialize
mkdir -p "$LIBRARY_NAME"
cd "$LIBRARY_NAME"

# Initialize git if not already done
if [ ! -d ".git" ]; then
    git init
    echo -e "${GREEN}✅ Initialized git repository${NC}"
fi

# Install Forge CLI globally if not installed
if ! command -v forge &> /dev/null; then
    echo -e "${YELLOW}📥 Installing Forge CLI...${NC}"
    npm install -g forge-cli@latest
fi

# Initialize Forge project
echo -e "${BLUE}🚀 Initializing Forge project...${NC}"
forge init \
  --name "$LIBRARY_NAME" \
  --description "A beautiful component library built with Forge" \
  --author "$AUTHOR_NAME" \
  --typescript \
  --tailwind

# Create example components
echo -e "${BLUE}🎨 Creating example components...${NC}"

# Create a variety of components to showcase different templates
components=(
    "button:button"
    "input:input"
    "card:card"
    "modal:modal"
    "badge:basic"
    "avatar:basic"
    "spinner:basic"
    "tooltip:basic"
)

for component_def in "${components[@]}"; do
    IFS=':' read -r name template <<< "$component_def"
    echo -e "${GREEN}  ➕ Adding ${name} component...${NC}"
    forge add "$name" --template "$template" --category "ui"
done

# Add some utility components
echo -e "${GREEN}  ➕ Adding utility functions...${NC}"
forge add "format-date" --template "utility" --category "utilities"
forge add "use-local-storage" --template "hook" --category "utilities"

# Create additional categories
echo -e "${BLUE}📂 Creating layout components...${NC}"
forge add "container" --template "basic" --category "layout"
forge add "grid" --template "basic" --category "layout"
forge add "flex" --template "basic" --category "layout"

# Create form components
echo -e "${BLUE}📝 Creating form components...${NC}"
forge add "checkbox" --template "input" --category "forms"
forge add "radio-group" --template "basic" --category "forms"
forge add "select" --template "input" --category "forms"

# Validate all components
echo -e "${BLUE}✅ Validating components...${NC}"
forge validate

# Build the library
echo -e "${BLUE}🏗️ Building component library...${NC}"
forge build --verbose

# Create package.json with proper scripts
echo -e "${BLUE}📦 Setting up package.json...${NC}"
cat > package.json << EOF
{
  "name": "@${AUTHOR_NAME,,}/${LIBRARY_NAME}",
  "version": "1.0.0",
  "description": "A beautiful component library built with Forge",
  "author": "${AUTHOR_NAME}",
  "license": "MIT",
  "homepage": "https://${AUTHOR_NAME,,}.github.io/${LIBRARY_NAME}",
  "repository": {
    "type": "git",
    "url": "${REPO_URL:-https://github.com/${AUTHOR_NAME,,}/${LIBRARY_NAME}.git}"
  },
  "scripts": {
    "dev": "forge build --watch",
    "build": "forge build",
    "validate": "forge validate",
    "publish": "forge publish",
    "test": "jest",
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "prepare": "npm run validate && npm run build"
  },
  "keywords": [
    "components",
    "ui",
    "react",
    "typescript",
    "tailwind",
    "forge"
  ],
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "forge-cli": "^1.0.0",
    "jest": "^29.0.0",
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  }
}
EOF

# Create ESLint config
echo -e "${BLUE}🔧 Setting up ESLint...${NC}"
cat > .eslintrc.js << 'EOF'
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['react', '@typescript-eslint'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
EOF

# Create .gitignore
echo -e "${BLUE}📝 Creating .gitignore...${NC}"
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
public/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Temporary folders
tmp/
temp/
EOF

# Install dependencies
echo -e "${BLUE}📥 Installing dependencies...${NC}"
npm install

# Create initial commit
echo -e "${BLUE}📝 Creating initial commit...${NC}"
git add .
git commit -m "🎉 Initial Forge component library setup

- Initialized with Forge CLI
- Created example components across multiple categories
- Set up build pipeline and validation
- Ready for development and deployment"

# Final summary
echo -e "${GREEN}🎉 Component library setup complete!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
component_count=$(forge list --json | jq length 2>/dev/null || echo "N/A")
echo -e "  📦 Components created: ${component_count}"
echo -e "  📂 Categories: ui, forms, layout, utilities"
echo -e "  🏠 Directory: $(pwd)"
echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo -e "  ${YELLOW}1.${NC} Customize your components in src/components/"
echo -e "  ${YELLOW}2.${NC} Test your build: ${GREEN}npm run build${NC}"
echo -e "  ${YELLOW}3.${NC} Start development: ${GREEN}npm run dev${NC}"
echo -e "  ${YELLOW}4.${NC} Deploy to GitHub Pages: ${GREEN}npm run publish${NC}"
echo ""
echo -e "${BLUE}📖 Documentation:${NC}"
echo -e "  Local docs will be available at: public/docs/index.html"
echo -e "  After deployment: https://${AUTHOR_NAME,,}.github.io/${LIBRARY_NAME}"
echo ""
echo -e "${GREEN}Happy coding! 🔥${NC}"
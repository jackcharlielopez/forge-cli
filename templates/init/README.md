# {{name}}

{{description}}

## Installation

First, authenticate with GitHub Packages by creating a .npmrc file in your project root:

```
@forge:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Then install the package:

```bash
npm install @forge/cli
```

Or use it directly with npx:

```bash
npx @forge/cli add button
```

## Usage

```jsx
import { Button } from "./{{componentsDir}}/button";

function App() {
  return <Button variant="primary">Click me</Button>;
}
```

## Available Components

Visit the [component registry](./public/registry.json) to see all available components.

## Development

```bash
# Add a new component
forge add my-component

# Build the library
forge build

# Validate components
forge validate

# Publish to GitHub Pages
forge publish
```

## Configuration

See `forge.config.json` for configuration options.

## License

{{license}}

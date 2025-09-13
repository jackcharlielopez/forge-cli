# Button Component

A versatile button component that supports various styles, states, and customizations.

## Features

- Multiple variants (default, secondary, destructive, outline, ghost, link)
- Different sizes (default, small, large, icon)
- Loading state with spinner
- Disabled state
- Icon support
- Keyboard accessibility
- Customizable via Tailwind CSS classes

## Installation

The button component is part of your component library. No additional installation is needed.

## Usage

```tsx
import { Button } from '@your-lib/components';

// Basic usage
<Button>Click me</Button>

// Different variants
<Button variant="default">Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Different sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// Loading state
<Button loading>Loading</Button>

// Disabled state
<Button disabled>Disabled</Button>

// With icon
<Button>
  <Icon className="mr-2" />
  With Icon
</Button>
```

## Props

| Prop        | Type                                                                          | Default     | Description                               |
| ----------- | ----------------------------------------------------------------------------- | ----------- | ----------------------------------------- |
| `variant`   | `'default' \| 'secondary' \| 'destructive' \| 'outline' \| 'ghost' \| 'link'` | `'default'` | The visual style variant of the button    |
| `size`      | `'default' \| 'sm' \| 'lg' \| 'icon'`                                         | `'default'` | The size of the button                    |
| `loading`   | `boolean`                                                                     | `false`     | Whether the button is in a loading state  |
| `asChild`   | `boolean`                                                                     | `false`     | Whether to merge props onto child element |
| `className` | `string`                                                                      | `''`        | Additional CSS classes                    |

Plus all standard HTML button attributes.

## Styling

The component uses Tailwind CSS classes and supports theme customization through CSS variables:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... other theme variables */
}
```

## Accessibility

- Uses native `<button>` element
- Supports keyboard navigation
- Maintains proper contrast ratios
- Includes loading state announcements
- Preserves focus states

## Examples

### Basic Button

```tsx
<Button>Click me</Button>
```

### Loading Button with Icon

```tsx
<Button loading>
  <Icon className="mr-2" />
  Submitting
</Button>
```

### Link-styled Button

```tsx
<Button variant="link" href="#" onClick={(e) => e.preventDefault()}>
  Learn more
</Button>
```

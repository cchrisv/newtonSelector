# Project Guidance

## Design System

All designs, components, and UI work in this project MUST match and adhere to **Salesforce Lightning Design System 2.0 (SLDS 2)**.

- Reference: https://lightningdesignsystem.com/2e1ef8501
- Use SLDS 2 design tokens, styling hooks, and component patterns — do not hardcode CSS values (colors, spacing, typography, radii, shadows).
- Prefer SLDS 2 utility classes and BEM class names over custom styles.
- For existing LWC components, run the SLDS linter and fix violations when making visual changes (see the `uplifting-components-to-slds2` skill).
- New components should be built SLDS 2–compliant from the start, including accessibility (WCAG 2.1 AA), RTL support, and dark mode tokens where applicable.

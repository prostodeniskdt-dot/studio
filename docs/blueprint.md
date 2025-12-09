# **App Name**: BarBoss Inventory

## Core Features:

- Product Management: Create, edit, and archive bar inventory items (alcohol, syrups, etc.) with details like name, category, volume, cost, and selling price.
- Inventory Session Management: Create, manage, and complete inventory sessions for different bars, dates, and times, tracking session status and creator.
- Stock Calculation: Automatically calculate theoretical stock levels based on initial stock, purchases, and sales, highlighting discrepancies between theoretical and actual stock.
- Variance Analysis Tool: Analyze inventory variances to identify the causes. The LLM uses reasoning to output possible causes based on available information about usage trends.
- Role-Based Access Control: Implement role-based access control (admin, manager, bartender) to restrict access to different features and data based on user roles.
- Reporting and Analytics: Generate reports summarizing inventory data, including stock levels, variances, and financial losses, with options to export data to CSV/Excel.
- Data Persistence: Data will be persisted to a Firestore database.

## Style Guidelines:

- Primary color: Deep violet (#673AB7), a saturated, but not vibrant, choice intended to convey precision with a hint of extravagance.
- Background color: Very light violet (#F3E5F5), provides a calm, orderly backdrop, which won't be tiring during long stock-taking shifts.
- Accent color: Indigo (#3F51B5), this more saturated color highlights important UI elements without disrupting the primary hue.
- Body and headline font: 'Inter' sans-serif font to ensure readability, modernity, and objectivity for all UI text. Its clean lines help users see everything clearly.
- Use consistent, simple icons for product categories and actions. Icons should be easily recognizable and related to the represented functions or items.
- Design a mobile-first, responsive layout with clear information hierarchy. Ensure key data and actions are easily accessible on smaller screens, simplifying inventory management for bartenders.
- Use subtle transitions and animations to provide feedback and guide the user. Animate changes in stock levels and variances to visually communicate insights without being distracting.
# Controller Naming Convention

This folder uses domain-first organization:

- One subfolder per domain (cart, order, product, etc.)
- Each domain exposes handlers through `index.js`
- File names describe responsibility, not symmetry across domains

## File Naming Rules

Use only these lower-case file names:

- `index.js`: domain export surface
- `crud.js`: create/read list/read detail/update/delete handlers for main resource
- `list.js`: list/search handlers when separated from CRUD
- `detail.js`: single-resource detail handlers
- `status.js`: status transition/toggle handlers only
- `items.js`: nested line-item handlers (cart items, order items, etc.)
- `payment.js`: payment handlers
- `media.js`: media/upload handlers
- `variant.js`, `inventory.js`, `price.js`: sub-resource handlers by name
- `helpers.js`: controller-local pure helpers only
- `mutations.js`: write operations that are not status-specific

Notes:

- Not every domain must have all files.
- Do not create `status.js` unless it actually handles status changes.
- Do not create `items.js` unless the domain has nested item operations.

## Function Naming Rules

Use verb-first camelCase names with explicit target.

- Preferred verbs: `create`, `get`, `list`, `update`, `delete`, `toggle`, `set`, `add`, `remove`, `reorder`, `process`.
- Include resource name in the function: `getCustomerList`, `updateOrderStatus`, `addItemToCart`.
- Avoid transport-layer suffixes like `Controller` in handler names.
- Helpers should be action/intent based: `getOrCreateCart`, `validateNoCycle`.

### Preferred Name Examples

- Prefer `createCategory` over `addCategory`.
- Prefer `listCategories` over `listCategory`.
- Prefer `deleteCategory` over `removeCategory`.
- Prefer `createProduct` over `addProduct`.
- Keep `addItemToCart` for nested item semantics (domain action is "add item", not "create cart").

### Legacy Alias Policy

- If renaming a public handler, keep a temporary alias export in the domain file.
- Routes should import preferred names only.
- Remove aliases in a dedicated cleanup release when no imports depend on them.

## Export Rules

- Keep route imports pointing to domain `index.js` when possible.
- Re-export only handlers intended for routing from `index.js`.
- Avoid exporting utility helpers from `index.js` unless intentionally shared.

# Optimist QC

Quality-management inspection tracker for Optimist Precision — a powder-metal manufacturer. Tracks inspections across production stages (blank, infiltration, heat treat, finishing, rework), manages parts, customers, work orders, inspectors, and non-conformance reports (NCRs).

## Tech stack

- **Frontend:** React 18 + Vite
- **Backend:** Convex (real-time database, mutations, queries)
- **Auth:** Convex Auth with Google OAuth (restricted to @optimistii.com)

## Development

```bash
npm install
npx convex dev   # start Convex backend
npm run dev      # start Vite frontend
```

## Deployment

```bash
npx convex deploy
npm run build     # static assets for hosting
```

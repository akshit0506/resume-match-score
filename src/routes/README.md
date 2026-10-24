# GetSeen routes

GetSeen uses TanStack Start file-based routing. The routes below define the application’s main screens.

| File | URL | Purpose |
| --- | --- | --- |
| `index.tsx` | `/` | Upload a resume, supply a job description, and start an analysis. |
| `results.$id.tsx` | `/results/:id` | Review a report, improve the resume, and prepare application materials. |
| `auth.tsx` | `/auth` | Sign in to keep a saved scan history. |
| `history.tsx` | `/history` | View scans associated with the signed-in account. |
| `__root.tsx` | Shared layout | Render the application shell and route content. |

## Contributor conventions

- Add pages under `src/routes`; keep `index.tsx` as the sole owner of `/`.
- Use TanStack Router navigation rather than introducing another router.
- Shared layouts render child content through `<Outlet />`.
- Set app-specific titles and social metadata on each content route.
- Keep server-only operations inside server functions; never expose privileged credentials to browser code.
- `src/routeTree.gen.ts` is generated automatically; do not edit it by hand.

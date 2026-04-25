# AGENTS.md

## Project Shape
- Single Angular application (`tamagotchi-pet`), not a workspace/monorepo; source root is `src` and the browser entrypoint is `src/main.ts`.
- The app is standalone Angular: `bootstrapApplication(App, appConfig)` wires `src/app/app.ts` through `src/app/app.config.ts`; `src/app/app.routes.ts` is currently empty.
- Game state, pet definitions, shop items, persistence, and tick/action logic all live in `src/app/game.service.ts` using Angular signals and `localStorage` key `tamagotchi-pet-state`.
- Pet images are static assets under `public/assets/pets/` and are referenced as `assets/pets/<imageBase>-stage-<stage>.svg`; adding pets/stages requires matching SVG filenames.

## Commands
- Use npm; `package-lock.json` and `angular.json` both indicate npm (`packageManager`: `npm@10.8.2`).
- Angular 21 dependencies require Node `^20.19.0 || ^22.12.0 || >=24.0.0`.
- Install: `npm ci`.
- Dev server: `npm start` (`ng serve`, development config by default).
- Production build: `npm run build` (verified; outputs to `dist/tamagotchi-pet`).
- Focused typecheck: `npx tsc -p tsconfig.app.json --noEmit` (verified).
- Tests are not currently wired: `npm test` runs `ng test` but fails with `Cannot determine project or target for command`; `ng test --watch=false` also fails because `watch` is unknown here.
- There is no lint script or ESLint config in this repo.

## Formatting And Style
- Prettier config is `.prettierrc`: `printWidth` 100, single quotes, Angular parser for `*.html`.
- `npx prettier . --check` currently reports existing drift in `src/app/app.html`, `src/app/app.scss`, `src/app/game.service.ts`, and `src/styles.scss`; do not treat that as caused by your change unless you touched those lines.
- Angular schematics are configured to use SCSS and `skipTests: true` for generated classes/components/directives/guards/interceptors/pipes/resolvers/services.
- TypeScript is strict (`strict`, `noImplicitOverride`, `noImplicitReturns`, `strictTemplates`, etc.); prefer making the strict check pass before relying on a build.

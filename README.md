# Cookrew

Cookrew is a [Next.js](https://nextjs.org) workspace for browsing bundles, following workflow timelines, and coordinating chat context across repos.

## Getting Started

Install dependencies with either supported package manager:

```bash
pnpm install
# or
bun install
```

Start the development server:

```bash
pnpm dev
# or
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Live KrewHub

To point Cookrew at a live local KrewHub on `http://127.0.0.1:8420`, create `.env.local` with:

```bash
KREWHUB_BASE_URL=http://127.0.0.1:8420
KREWHUB_API_KEY=dev-api-key
```

Then restart `pnpm dev` and open either `http://localhost:3000` or `http://127.0.0.1:3000`.

You can start editing the page in `src/app/page.tsx`. The page auto-updates as you edit the file.

## Testing

Run linting and Playwright end-to-end tests with the same package manager you used to install dependencies:

```bash
pnpm lint
pnpm test:e2e

bun run lint
bun run test:e2e
```

Playwright automatically starts the Next.js dev server with `pnpm` or `bun`, so local test runs stay aligned with your current workflow.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

![leaflet gh 4-up banner img](https://github.com/user-attachments/assets/991d7138-cc8b-4fbb-9919-6d2a54ae3820)

Leaflet is a tool for shared writing and social publishing.

- **Shared writing**: make Leaflets, instant collaborative docs with rich media, multiple pages and more
- **Social publishing**: create Publications, like blogs or newsletters, that your friends can follow — built on Bluesky

## How to get started

Leaflet is a fast, responsive web app — no installation needed, though you *can* add it as a PWA!

TL;DR below — for more detail and examples, visit the [Leaflet Manual](https://about.leaflet.pub).

### Leaflets

Make a new Leaflet — a simple shareable *post* or *document* — with no account needed at [leaflet.pub/new](https://leaflet.pub/new).

Use Leaflets for shared notes and docs, collections, wikis, homepages and [lots more](https://make.leaflet.pub).

### Publications

To make a Publication, connect with Bluesky from [leaflet.pub/home](https://leaflet.pub/home), then add posts.

Use Publications on Leaflet for blogs, newsletters, project logs — anything you want people to read and follow.

Read ours here: [Leaflet Lab Notes](https://lab.leaflet.pub/).

### Local Development (Linux, WSL)

#### Prerequisites

- [NodeJS](https://nodejs.org/en) (version 20 or later)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Docker](https://docker.com) (required for local Supabase)

#### Installation

1. Clone the repository `git clone https://tangled.org/leaflet.pub/leaflet.git`
   1. If using WSL, it's recommended to install in the native file structure vs in a mounted Windows file structure (i.e, prefer installing at `~/code/leaflet` vs `/mnt/c/code/leaflet`)
2. Install the dependencies: `npm install`
3. Install the Supabase CLI:
   - **macOS:** `brew install supabase/tap/supabase`
   - **Windows:** `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase`
   - **Linux:** Use Homebrew or download packages from [releases page](https://github.com/supabase/cli/releases)
   - **Via npm:** The CLI is already included in package.json, use `npx supabase` for commands

#### Local Supabase Setup

1. Start the local Supabase stack: `npx supabase start`
   - First run takes longer while Docker images download
   - Once complete, you'll see connection details in the terminal output
   - Keep note of the `API URL`, `anon key`, `service_role key`, and `DB URL`
2. Copy the `.env` file example to `.env.local` and update with your local values from the previous step:

```env
# Supabase Configuration (from `supabase start` output)
NEXT_PUBLIC_SUPABASE_API_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key-from-terminal
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key-from-terminal

# Database (default local connection)
DB_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Leaflet specific
LEAFLET_APP_PASSWORD=any-password-you-want

# Feed Service (for publication features, optional)
FEED_SERVICE_URL=http://localhost:3001
```

#### Database Migrations

1. Apply migrations to your local database:
   - First time setup: `npx supabase db reset` (resets database and applies all migrations)
   - Apply new migrations only: `npx supabase migration up` (applies unapplied migrations)
   - Note: You don't need to link to a remote project for local development
2. Access Supabase Studio at `http://localhost:54323` to view your local database

#### Running the App

1. `npm run dev` to start the development server
2. Visit `http://localhost:3000` in your browser

#### Stopping Local Supabase

- Run `npx supabase stop` to stop the local Supabase stack
- Add `--no-backup` flag to reset the database on next start

#### Feed service setup (optional)

Setup instructions to run a local feed service from a docker container. This step isn't necessary if you're not working on publication or BlueSky integration features.

1. Clone the repo `git clone https://github.com/hyperlink-academy/leaflet-feeds.git`
2. Update your `.env.local` to include the FEED_SERVICE_URL (if not already set): `git clone https://github.com/hyperlink-academy/leaflet-feeds.git`
3. Change to the directory and build the docker container `docker build -t leaflet-feeds .`
4. Run the docker container on port 3001 (to avoid conflicts with the main app): `docker run -p 3001:3000 leaflet-feeds`

#### Troubleshooting

- Persisting articles on a fresh install over a fresh DB are usually due to stale Replicache entrys. To clear, open your browser DevTools and delete Replicache entries (usually under IndexedDB Storage)
- Supabase settings will get cached in `.next`; if you change where you're pointing your supabase connections to you may need to delete the `.next` folder (it will rebuild next time you start the app).

## Technical details

The stack:

- [Typescript](https://www.typescriptlang.org/) for types
- [React](https://react.dev/) & [Next.js](https://nextjs.org/) for UI and app framework
- [Supabase](https://supabase.com/) for db / storage layer
- [Replicache](https://replicache.dev/) for realtime data sync layer
- [TailwindCSS](https://tailwindcss.com/) for styling magic

See the `lexicons` and `appview` directories if you're curious about our Bluesky implementation. More documentation to come; let us know if there's something you want to read about (like how to bring your own frontend using our appview!)

Leaflet is open source. Please reach out by [email](mailto:contact@leaflet.pub) or [Bluesky](https://bsky.app/profile/leaflet.pub) with any questions or feedback!

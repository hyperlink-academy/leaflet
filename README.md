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

- [NodeJS](https://nodejs.org/en)
- [Supabase](https://supabase.com)
- [Docker](https://docker.com)
 
#### App setup

1. Clone the repository `git clone https://tangled.org/leaflet.pub/leaflet.git`
   1. If using WSL, it's recommended to install in the native file structure vs in a mounted Windows file structure (i.e, prefer installing at `~/code/leaflet` vs `/mnt/c/code/leaflet`)
2. Install the dependencies: `npm install`
3. Create a new Supabase project via the Supabase web dashboard.
   1. Your `API URL`, `ANON KEY`, and `SERVICE ROLE KEY` are found in the `Project Settings --> API Keys` menu. This project uses legacy keys not the publishable/secret API key system.
   2. The Database URL is found by pressing the `Connect` button at the top of the screen. The direct connection string by default uses the IPv6 systems which can cause issues in default local setups. If that is the case, the Shared Pool connection string will work for IPv4 local development.
4. Create an `.env.local` file in the root folder with the following configuration:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_API_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database
DB_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres

# Leaflet specific
LEAFLET_APP_PASSWORD=any-password-you-want

# Feed Service (for publication features)
FEED_SERVICE_URL=https://localhost:3001
```
5. `npm run dev` to run the project

#### Database Migrations

1. Install the supabase CLI `npm install supabase`
   1. You can install it globally with the -g flag, in which case you can omit the `npx` from the following commands
2. Login to the CLI `npx supabase login`
3. Link to your database project `npx supabase link --project-ref <project-id>`
4. Run migrations `npx supabase db push`

#### Feed service setup (optional)

Setup instructions to run a local feed service from a docker container. This step isn't necessary if you're not working on publication or BlueSky integration features.

1. Clone the repo `git clone https://github.com/hyperlink-academy/leaflet-feeds.git`
2. Update your `.env.local` to include the FEED_SERVICE_URL (if not already set): `git clone https://github.com/hyperlink-academy/leaflet-feeds.git`
3. Change to the directory and build the docker container `docker build -t leaflet-feeds .`
4. Run the docker container on port 3001 (to avoid conflicts with the main app): `docker run -p 3001:3000 leaflet-feeds`

## Technical details

The stack:

- [Typescript](https://www.typescriptlang.org/) for types
- [React](https://react.dev/) & [Next.js](https://nextjs.org/) for UI and app framework
- [Supabase](https://supabase.com/) for db / storage layer
- [Replicache](https://replicache.dev/) for realtime data sync layer
- [TailwindCSS](https://tailwindcss.com/) for styling magic

See the `lexicons` and `appview` directories if you're curious about our Bluesky implementation. More documentation to come; let us know if there's something you want to read about (like how to bring your own frontend using our appview!)

Leaflet is open source. Please reach out by [email](mailto:contact@leaflet.pub) or [Bluesky](https://bsky.app/profile/leaflet.pub) with any questions or feedback!


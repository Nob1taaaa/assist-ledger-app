# Assist Ledger

Assist Ledger is a developer analytics prototype for studying pull request flow and AI-assisted engineering. It has two clearly separated sources:

- **Demo mode** uses deterministic synthetic data to preview the benchmark and ingestion concepts.
- **GitHub mode** loads up to 100 recent pull requests through a Supabase Edge Function. The function supports public repositories and private repositories that the server-side GitHub credential can access. It displays only facts returned by GitHub: author, state, timestamps, changed lines, and links.

GitHub PR metadata does not tell us whether AI was used, how many model tokens were spent, whether CI passed on its first run, or whether a defect escaped. Assist Ledger does not infer those values. A credible AI productivity study needs explicit instrumentation and a defined measurement protocol before those comparisons can use real data.

## Run locally

```sh
npm install
npm run dev
```

Open **Developer Ingestion Hub**, enter a repository as `owner/name`, and choose **Import pull requests**. The default repository is `Nob1taaaa/assist-ledger`.

## Connect Supabase

1. Create a Supabase project, then copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the project's API settings. `.env.local` is ignored by Git.
2. Install and sign in to the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Apply the checked-in database migration and deploy the import function:

   ```sh
   npx supabase db push
   npx supabase functions deploy import-github-repository
   ```

4. Restart the Vite server and create your Assist Ledger account in the sign-in screen. Confirm your email if prompted.
5. Open **Developer Ingestion Hub** and import a repository. The Edge Function fetches the latest 100 PRs and upserts them. The dashboard reads saved rows from the database after a reload.

The importer requires Supabase sign-in, saves rows under the signed-in user's ID, and applies RLS so users only read their own imported PRs. Private-repository access uses a GitHub credential stored as a Supabase Edge Function secret. For a production startup, replace the personal GitHub credential with a GitHub App installation token and add request limits. Never put server-side credentials in `.env.local` or frontend code.

## Current scope

- GitHub pull request import and source-specific overview
- Supabase Auth, per-user RLS, database persistence, and server-side GitHub credential
- Demo benchmark and simulated event stream
- Supabase schema sketch and webhook payload examples for future ingestion

The live GitHub webhook endpoint is not implemented yet. For a production study, the next steps are a server-side GitHub App/webhook receiver, durable workflow run storage, verified AI attribution (for example opt-in PR labels or IDE instrumentation), and an auditable protocol for defect and cost measurements.

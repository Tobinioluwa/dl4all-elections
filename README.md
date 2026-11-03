# DL4All Nigeria Elections

A simple, live election site. Approved state and LGA presidents sign in, vote once, and everyone sees the results update in real time.

Stack: Next.js 15 (App Router, TypeScript) and Supabase (Postgres, Auth, Storage, Realtime). No other services.

## What it does
- **Voters:** state presidents and LGA presidents create an account with their state, state code and role (LGA presidents add their LGA). One national vote, every vote counts the same.
- **Approval:** an admin approves each president, or switches on "Approve all at once".
- **Ballot:** one choice per position, a confirm step, then a receipt code. Ballots are secret: the database records who voted, never what they chose.
- **Live results:** bars and percentages update the moment a vote is counted (Supabase Realtime).
- **Admin:** open or close voting, add positions and contestants (with pictures), approve people, make other admins, reset test votes.
- **First account is the admin.** Create it yourself straight after deploying.

## Set up (about 15 minutes)

### 1. Supabase
1. Create a project at supabase.com.
2. Open **SQL Editor**, paste all of `supabase/migrations/0001_init.sql` and run it once. Then do the same with `0002_rules_and_nullify.sql` (rules page and nullify votes).
3. **Authentication > Providers > Email:** keep Email on and switch **"Confirm email" OFF**, so people can sign in straight after signing up with no email to open. Admin approval is then the only check that someone is really a president.
4. **Authentication > URL configuration:** set Site URL to your live address once you have it.
5. **Project settings > API:** copy the Project URL and the `anon` public key.

### 2. Run it on your computer
```bash
cp .env.example .env.local   # then paste the two values
npm install
npm run dev                  # http://localhost:3000
```
Open the site, choose **Create account**. The first account becomes the admin.

### 3. Put it online (Vercel)
1. Push this repo to GitHub.
2. On vercel.com choose **Add New > Project**, import the repo.
3. Add the two environment variables from `.env.example`.
4. Deploy. Then put the Vercel address into Supabase **Site URL** (step 1.4).

## Before the real election
- Create the admin account first. Anyone who signs up before you becomes the admin.
- Read the wording of the rules in `src/components/RulesText.tsx` and edit it to match your constitution.
- Add positions and contestants, then press **Reset all votes** to clear any test votes.
- Switch on voting only when the ballot is ready.
- Supabase's built-in email sender allows only a few emails an hour. For a large election, set your own SMTP (for example Brevo) under Authentication > Emails.

## How the rules are enforced
All rules live in the database (`supabase/migrations/0001_init.sql`), not just the screens:
- Only approved presidents can call `cast_vote`; it fails if voting is closed or the person already voted.
- `vote_counts` can only be changed by `cast_vote` and `reset_votes`.
- Only admins can change settings, positions, contestants, approvals and roles.
- Candidate pictures upload to a public Supabase Storage bucket, admins only.

## Known limits
- One vote per account. Emails are not verified, so rely on the admin approval step to stop fake or duplicate accounts.
- If the same person must not hold two accounts, check the president list by hand when approving.
- Votes cast before `0002` was run cannot be nullified one by one (use Reset all votes for those).
- Choices are stored per voter so a vote can be nullified. The admin screens never list anyone's choices, but whoever has database access can see them.

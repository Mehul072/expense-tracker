# Expense Tracker

Static site (Netlify) + Supabase (auth + Postgres). No build step.

## Setup

1. **Supabase**: create a project → SQL Editor → run `schema.sql`.
2. **Keys**: Project Settings → API → copy URL and anon key into the top of `app.js`.
3. **Deploy**: drag the folder into Netlify (Sites → Add new site → Deploy manually).
4. **Auth URL**: Supabase → Authentication → URL Configuration → set Site URL to your Netlify URL (confirmation emails link there).

## How it works

- Every change is a row in `transactions`; balances are summed from them.
- **Set balance** records the difference from the current balance, so you can start from what you have now (or correct it later) without losing history.
- **Transfer** moves money between online and cash (e.g. ATM withdrawal); total is unchanged.
- Row-level security: each user can only read/write their own rows.


# StockYard

One sentence: what it is and who it's for.
Built for the NT Tech Innovation Full Stack Developer assessment (October 2026).

**Live demo:** <link>

**Demo logins:**

Admin    admin@stockyard.demo    Admin@1234
Manager    manager@stockyard.demo    Manager@1234

## Problem
Shops that sell construction and hardware materials usually record their orders, sales and stock by hand on paper. Because of this, they have no reliable stock count, no sales history to analyze, and no clear picture of how sales are performing. When I visited my uncle’s construction shop in our local market, he could not say exactly how much stock he had. He didn’t know when to restock, which products to buy or in what quantity, and he had no way to estimate upcoming sales. StockYard records orders and stock digitally and uses past sales to forecast demand, giving the owner an approximate idea of upcoming sales and a list of products to restock.

## What it does
<3–5 bullets: the main things a user can do>

## Tech stack
<frontend, backend, database, auth, validation, tests: one line each on why you chose it>

## Architecture
<how the React client, Express API and PostgreSQL connect, and where login and roles are checked>

## Database design
<your table list, plus the photo of your sketch>

Key decisions:
- One users table with roles: <why>
- Order items store the price at the time of sale: <why>
- Products are archived, not deleted: <why>
- Decimal for money and quantities: <why>

## Key APIs
| Method | Path | Who can call it | What it does |
|---|---|---|---|

## Order status flow
<allowed transitions, what each does to stock, what happens on an invalid move>

## AI feature: demand forecast
- Input:
- How it works:
- Output:
- Evaluation: <your backtest error vs the naive baseline>
- Limitations:

## Security
<password hashing, tokens, role checks, input validation, secrets kept in .env>

## Testing
<what's tested and why those parts>
<how to run the tests>

## Run locally
1. Prerequisites:
2. Install:
3. Environment: copy `server/.env.example` to `server/.env` and fill in the values
4. Database: migrate and seed
5. Start: server, then client

## Environment variables
<each variable the server reads and what it's for; never real values>

## Known limitations

## Next steps
- Customer dues (baki) tracking with overdue follow-up
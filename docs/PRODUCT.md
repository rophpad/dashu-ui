![Askdb Logo](logo.png)

AskDB — Product Definition (clean positioning)
One-liner

AskDB turns any PostgreSQL database into a conversational analytics interface.

What AskDB actually is

AskDB is an AI layer on top of databases that lets developers:

connect a database
auto-detect schema
and allow users to query it in natural language

No dashboards to build. No SQL needed.

Core idea

Instead of:

writing SQL
building dashboards
creating BI tools

You simply do:

AskDB.connect(database)

And users can ask:

“Which customers generate the most revenue?”

“How many orders this month?”

“Show active subscriptions”

🧠 How AskDB works (technical architecture)
User Question
      ↓
LLM (intent parsing)
      ↓
Schema + semantic layer
      ↓
SQL generator
      ↓
Database execution
      ↓
Result formatting (table / chart / summary)
      ↓
UI response
⚙️ Developer experience (core product)
1. Install
npm install askdb
2. Connect database
Option A (self-hosted / OSS)
import { AskDB } from "askdb";

AskDB.init({
  databaseUrl: process.env.DATABASE_URL
});
3. Auto schema discovery

AskDB automatically reads:

tables
columns
relations (foreign keys)

Example output:

users
orders
payments
products

Relationships:

users → orders → payments
4. Semantic understanding (minimal config)

Optional step (very important for accuracy):

AskDB.describe({
  customer: "users",
  revenue: "payments.amount",
  order: "orders"
});

👉 This is what makes AskDB powerful vs basic “text-to-sql”.

💬 User experience (frontend)

A simple interface:

Ask your database anything
_________________________________

> Which customers generate the most revenue?
Response example
Top Customers

1. Acme Corp — $45,000
2. Stripe Labs — $38,200
3. NovaTech — $31,000
📊 Output types (important for product feel)

AskDB should NOT only return text.

It returns:

1. Table

For rankings, lists

2. Chart

For trends

3. Insight summary (optional later)

Simple explanation

🔒 Safety & constraints (important for trust)

AskDB should be:

READ ONLY by default
SQL sandboxed
query-limited
role-aware (optional future)

Example:

SELECT allowed only
no INSERT / UPDATE / DELETE
🚀 What makes AskDB different (critical)

There are already tools like:

BI dashboards
SQL editors
AI SQL generators

BUT AskDB is:

a developer-embedded AI query layer for production apps

Not a BI tool.

Not a dashboard builder.

Not a chatbot.

👉 A database interface upgrade for end-users

🧭 Product evolution roadmap
Phase 1 (MVP)
PostgreSQL only
schema introspection
text → SQL
chat UI
Phase 2
semantic mapping
SDK for developers
role-based access
Phase 3
charts + dashboards
multi-database support
caching + analytics layer
Phase 4 (vision)

AskDB becomes the “default query layer” for all modern applications.

💡 Final positioning

If you want something very sharp:

AskDB is the AI query layer that turns any database into a conversational analytics system.

or shorter:

AskDB — Talk to your database.

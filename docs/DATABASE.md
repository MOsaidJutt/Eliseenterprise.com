# Database Schema — Plainview Phase 2

Database: **Neon PostgreSQL** (serverless, pgvector-enabled)

---

## Tables

### companies
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| slug | VARCHAR(50) UNIQUE | URL-safe identifier e.g. "plainview" |
| name | VARCHAR(200) | Display name |
| logo_path | VARCHAR(500) NULL | Local path to uploaded logo file |
| created_at | TIMESTAMP | Default: now() |

### users
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| email | VARCHAR(200) UNIQUE | Login email |
| hashed_password | VARCHAR(200) | bcrypt hash |
| name | VARCHAR(200) | Display name |
| role | VARCHAR(20) | `admin` or `user` |
| company_id | INT FK → companies.id NULL | |
| is_active | BOOLEAN | Default: true |
| created_at | TIMESTAMP | Default: now() |

### analyses
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| user_id | INT FK → users.id | Who ran the analysis |
| company_id | INT FK → companies.id NULL | |
| project_name | VARCHAR(300) | From XER project data |
| filenames | JSONB | Array of uploaded file names |
| file_type | VARCHAR(20) | `baseline` or `update` |
| notes | TEXT NULL | Optional user notes |
| result | JSONB | Full analysis JSON (KPIs, S-Curve, etc.) |
| created_at | TIMESTAMP | Default: now() |

> The `result` column stores the entire analytics JSON. This denormalized approach avoids complex joins for retrieval and allows fast loading of any historical snapshot.

### ai_conversations
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| user_id | INT FK → users.id | |
| analysis_id | INT FK → analyses.id NULL | The schedule context |
| title | VARCHAR(300) | Auto-generated from first message |
| created_at | TIMESTAMP | Default: now() |

### ai_messages
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| conversation_id | INT FK → ai_conversations.id CASCADE DELETE | |
| role | VARCHAR(20) | `user` or `assistant` |
| content | TEXT | Message body |
| created_at | TIMESTAMP | Default: now() |

---

## Relationships

```
companies 1──────────* users
companies 1──────────* analyses

users 1──────────* analyses
users 1──────────* ai_conversations

analyses 1──────────* ai_conversations
ai_conversations 1──────────* ai_messages
```

---

## Indexes

```sql
CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_company_id ON users(company_id);
CREATE INDEX ix_analyses_company_id ON analyses(company_id);
CREATE INDEX ix_analyses_user_id ON analyses(user_id);
CREATE INDEX ix_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX ix_ai_messages_conversation_id ON ai_messages(conversation_id);
```

---

## Setup on Neon

1. Create a new Neon project at [neon.tech](https://neon.tech)
2. Copy the connection string (format: `postgresql://user:pass@host/db?sslmode=require`)
3. Add to `.env` as `DATABASE_URL`
4. Enable pgvector extension (for future AI embeddings):
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
5. Run Alembic migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```

---

## Seeding Initial Data

After migrations, create the first company and admin user:

```bash
cd backend
python seed.py
```

Or via the API after first deploy:
```bash
# The first admin is created via environment variables:
# ADMIN_EMAIL=peter@eliseenterprise.com
# ADMIN_PASSWORD=yourpassword
# ADMIN_NAME=Peter
# COMPANY_NAME=Plainview
# COMPANY_SLUG=plainview
#
# On startup, main.py creates this user if no users exist.
```

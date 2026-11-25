-- NACES Alumni App — Stage 1: members, roles, finance
-- Safe to run once; the migrate script records applied files in schema_migrations.

CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  alumni_set      TEXT NOT NULL CHECK (alumni_set IN ('ND2005','HND2008','BOTH')),
  department      TEXT,
  matric_no       TEXT,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','fin_sec','admin')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  status_note     TEXT,
  approved_by     INT REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower ON users (lower(email));

CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user ON sessions(user_id);

-- What members can be asked to pay, or can pay voluntarily
CREATE TABLE payment_types (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('monthly_due','levy','contribution','donation','other')),
  billing         TEXT NOT NULL CHECK (billing IN ('monthly','one_off','voluntary')),
  default_amount  NUMERIC(12,2),
  description     TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One billing action by the Financial Secretary (e.g. "November 2026 dues", "Burial levy – late Mrs X")
CREATE TABLE billing_batches (
  id              SERIAL PRIMARY KEY,
  payment_type_id INT NOT NULL REFERENCES payment_types(id),
  title           TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  period          TEXT,               -- 'YYYY-MM' for monthly dues
  due_date        DATE,
  member_count    INT NOT NULL DEFAULT 0,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- What each member owes
CREATE TABLE charges (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_type_id INT NOT NULL REFERENCES payment_types(id),
  batch_id        INT REFERENCES billing_batches(id),
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  period          TEXT,
  description     TEXT NOT NULL,
  due_date        DATE,
  voided          BOOLEAN NOT NULL DEFAULT false,
  void_reason     TEXT,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- A member can only be billed once per monthly-due type per month
CREATE UNIQUE INDEX charges_monthly_unique ON charges(user_id, payment_type_id, period) WHERE period IS NOT NULL AND NOT voided;
CREATE INDEX charges_user ON charges(user_id);

-- Payments submitted by members (with slip) or recorded by the Fin Sec (cash)
CREATE TABLE payments (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose         TEXT NOT NULL CHECK (purpose IN ('dues','voluntary')),
  payment_type_id INT REFERENCES payment_types(id),     -- required for voluntary
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_on         DATE NOT NULL,
  method          TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (method IN ('bank_transfer','cash','pos','other')),
  reference       TEXT,
  slip_path       TEXT,
  member_note     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  reviewed_by     INT REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  recorded_by     INT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_user ON payments(user_id);
CREATE INDEX payments_status ON payments(status);

-- Charges the member said this payment is for
CREATE TABLE payment_targets (
  payment_id  INT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  charge_id   INT NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
  PRIMARY KEY (payment_id, charge_id)
);

-- How confirmed money is applied to charges (recomputed by the app, never edited by hand)
CREATE TABLE payment_allocations (
  payment_id  INT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  charge_id   INT NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  PRIMARY KEY (payment_id, charge_id)
);

CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    INT REFERENCES users(id),
  action      TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sensible starting payment types (editable by the Fin Sec)
INSERT INTO payment_types (name, category, billing, default_amount, description) VALUES
  ('Monthly Dues', 'monthly_due', 'monthly', 1000, 'Regular monthly dues for every member'),
  ('Burial Levy', 'levy', 'one_off', 5000, 'Raised when a member or a member''s close relation passes on'),
  ('Project Contribution', 'contribution', 'one_off', NULL, 'Contributions toward association projects'),
  ('Donation', 'donation', 'voluntary', NULL, 'Free-will donations to the association');

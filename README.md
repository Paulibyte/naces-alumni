# NACES Alumni App — ND 2005 & HND 2008 Sets, FEDPONEK

Members' portal for the NACES ND 2005 / HND 2008 alumni of Federal Polytechnic Nekede, Owerri.
Next.js 15 + self-hosted PostgreSQL + local file storage, for the Hostinger VPS.

## Stage 1 (this build) — members & finance

**Members**
- Register (name, email, phone, set: ND 2005 / HND 2008 / both, department, matric no.)
- Cannot log in until an executive verifies them (approve / reject with reason / suspend)
- Dashboard: amount owed, total billed, confirmed payments, slips awaiting confirmation,
  an itemised "what makes up what I owe" table and a full statement of charges
- Make a payment: tick the items being paid (amount auto-fills), upload the slip (JPG/PNG/WEBP/PDF, max 5 MB),
  add reference and note. Voluntary contributions/donations are paid the same way.
- My payments: history, status, Fin Sec notes, and exactly which charges each payment cleared

**Financial Secretary** (also Administrator)
- Payment types: add/edit/deactivate — monthly dues, levies, contributions, donations, other.
  Each is *billed monthly*, *billed once when raised*, or *voluntary*.
- Bill members: monthly dues for a chosen month (a member can never be billed twice for the same month),
  or a one-off levy with a reason (e.g. burial levy) — to all verified members or selected members
- Confirm payments: view slip, confirm, or reject with a note. "Undo" sends a mistaken review back to pending.
- Member balances: who owes what; open a member to see their statement, record a cash/POS payment,
  or void a charge billed in error
- Overview: total received, outstanding, collection per billing, money received per payment type

**Administrator**: everything above plus assigning roles (Member / Financial Secretary / Administrator) and suspending members.

### How balances are worked out
Confirmed dues payments are applied oldest-first: first to the items the member ticked, then to their oldest unpaid
items. Overpayment is held as credit and automatically clears the next charge. Balances are always recomputed from the
records, so voiding a charge or undoing a confirmation keeps the books correct. Every finance action is written to `audit_log`.

## Deploying on the Hostinger VPS

```bash
# 1. Database
sudo -u postgres psql -c "CREATE USER naces WITH PASSWORD 'STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE naces OWNER naces;"

# 2. Code
cd /var/www && git clone <your-repo> naces && cd naces
cp .env.example .env && nano .env          # DATABASE_URL, UPLOAD_DIR, admin login, bank details
sudo mkdir -p /var/www/naces-uploads && sudo chown $USER /var/www/naces-uploads
npm ci
npm run migrate
npm run seed:admin                          # creates the first admin from .env
NODE_OPTIONS=--max-old-space-size=2048 npm run build
pm2 start npm --name naces -- start         # listens on port 3010 (set PORT to change)
pm2 save
```

Nginx (then run certbot for HTTPS):
```nginx
server {
  server_name naces.yourdomain.com;
  client_max_body_size 6m;                  # payment slips up to 5 MB
  location / {
    proxy_pass http://127.0.0.1:3010;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Back up both the database (`pg_dump naces`) and the `UPLOAD_DIR` folder — the slips are the evidence behind every confirmation.

Updating later: `git pull && npm ci && npm run migrate && npm run build && pm2 restart naces`.

## Roadmap

| Stage | Module |
|---|---|
| 1 ✅ | Members, verification, roles, finance (payment types, billing, slips, confirmation, balances) |
| 2 | Announcements & News |
| 3 | Elections — positions, contestants, voting window, eligibility set per election by the committee, auto-declared winners |
| 4 | Library (documents, constitution, minutes, photos) |
| 5 | Board Meetings — LiveKit Cloud: camera, mic, raise hand, chat, screen share, scheduled meetings |
| 6 | Shop — items, orders, pay-by-slip using the same confirmation flow |
| 7 | Savings scheme — fixed cycle, monthly contributions, everyone's savings unlock on the cycle end date, withdrawal requests approved by Fin Sec |
| 8 | Notifications (email/WhatsApp), profile & password reset, exports (PDF statements, Excel) |

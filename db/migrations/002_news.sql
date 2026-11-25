-- NACES Alumni App — Stage 2: Announcements & News

-- New role: Publicity Secretary (PRO) can publish announcements and news
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('member','fin_sec','publicity','admin'));

CREATE TABLE posts (
  id            SERIAL PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('announcement','news')),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  cover_path    TEXT,
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  pinned        BOOLEAN NOT NULL DEFAULT false,
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at  TIMESTAMPTZ,
  expires_at    DATE,            -- announcements can drop off the feed after this date
  author_id     INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX posts_feed ON posts(status, kind, published_at DESC);

-- Who has opened which post (for "New" badges and unread counts)
CREATE TABLE post_reads (
  post_id   INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_comments (
  id          SERIAL PRIMARY KEY,
  post_id     INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post ON post_comments(post_id, created_at);

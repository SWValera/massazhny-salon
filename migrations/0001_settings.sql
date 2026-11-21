CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires);
CREATE TABLE login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL);
INSERT INTO settings (id,data,version,updated_at) VALUES (1, '{"phone": "+77051310339", "city": "Алматы", "street": "Маркова, 28", "latitude": 43.230853, "longitude": 76.929838, "twoGisId": "9430047374996996", "prices": {"klassicheskiy": 5000, "sportivnyy": 5000, "lechebnyy": 5000, "antitsellyulitnyy": 5000, "limfodrenazhnyy": 5000, "obshchiy": 5000, "po-zonam": 5000, "shugaring": 2000}}', 1, unixepoch());

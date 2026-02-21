var Database = require('better-sqlite3');
var db = new Database('./data/tote-sonar.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

var tote = db.prepare('SELECT id FROM totes WHERE name = ?').get('SORT_TEST_F26');
console.log('Tote:', tote);

if (tote) {
  var toteId = tote.id;

  var insert = db.prepare('INSERT INTO items (tote_id, name, description, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');

  insert.run(toteId, 'Delta Widget', 'Fourth alphabetically', 2, '2026-02-20 19:00:00', '2026-02-20 19:00:00');
  insert.run(toteId, 'Alpha Gadget', 'First alphabetically', 10, '2026-02-20 19:01:00', '2026-02-20 19:01:00');
  insert.run(toteId, 'Charlie Tool', 'Third alphabetically', 1, '2026-02-20 19:02:00', '2026-02-20 19:02:00');
  insert.run(toteId, 'Bravo Part', 'Second alphabetically', 5, '2026-02-20 19:03:00', '2026-02-20 19:03:00');

  console.log('Inserted 4 items');

  var items = db.prepare('SELECT id, name, quantity, created_at FROM items WHERE tote_id = ? ORDER BY id').all(toteId);
  console.log('Items:', JSON.stringify(items, null, 2));
}
db.close();

const pg = require('pg');
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DIRECT_URL/DATABASE_URL environment variable');
  process.exit(1);
}
const client = new pg.Client(connectionString);
client.connect().then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")).then(res => {
  console.log(res.rows.map(r => r.table_name).join(', '));
  client.end();
}).catch(console.error);

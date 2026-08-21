const pg = require('pg');
const client = new pg.Client('postgresql://postgres:zezolms1382026@169.58.172.222:5432/upgrade');
client.connect().then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")).then(res => {
  console.log(res.rows.map(r => r.table_name).join(', '));
  client.end();
}).catch(console.error);

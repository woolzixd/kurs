const db = require('./database.js');
const count = db.prepare('SELECT COUNT(*) as c FROM cars').get();
console.log('БД создана, машин:', count.c);
process.exit(0);
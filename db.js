// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'Calificaciones',
    port: 3306, // puerto utilizado en mySQL
});

// const promisePool = pool.promise();

module.exports = pool;
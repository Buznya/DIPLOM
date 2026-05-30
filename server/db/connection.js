require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'cfif31.ru',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'ISPr25-24_RazeevDV',
  password: process.env.DB_PASSWORD || 'ISPr25-24_RazeevDV',
  database: process.env.DB_NAME || 'ISPr25-24_RazeevDV_kurshach44',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;

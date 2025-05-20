"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = void 0;
var pg_1 = require("pg");
var pool = new pg_1.Pool({
    user: 'postgres',
    password: '1234',
    host: 'localhost',
    port: 5432,
    database: 'BINGO'
});
function query(text) {
    return pool.query(text);
}
exports.query = query;
;

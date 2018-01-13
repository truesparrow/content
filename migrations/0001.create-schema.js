exports.up = (knex, Promise) => knex.schema.raw(
    'CREATE SCHEMA content'
);

exports.down = (knex, Promise) => knex.schema.raw(
    'DROP SCHEMA IF EXISTS content'
);

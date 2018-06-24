exports.up = (knex, Promise) => knex.schema.raw(`
    DELETE FROM content.event_subdomains;
    DELETE FROM content.event_events;
    DELETE FROM content.events;
`);

exports.down = (knex, Promise) => knex.schema.raw(`
`);

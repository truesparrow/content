exports.up = (knex, Promise) => knex.schema.raw(`
    ALTER TABLE content.events
    ADD COLUMN IF NOT EXISTS ui_state Jsonb NULL;

    UPDATE content.events
    SET ui_state = '{"showSetupWizard": false}';

    ALTER TABLE content.events
    ALTER COLUMN ui_state SET NOT NULL;
`);

exports.down = (knex, Promise) => knex.schema.raw(`
    ALTER TABLE content.events
    DROP COLUMN IF EXISTS ui_state;
`);

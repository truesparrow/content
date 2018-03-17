module.exports = {
    client: 'pg',
    connection: process.env.COMMON_DATABASE_URL,
    pool: {
        min: 2,
        max: 10
    },
    migrations: {
        directory: process.env.COMMON_DATABASE_MIGRATIONS_DIR,
        tableName: process.env.COMMON_DATABASE_MIGRATIONS_TABLE
    }
}

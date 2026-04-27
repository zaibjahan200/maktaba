const { initialBooks, initialCategories } = require('../data');

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      language TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      is_available BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS issuances (
      id SERIAL PRIMARY KEY,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      student_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      roll_no TEXT NOT NULL,
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      returned_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const categoryCount = await pool.query('SELECT COUNT(*)::int AS count FROM categories');
  if (categoryCount.rows[0].count === 0) {
    for (const category of initialCategories) {
      await pool.query('INSERT INTO categories (type, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [category.type, category.name]);
    }
  }

  const bookCount = await pool.query('SELECT COUNT(*)::int AS count FROM books');
  if (bookCount.rows[0].count === 0) {
    for (const book of initialBooks) {
      await pool.query(
        'INSERT INTO books (title, author, language, subcategory, is_available) VALUES ($1, $2, $3, $4, TRUE)',
        [book.title, book.author || '', book.language, book.subcategory]
      );
    }
  }
}

module.exports = {
  ensureSchema
};
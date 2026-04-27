const express = require('express');
const cors = require('cors');
const { pool } = require('./db/pool');
const { ensureSchema } = require('./db/schema');
const { createMemoryStore } = require('./store');

const app = express();
let store = null;

app.use(cors());
app.use(express.json());

function toDashboardBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    language: row.language,
    subcategory: row.subcategory,
    isAvailable: row.is_available,
    studentName: row.student_name || '',
    className: row.class_name || '',
    rollNo: row.roll_no || '',
    issueDate: row.issue_date || '',
    dueDate: row.due_date || '',
    returnedAt: row.returned_at || null
  };
}

app.get('/api/health', async (_req, res) => {
  try {
    const health = await store.health();
    res.json(health);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/dashboard', async (_req, res) => {
  const dashboard = await store.getDashboard();
  res.json(dashboard);
});

app.get('/api/books', async (_req, res) => {
  const result = await store.getBooks();
  res.json(result.map((row) => row));
});

app.post('/api/books', async (req, res) => {
  const { title, author = '', language, subcategory } = req.body;
  if (!title || !language || !subcategory) {
    return res.status(400).json({ error: 'Title, language, and subcategory are required.' });
  }

  const result = await store.createBook({ title, author, language, subcategory });
  res.status(201).json(result);
});

app.get('/api/categories', async (_req, res) => {
  const result = await store.getCategories();
  res.json(result);
});

app.post('/api/categories', async (req, res) => {
  const { type, name } = req.body;
  if (!type || !name) {
    return res.status(400).json({ error: 'Type and name are required.' });
  }

  const result = await store.createCategory({ type, name });
  res.status(201).json(result);
});

app.get('/api/issuances', async (_req, res) => {
  const result = await store.getIssuances();
  res.json(result);
});

app.post('/api/issuances', async (req, res) => {
  const { bookId, studentName, className, rollNo, issueDate, dueDate } = req.body;
  if (!bookId || !studentName || !className || !rollNo || !issueDate || !dueDate) {
    return res.status(400).json({ error: 'All issue fields are required.' });
  }

  try {
    const issuanceResult = await store.createIssuance({ bookId, studentName, className, rollNo, issueDate, dueDate });
    res.status(201).json(issuanceResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/returns/:id', async (req, res) => {
  try {
    const result = await store.returnIssuance(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

async function prepare() {
  try {
    await ensureSchema(pool);
    store = {
      mode: 'postgres',
      async health() {
        const result = await pool.query('SELECT 1 AS ok');
        return { ok: true, database: 'connected', mode: 'postgres', value: result.rows[0].ok };
      },
      async getDashboard() {
        const booksResult = await pool.query(`
          SELECT
            b.id,
            b.title,
            b.author,
            b.language,
            b.subcategory,
            b.is_available,
            i.student_name,
            i.class_name,
            i.roll_no,
            i.issue_date,
            i.due_date,
            i.returned_at
          FROM books b
          LEFT JOIN LATERAL (
            SELECT * FROM issuances i
            WHERE i.book_id = b.id
              AND i.returned_at IS NULL
            ORDER BY i.created_at DESC
            LIMIT 1
          ) i ON TRUE
          ORDER BY b.created_at DESC, b.id DESC
        `);

        const categoriesResult = await pool.query('SELECT id, type, name, created_at FROM categories ORDER BY type, name');

        return {
          books: booksResult.rows.map(toDashboardBook),
          categories: categoriesResult.rows
        };
      },
      async getBooks() {
        const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC, id DESC');
        return result.rows;
      },
      async createBook(input) {
        const result = await pool.query(
          'INSERT INTO books (title, author, language, subcategory, is_available) VALUES ($1, $2, $3, $4, TRUE) RETURNING *',
          [input.title, input.author || '', input.language, input.subcategory]
        );
        return result.rows[0];
      },
      async getCategories() {
        const result = await pool.query('SELECT * FROM categories ORDER BY type, name');
        return result.rows;
      },
      async createCategory(input) {
        const result = await pool.query(
          'INSERT INTO categories (type, name) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type RETURNING *',
          [input.type, input.name]
        );
        return result.rows[0];
      },
      async getIssuances() {
        const result = await pool.query(`
          SELECT i.*, b.title, b.language, b.subcategory
          FROM issuances i
          JOIN books b ON b.id = i.book_id
          ORDER BY i.created_at DESC, i.id DESC
        `);
        return result.rows;
      },
      async createIssuance(input) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const bookResult = await client.query('SELECT * FROM books WHERE id = $1 FOR UPDATE', [input.bookId]);
          if (bookResult.rows.length === 0) {
            throw new Error('Book not found.');
          }

          if (!bookResult.rows[0].is_available) {
            throw new Error('Book is already issued.');
          }

          const issuanceResult = await client.query(
            `INSERT INTO issuances (book_id, student_name, class_name, roll_no, issue_date, due_date)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [input.bookId, input.studentName, input.className, input.rollNo, input.issueDate, input.dueDate]
          );

          await client.query('UPDATE books SET is_available = FALSE WHERE id = $1', [input.bookId]);
          await client.query('COMMIT');
          return issuanceResult.rows[0];
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
      async returnIssuance(issuanceId) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const issuanceResult = await client.query('SELECT * FROM issuances WHERE id = $1 FOR UPDATE', [issuanceId]);
          if (issuanceResult.rows.length === 0) {
            throw new Error('Issuance not found.');
          }

          await client.query('UPDATE issuances SET returned_at = NOW() WHERE id = $1', [issuanceId]);
          await client.query('UPDATE books SET is_available = TRUE WHERE id = $1', [issuanceResult.rows[0].book_id]);
          await client.query('COMMIT');
          return { ok: true };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
    };
    return;
  } catch (error) {
    store = createMemoryStore();
    console.warn('Postgres unavailable, using in-memory fallback for local development:', error.message);
  }
}

module.exports = {
  app,
  prepare
};
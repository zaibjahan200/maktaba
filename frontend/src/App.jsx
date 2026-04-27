import { Fragment, useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const defaultBooks = [];

const categoryDefaults = {
  languages: ['English', 'Urdu'],
  subcategories: ['Story', 'Self-help', 'Islamic', 'Educational']
};

const navigationItems = ['All Books', 'Issued Books', 'Available Books'];

function formatDate(value) {
  if (!value) return '—';
  return DATE_FORMAT.format(new Date(value));
}

function getLoanProgress(issueDate, dueDate) {
  if (!issueDate || !dueDate) {
    return { ratio: 0, label: 'Unknown', color: 'gray' };
  }

  const start = new Date(issueDate).getTime();
  const end = new Date(dueDate).getTime();
  const now = Date.now();

  if (now >= end) {
    return { ratio: 100, label: 'Overdue', color: 'red' };
  }

  const total = Math.max(end - start, 1);
  const elapsed = Math.max(now - start, 0);
  const ratio = Math.min((elapsed / total) * 100, 99.9);

  if (ratio < 33.34) return { ratio, label: 'Green', color: 'green' };
  if (ratio < 66.67) return { ratio, label: 'Yellow', color: 'yellow' };
  return { ratio, label: 'Orange', color: 'orange' };
}

function getUrgentDaysLeft(dueDate) {
  if (!dueDate) return null;

  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function App() {
  const [books, setBooks] = useState(defaultBooks);
  const [categories, setCategories] = useState([]);
  const [view, setView] = useState('Issued Books');
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('All');
  const [subcategoryFilter, setSubcategoryFilter] = useState('All');
  const [showReminder, setShowReminder] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeForm, setActiveForm] = useState('issue');
  const [bookForm, setBookForm] = useState({ title: '', author: '', language: 'English', subcategory: 'Story' });
  const [categoryForm, setCategoryForm] = useState({ type: 'language', name: '' });
  const [issueForm, setIssueForm] = useState({ bookId: '', studentName: '', className: '', rollNo: '', issueDate: '', dueDate: '' });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const response = await fetch(`${API_BASE}/dashboard`);
      const data = await response.json();
      setBooks(data.books || []);
      setCategories(data.categories || []);

      if (!issueForm.bookId && data.books && data.books.length > 0) {
        setIssueForm((current) => ({ ...current, bookId: String(data.books.find((book) => book.isAvailable)?.id || data.books[0].id) }));
      }
    } catch (error) {
      setMessage(`Database connection unavailable. Showing empty dashboard. ${error.message}`);
      setBooks([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  const languages = useMemo(() => {
    const values = categories.filter((item) => item.type === 'language').map((item) => item.name);
    return ['All', ...new Set([...categoryDefaults.languages, ...values])];
  }, [categories]);

  const subcategories = useMemo(() => {
    const values = categories.filter((item) => item.type === 'subcategory').map((item) => item.name);
    return ['All', ...new Set([...categoryDefaults.subcategories, ...values])];
  }, [categories]);

  const availableBooks = useMemo(() => books.filter((book) => book.isAvailable), [books]);
  const issuedBooks = useMemo(() => books.filter((book) => !book.isAvailable), [books]);
  const urgentBooks = useMemo(() => {
    return issuedBooks
      .map((book) => ({ ...book, daysLeft: getUrgentDaysLeft(book.dueDate) }))
      .filter((book) => book.daysLeft !== null && book.daysLeft <= 2);
  }, [issuedBooks]);

  const filteredBooks = useMemo(() => {
    const source = view === 'Available Books' ? availableBooks : view === 'Issued Books' ? issuedBooks : books;
    const query = search.trim().toLowerCase();

    return source.filter((book) => {
      const matchesQuery = !query || [book.title, book.studentName, book.className, book.rollNo].join(' ').toLowerCase().includes(query);
      const matchesLanguage = languageFilter === 'All' || book.language === languageFilter;
      const matchesSubcategory = subcategoryFilter === 'All' || book.subcategory === subcategoryFilter;
      return matchesQuery && matchesLanguage && matchesSubcategory;
    });
  }, [availableBooks, books, issuedBooks, languageFilter, search, subcategoryFilter, view]);

  async function submitBook(event) {
    event.preventDefault();
    const response = await fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookForm)
    });

    if (response.ok) {
      setMessage('Book added successfully.');
      setBookForm({ title: '', author: '', language: 'English', subcategory: 'Story' });
      loadDashboard();
    } else {
      const error = await response.json();
      setMessage(error.error || 'Could not add book.');
    }
  }

  async function submitCategory(event) {
    event.preventDefault();
    const response = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryForm)
    });

    if (response.ok) {
      setMessage('Category added successfully.');
      setCategoryForm({ type: 'language', name: '' });
      loadDashboard();
    } else {
      const error = await response.json();
      setMessage(error.error || 'Could not add category.');
    }
  }

  async function submitIssue(event) {
    event.preventDefault();
    const response = await fetch(`${API_BASE}/issuances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...issueForm, bookId: Number(issueForm.bookId) })
    });

    if (response.ok) {
      setMessage('Book issued successfully.');
      setIssueForm((current) => ({ ...current, studentName: '', className: '', rollNo: '', issueDate: '', dueDate: '' }));
      loadDashboard();
    } else {
      const error = await response.json();
      setMessage(error.error || 'Could not issue book.');
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">School Library</p>
          <h1>Management System</h1>
        </div>

        <nav className="nav-list">
          {navigationItems.map((item) => (
            <button key={item} className={`nav-item ${view === item ? 'active' : ''}`} onClick={() => setView(item)} type="button">
              {item}
            </button>
          ))}
        </nav>

        <div className="filter-group">
          <p className="section-label">Language</p>
          <div className="chip-grid">
            {languages.map((item) => (
              <button key={item} className={`chip ${languageFilter === item ? 'active' : ''}`} onClick={() => setLanguageFilter(item)} type="button">
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <p className="section-label">Sub-categories</p>
          <div className="chip-grid">
            {subcategories.map((item) => (
              <button key={item} className={`chip ${subcategoryFilter === item ? 'active' : ''}`} onClick={() => setSubcategoryFilter(item)} type="button">
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="quick-actions">
          <button type="button" className="primary action-button" onClick={() => setActiveForm('book')}>+ Add New Book</button>
          <button type="button" className="primary action-button" onClick={() => setActiveForm('category')}>+ Add Category</button>
          <button type="button" className="primary action-button" onClick={() => setActiveForm('issue')}>+ Issue Book</button>
        </div>
      </aside>

      <main className="content">
        <header className="hero">
          <div>
            <p className="eyebrow">Responsive Dashboard</p>
            <h2>Library flow built for issuing, tracking, and reminders</h2>
          </div>
          <label className="search-box">
            <span>Search Book, Student, or Roll No</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search books, students, classes" />
          </label>
        </header>

        {message ? <div className="status-banner">{message}</div> : null}

        {showReminder && urgentBooks.length > 0 ? (
          <section className="reminder-panel">
            <div className="panel-head">
              <div>
                <p className="section-label">Notifications</p>
                <h3>Urgent reminders</h3>
              </div>
              <button type="button" className="ghost" onClick={() => setShowReminder(false)}>Close</button>
            </div>
            <div className="reminder-list">
              {urgentBooks.map((book) => (
                <article key={book.id} className="reminder-item">
                  <strong>{book.studentName}</strong>
                  <span>{book.className}</span>
                  <span>{book.title}</span>
                  <span>{Math.max(book.daysLeft, 0)} days left</span>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="stats-row">
          <div className="stat-card"><span>Total Books</span><strong>{books.length}</strong></div>
          <div className="stat-card"><span>Issued Books</span><strong>{issuedBooks.length}</strong></div>
          <div className="stat-card"><span>Available Books</span><strong>{availableBooks.length}</strong></div>
          <div className="stat-card"><span>Urgent</span><strong>{urgentBooks.length}</strong></div>
        </section>

        <section className="forms-panel">
          <div className="tabs">
            {['issue', 'book', 'category'].map((tab) => (
              <button key={tab} type="button" className={activeForm === tab ? 'tab active' : 'tab'} onClick={() => setActiveForm(tab)}>
                {tab === 'issue' ? 'Issue Book' : tab === 'book' ? 'Add Book' : 'Add Category'}
              </button>
            ))}
          </div>

          {activeForm === 'issue' ? (
            <form className="form-grid" onSubmit={submitIssue}>
              <label>
                Book
                <select value={issueForm.bookId} onChange={(event) => setIssueForm((current) => ({ ...current, bookId: event.target.value }))}>
                  <option value="">Select a book</option>
                  {availableBooks.map((book) => (
                    <option key={book.id} value={book.id}>{book.title}</option>
                  ))}
                </select>
              </label>
              <label>
                Student Name
                <input value={issueForm.studentName} onChange={(event) => setIssueForm((current) => ({ ...current, studentName: event.target.value }))} />
              </label>
              <label>
                Class
                <input value={issueForm.className} onChange={(event) => setIssueForm((current) => ({ ...current, className: event.target.value }))} placeholder="1-A" />
              </label>
              <label>
                Roll No
                <input value={issueForm.rollNo} onChange={(event) => setIssueForm((current) => ({ ...current, rollNo: event.target.value }))} />
              </label>
              <label>
                Issue Date
                <input type="date" value={issueForm.issueDate} onChange={(event) => setIssueForm((current) => ({ ...current, issueDate: event.target.value }))} />
              </label>
              <label>
                Due Date
                <input type="date" value={issueForm.dueDate} onChange={(event) => setIssueForm((current) => ({ ...current, dueDate: event.target.value }))} />
              </label>
              <button type="submit" className="primary submit-button">Issue Book</button>
            </form>
          ) : null}

          {activeForm === 'book' ? (
            <form className="form-grid" onSubmit={submitBook}>
              <label>
                Title
                <input value={bookForm.title} onChange={(event) => setBookForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                Author
                <input value={bookForm.author} onChange={(event) => setBookForm((current) => ({ ...current, author: event.target.value }))} />
              </label>
              <label>
                Language
                <select value={bookForm.language} onChange={(event) => setBookForm((current) => ({ ...current, language: event.target.value }))}>
                  {languages.filter((item) => item !== 'All').map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                Sub-category
                <select value={bookForm.subcategory} onChange={(event) => setBookForm((current) => ({ ...current, subcategory: event.target.value }))}>
                  {subcategories.filter((item) => item !== 'All').map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <button type="submit" className="primary submit-button">Save Book</button>
            </form>
          ) : null}

          {activeForm === 'category' ? (
            <form className="form-grid" onSubmit={submitCategory}>
              <label>
                Type
                <select value={categoryForm.type} onChange={(event) => setCategoryForm((current) => ({ ...current, type: event.target.value }))}>
                  <option value="language">Language</option>
                  <option value="subcategory">Sub-category</option>
                </select>
              </label>
              <label>
                Name
                <input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <button type="submit" className="primary submit-button">Save Category</button>
            </form>
          ) : null}
        </section>

        <section className="table-card">
          <div className="table-head">
            <div>
              <p className="section-label">Active Issued Books</p>
              <h3>{loading ? 'Loading data...' : `${filteredBooks.length} records shown`}</h3>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => {
                  const progress = getLoanProgress(book.issueDate, book.dueDate);
                  return (
                    <Fragment key={book.id}>
                      <tr key={`${book.id}-row`} className="book-row">
                        <td>
                          <div className="book-title-cell">
                            <strong>{book.title}</strong>
                            <span>{book.language} · {book.subcategory}</span>
                          </div>
                        </td>
                        <td>{book.studentName || '—'}</td>
                        <td>{book.className || '—'}</td>
                        <td>{formatDate(book.issueDate)}</td>
                        <td>{formatDate(book.dueDate)}</td>
                      </tr>
                      <tr key={`${book.id}-bar`} className="progress-row">
                        <td colSpan="5">
                          <div className={`progress-track ${progress.color}`}>
                            <div className="progress-fill" style={{ width: `${progress.ratio}%` }} />
                          </div>
                          <div className="progress-label">Progress Bar: {progress.label}</div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
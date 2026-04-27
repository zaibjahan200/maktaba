const { initialBooks, initialCategories } = require('./data');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createMemoryStore() {
  const books = initialBooks.map((book, index) => ({
    id: index + 1,
    title: book.title,
    author: book.author || '',
    language: book.language,
    subcategory: book.subcategory,
    is_available: true,
    created_at: new Date().toISOString()
  }));

  const categories = initialCategories.map((category, index) => ({
    id: index + 1,
    type: category.type,
    name: category.name,
    created_at: new Date().toISOString()
  }));

  const issuances = [];
  let bookId = books.length + 1;
  let categoryId = categories.length + 1;
  let issuanceId = 1;

  function getBook(bookIdValue) {
    return books.find((item) => item.id === Number(bookIdValue));
  }

  return {
    mode: 'memory',
    async health() {
      return { ok: true, database: 'memory' };
    },
    async getDashboard() {
      return {
        books: clone(
          books.map((book) => {
            const issuance = issuances.find((item) => item.book_id === book.id && !item.returned_at) || null;
            return {
              id: book.id,
              title: book.title,
              author: book.author,
              language: book.language,
              subcategory: book.subcategory,
              isAvailable: book.is_available,
              studentName: issuance ? issuance.student_name : '',
              className: issuance ? issuance.class_name : '',
              rollNo: issuance ? issuance.roll_no : '',
              issueDate: issuance ? issuance.issue_date : '',
              dueDate: issuance ? issuance.due_date : '',
              returnedAt: issuance ? issuance.returned_at || null : null
            };
          })
        ),
        categories: clone(categories)
      };
    },
    async getBooks() {
      return clone(books);
    },
    async createBook(input) {
      const record = {
        id: bookId++,
        title: input.title,
        author: input.author || '',
        language: input.language,
        subcategory: input.subcategory,
        is_available: true,
        created_at: new Date().toISOString()
      };
      books.unshift(record);
      return clone(record);
    },
    async getCategories() {
      return clone(categories);
    },
    async createCategory(input) {
      const existing = categories.find((item) => item.name === input.name);
      if (existing) {
        existing.type = input.type;
        return clone(existing);
      }

      const record = {
        id: categoryId++,
        type: input.type,
        name: input.name,
        created_at: new Date().toISOString()
      };

      categories.push(record);
      return clone(record);
    },
    async getIssuances() {
      return clone(
        issuances.map((issuance) => ({
          ...issuance,
          title: getBook(issuance.book_id)?.title || '',
          language: getBook(issuance.book_id)?.language || '',
          subcategory: getBook(issuance.book_id)?.subcategory || ''
        }))
      );
    },
    async createIssuance(input) {
      const book = getBook(input.bookId);
      if (!book) {
        throw new Error('Book not found.');
      }

      if (!book.is_available) {
        throw new Error('Book is already issued.');
      }

      const record = {
        id: issuanceId++,
        book_id: book.id,
        student_name: input.studentName,
        class_name: input.className,
        roll_no: input.rollNo,
        issue_date: input.issueDate,
        due_date: input.dueDate,
        returned_at: null,
        created_at: new Date().toISOString()
      };

      book.is_available = false;
      issuances.unshift(record);
      return clone(record);
    },
    async returnIssuance(issuanceIdValue) {
      const issuance = issuances.find((item) => item.id === Number(issuanceIdValue));
      if (!issuance) {
        throw new Error('Issuance not found.');
      }

      issuance.returned_at = new Date().toISOString();
      const book = getBook(issuance.book_id);
      if (book) {
        book.is_available = true;
      }

      return { ok: true };
    }
  };
}

module.exports = {
  createMemoryStore
};
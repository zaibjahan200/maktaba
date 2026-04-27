const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { app, prepare } = require('./app');

const port = process.env.PORT || 3001;

prepare()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize backend:', error);
    process.exit(1);
  });
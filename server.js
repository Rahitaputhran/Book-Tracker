    // server.js
    // This file sets up the Node.js Express server and handles API requests
    // for managing your book list and proxying Google Books API searches.

    // --- Load environment variables from .env file ---
    // This line should be at the very top of your file to ensure variables are loaded before use.
    require('dotenv').config();

    const express = require('express');
    const cors = require('cors');
    const sqlite3 = require('sqlite3').verbose(); // Use verbose for detailed logs
    const path = require('path');
    const fetch = require('node-fetch'); // For making HTTP requests to external APIs

    const app = express();
    const PORT = 3001; // Using port 3001 for the backend to avoid conflict with React's default 3000

    // --- Middleware ---
    app.use(cors()); // Enable CORS for all origins (important for frontend-backend communication)
    app.use(express.json()); // Enable parsing of JSON request bodies

    // --- Database Setup (SQLite) ---
    // Initialize the database connection. The database file will be created if it doesn't exist.
    const dbPath = path.resolve(__dirname, 'books.db');
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error connecting to database:', err.message);
        } else {
            console.log('Connected to the SQLite database.');
            // Create the 'books' table if it doesn't already exist
            db.run(`CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT,
                status TEXT NOT NULL, -- e.g., 'Want to Read', 'Reading', 'Finished'
                notes TEXT,
                coverImageUrl TEXT
            )`, (createErr) => {
                if (createErr) {
                    console.error('Error creating books table:', createErr.message);
                } else {
                    console.log('Books table ensured.');
                }
            });
        }
    });

    // --- Google Books API Configuration ---
    // IMPORTANT: Get your API key from Google Cloud Console (enable Google Books API).
    // It's loaded from the .env file using process.env.
    const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

    // Optional: Add a warning if the API key is not set.
    if (!GOOGLE_BOOKS_API_KEY) {
        console.warn('WARNING: GOOGLE_BOOKS_API_KEY is not set in your .env file. Google Books search functionality will not work.');
    }

    // --- API Endpoints ---

    // GET /books - Retrieve all books, with optional status filter
    app.get('/books', (req, res) => {
        const statusFilter = req.query.status; // Get status from query parameter (e.g., /books?status=Reading)
        let sql = 'SELECT * FROM books';
        const params = [];

        if (statusFilter) {
            sql += ' WHERE status = ?';
            params.push(statusFilter);
        }

        db.all(sql, params, (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    });

    // POST /books - Add a new book
    app.post('/books', (req, res) => {
        const { title, author, status, notes, coverImageUrl } = req.body;

        // Basic validation
        if (!title || !status) {
            return res.status(400).json({ error: 'Title and Status are required.' });
        }

        db.run(`INSERT INTO books (title, author, status, notes, coverImageUrl) VALUES (?, ?, ?, ?, ?)`,
            [title, author, status, notes, coverImageUrl],
            function (err) { // Use function keyword to access 'this' for lastID
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                // Return the newly created book with its assigned ID
                res.status(201).json({ id: this.lastID, title, author, status, notes, coverImageUrl });
            }
        );
    });

    // PUT /books/:id - Update an existing book
    app.put('/books/:id', (req, res) => {
        const { id } = req.params;
        const { title, author, status, notes, coverImageUrl } = req.body;

        // Build the SET clause dynamically for partial updates
        const updates = [];
        const params = [];

        if (title !== undefined) { updates.push('title = ?'); params.push(title); }
        if (author !== undefined) { updates.push('author = ?'); params.push(author); }
        if (status !== undefined) { updates.push('status = ?'); params.push(status); }
        if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
        if (coverImageUrl !== undefined) { updates.push('coverImageUrl = ?'); params.push(coverImageUrl); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields provided for update.' });
        }

        params.push(id); // Add the ID for the WHERE clause
        const sql = `UPDATE books SET ${updates.join(', ')} WHERE id = ?`;

        db.run(sql, params, function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ message: 'Book not found.' });
            } else {
                res.json({ message: 'Book updated successfully.', id });
            }
        });
    });

    // DELETE /books/:id - Delete a book
    app.delete('/books/:id', (req, res) => {
        const { id } = req.params;

        db.run(`DELETE FROM books WHERE id = ?`, id, function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ message: 'Book not found.' });
            } else {
                res.json({ message: 'Book deleted successfully.', id });
            }
        });
    });

    // GET /search-books - Proxy for Google Books API search
    // This endpoint protects your API key by making the call from the backend.
    app.get('/search-books', async (req, res) => {
        const query = req.query.q; // Get search query from parameter (e.g., /search-books?q=harry+potter)
        if (!query) {
            return res.status(400).json({ error: 'Search query (q) is required.' });
        }

        // Check if API key is configured
        if (!GOOGLE_BOOKS_API_KEY) {
            console.error('ERROR: Google Books API key is not configured in .env file.');
            return res.status(500).json({ error: 'Google Books API key is not configured on the server. Please check backend setup.' });
        }

        const googleBooksApiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${GOOGLE_BOOKS_API_KEY}&maxResults=5`;

        try {
            const response = await fetch(googleBooksApiUrl);
            if (!response.ok) {
                // Log the full response for debugging external API errors
                const errorText = await response.text();
                console.error(`Google Books API returned error ${response.status}: ${errorText}`);
                // Provide a more specific error message to the frontend if possible
                return res.status(response.status).json({ error: `Google Books API error: ${response.statusText}. Check server console for details.` });
            }
            const data = await response.json();

            // Extract relevant information from Google Books API response
            const books = data.items ? data.items.map(item => ({
                title: item.volumeInfo.title || 'N/A',
                author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'N/A',
                // Prefer large or medium thumbnail if available, otherwise use thumbnail
                coverImageUrl: item.volumeInfo.imageLinks ? (item.volumeInfo.imageLinks.thumbnail || item.volumeInfo.imageLinks.smallThumbnail) : null,
                description: item.volumeInfo.description || 'No description available.'
            })) : [];

            res.json(books);
        } catch (error) {
            console.error('Error proxying Google Books API:', error.message);
            res.status(500).json({ error: 'Failed to search books from external API. Check server console for details.' });
        }
    });


    // --- Start the Server ---
    app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
        console.log(`Database file: ${dbPath}`);
    });

    // --- Graceful Shutdown ---
    // This ensures the database connection is closed when the Node.js process exits
    // (e.g., when you press Ctrl+C in the terminal).
    process.on('SIGINT', () => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            }
            console.log('Database connection closed. Exiting process.');
            process.exit(0);
        });
    });
    
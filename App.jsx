    // src/App.jsx
    // This is the main React component for your Personal Reading List / Book Tracker.
    // It handles state, fetches data from the backend, and renders the UI.

    import React, { useState, useEffect } from 'react'; // Ensure React is imported

    // Define the backend URL
    const API_BASE_URL = 'http://localhost:3001';

    // Main App Component
    const App = () => {
        // State to hold all books fetched from the backend
        const [books, setBooks] = useState([]);
        // State to manage the current view: 'list' or 'add'
        const [view, setView] = useState('list');
        // State for form inputs when adding/editing a book
        const [newBookTitle, setNewBookTitle] = useState('');
        const [newBookAuthor, setNewBookAuthor] = useState('');
        const [newBookStatus, setNewBookStatus] = useState('Want to Read');
        const [newBookNotes, setNewBookNotes] = useState('');
        const [newBookCoverImageUrl, setNewBookCoverImageUrl] = useState('');
        // State for Google Books API search results
        const [searchResults, setSearchResults] = useState([]);
        const [searchQuery, setSearchQuery] = useState('');
        // State for loading indicators and error messages
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState(null);
        const [message, setMessage] = useState(null); // For success messages

        // --- Helper for displaying messages ---
        const showMessage = (msg, isError = false) => {
            setMessage({ text: msg, isError });
            setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
        };

        // --- Fetch Books from Backend ---
        const fetchBooks = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/books`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setBooks(data);
            } catch (err) {
                console.error("Error fetching books:", err);
                setError("Failed to load books. Please ensure the backend server is running.");
            } finally {
                setLoading(false);
            }
        };

        // Fetch books on component mount
        useEffect(() => {
            fetchBooks();
        }, []); // Empty dependency array means this runs once on mount

        // --- Google Books API Search ---
        const handleSearchBooks = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                // Call the backend proxy endpoint for Google Books API
                const response = await fetch(`${API_BASE_URL}/search-books?q=${encodeURIComponent(searchQuery)}`);
                if (!response.ok) {
                    const errorData = await response.json(); // Attempt to parse error message from backend
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setSearchResults(data);
            } catch (err) {
                console.error("Error searching books:", err);
                setError(`Failed to search books: ${err.message}. Please check your network or backend configuration.`);
            } finally {
                setLoading(false);
            }
        };

        // --- Add Book Functionality ---
        const handleAddBook = async (e) => {
            e.preventDefault(); // Prevent default form submission
            setLoading(true);
            setError(null);

            const bookData = {
                title: newBookTitle,
                author: newBookAuthor,
                status: newBookStatus,
                notes: newBookNotes,
                coverImageUrl: newBookCoverImageUrl
            };

            try {
                const response = await fetch(`${API_BASE_URL}/books`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookData),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                const addedBook = await response.json();
                setBooks([...books, addedBook]); // Add the new book to the state
                showMessage('Book added successfully!', false);

                // Clear form fields
                setNewBookTitle('');
                setNewBookAuthor('');
                setNewBookStatus('Want to Read');
                setNewBookNotes('');
                setNewBookCoverImageUrl('');
                setSearchResults([]); // Clear search results after adding
                setSearchQuery('');
                setView('list'); // Go back to list view
            } catch (err) {
                console.error("Error adding book:", err);
                setError(`Failed to add book: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        // --- Update Book Status/Notes Functionality ---
        const handleUpdateBook = async (id, updates) => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/books/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                // Update the book in the local state
                setBooks(books.map(book =>
                    book.id === id ? { ...book, ...updates } : book
                ));
                showMessage('Book updated successfully!', false);
            } catch (err) {
                console.error("Error updating book:", err);
                setError(`Failed to update book: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        // --- Delete Book Functionality ---
        const handleDeleteBook = async (id) => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/books/${id}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                // Remove the book from the local state
                setBooks(books.filter(book => book.id !== id));
                showMessage('Book deleted successfully!', false);
            } catch (err) {
                console.error("Error deleting book:", err);
                setError(`Failed to delete book: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        // --- Categorize Books ---
        const categorizedBooks = {
            'Want to Read': books.filter(book => book.status === 'Want to Read'),
            'Reading': books.filter(book => book.status === 'Reading'),
            'Finished': books.filter(book => book.status === 'Finished'),
        };

        // --- BookCard Component (Inline for simplicity, could be separate file) ---
        const BookCard = ({ book, onUpdate, onDelete }) => (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                {book.coverImageUrl && (
                    <img
                        src={book.coverImageUrl}
                        alt={`${book.title} cover`}
                        className="w-24 h-32 object-cover rounded-md shadow-md flex-shrink-0"
                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/96x128/e0e0e0/555555?text=No+Cover"; }}
                    />
                )}
                {!book.coverImageUrl && (
                    <div className="w-24 h-32 bg-gray-200 rounded-md shadow-md flex-shrink-0 flex items-center justify-center text-gray-500 text-xs text-center p-2">
                        No Cover
                    </div>
                )}
                <div className="flex-grow text-center sm:text-left">
                    <h3 className="text-lg font-semibold text-gray-800">{book.title}</h3>
                    <p className="text-gray-600 text-sm">by {book.author || 'Unknown Author'}</p>
                    <p className="text-gray-700 text-sm mt-2">{book.notes}</p>
                </div>
                <div className="flex flex-col space-y-2 w-full sm:w-auto">
                    <select
                        value={book.status}
                        onChange={(e) => onUpdate(book.id, { status: e.target.value })}
                        className="block w-full py-1 px-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="Want to Read">Want to Read</option>
                        <option value="Reading">Reading</option>
                        <option value="Finished">Finished</option>
                    </select>
                    <button
                        onClick={() => onDelete(book.id)}
                        className="w-full bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-md transition-colors duration-200 shadow-sm"
                    >
                        Delete
                    </button>
                </div>
            </div>
        );

        // --- Render UI based on 'view' state ---
        return (
            <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl">
                    <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Personal Reading List</h1>

                    {/* Navigation Buttons */}
                    <div className="flex justify-center space-x-4 mb-6">
                        <button
                            onClick={() => setView('list')}
                            className={`py-2 px-5 rounded-lg font-medium transition-all duration-200 ${view === 'list' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            My Books
                        </button>
                        <button
                            onClick={() => setView('add')}
                            className={`py-2 px-5 rounded-lg font-medium transition-all duration-200 ${view === 'add' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Add New Book
                        </button>
                    </div>

                    {/* Global Message/Error Display */}
                    {message && (
                        <div className={`p-3 mb-4 rounded-lg text-center ${message.isError ? 'bg-red-100 text-red-700 border border-red-400' : 'bg-green-100 text-green-700 border border-green-400'}`}>
                            {message.text}
                        </div>
                    )}
                    {error && (
                        <div className="p-3 mb-4 rounded-lg bg-red-100 text-red-700 border border-red-400 text-center">
                            {error}
                        </div>
                    )}
                    {loading && (
                        <div className="flex justify-center items-center mb-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading...</span>
                        </div>
                    )}

                    {/* Add Book Form View */}
                    {view === 'add' && (
                        <div className="bg-gray-50 p-6 rounded-lg shadow-inner border border-gray-200">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Add a New Book</h2>
                            <form onSubmit={handleAddBook} className="space-y-4">
                                <div>
                                    <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">Search Google Books (Optional)</label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            id="searchQuery"
                                            className="flex-grow shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by title or author..."
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSearchBooks}
                                            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
                                        >
                                            Search
                                        </button>
                                    </div>
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto">
                                        <h3 className="text-md font-medium text-gray-700 mb-2">Search Results:</h3>
                                        <div className="space-y-2">
                                            {searchResults.map((result, index) => (
                                                <div key={index} className="flex items-center space-x-3 p-2 bg-white rounded-md shadow-sm border border-gray-200">
                                                    {result.coverImageUrl && (
                                                        <img src={result.coverImageUrl} alt="Cover" className="w-12 h-16 object-cover rounded-sm" />
                                                    )}
                                                    <div className="flex-grow">
                                                        <p className="font-semibold text-gray-800 text-sm">{result.title}</p>
                                                        <p className="text-gray-600 text-xs">by {result.author}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNewBookTitle(result.title);
                                                            setNewBookAuthor(result.author);
                                                            setNewBookCoverImageUrl(result.coverImageUrl);
                                                            setSearchResults([]); // Clear results after selection
                                                            setSearchQuery('');
                                                        }}
                                                        className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-3 rounded-md transition-colors duration-200"
                                                    >
                                                        Use This
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        id="title"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                                        value={newBookTitle}
                                        onChange={(e) => setNewBookTitle(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                                    <input
                                        type="text"
                                        id="author"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                                        value={newBookAuthor}
                                        onChange={(e) => setNewBookAuthor(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
                                    <select
                                        id="status"
                                        className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={newBookStatus}
                                        onChange={(e) => setNewBookStatus(e.target.value)}
                                        required
                                    >
                                        <option value="Want to Read">Want to Read</option>
                                        <option value="Reading">Reading</option>
                                        <option value="Finished">Finished</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        id="notes"
                                        rows="3"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                                        value={newBookNotes}
                                        onChange={(e) => setNewBookNotes(e.target.value)}
                                    ></textarea>
                                </div>
                                <div>
                                    <label htmlFor="coverImageUrl" className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL (Optional)</label>
                                    <input
                                        type="text"
                                        id="coverImageUrl"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                                        value={newBookCoverImageUrl}
                                        onChange={(e) => setNewBookCoverImageUrl(e.target.value)}
                                        placeholder="e.g., https://example.com/cover.jpg"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
                                >
                                    Add Book
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Book List View */}
                    {view === 'list' && (
                        <div className="space-y-8">
                            {Object.keys(categorizedBooks).map(status => (
                                <div key={status}>
                                    <h2 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500">
                                        {status} ({categorizedBooks[status].length})
                                    </h2>
                                    {categorizedBooks[status].length === 0 ? (
                                        <p className="text-gray-500 italic">No books in this category yet.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {categorizedBooks[status].map(book => (
                                                <BookCard
                                                    key={book.id}
                                                    book={book}
                                                    onUpdate={handleUpdateBook}
                                                    onDelete={handleDeleteBook}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    export default App;
    
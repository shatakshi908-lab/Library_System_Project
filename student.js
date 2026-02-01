// ========================================
// SECTION SWITCHER
// ========================================
function showSection(id) {
    const sections = ["books", "issued", "return", "reserve"];
    sections.forEach(sec => {
        document.getElementById(sec).classList.add("hidden");
    });
    document.getElementById(id).classList.remove("hidden");

    if (id === "books") loadAllBooks();
    if (id === "issued") loadIssuedBooks();
    if (id === "return") loadReturnBooks();
    if (id === "reserve") loadReservations();
}

// ========================================
// LOAD ALL BOOKS
// ========================================
let allBooks = [];

function loadAllBooks() {
    fetch("/api/books")
        .then(res => res.json())
        .then(books => {
            allBooks = books;
            displayBooks(books);
        });
}

// ========================================
// DISPLAY BOOK SEARCH RESULTS
// ========================================
function displayBooks(books) {
    const div = document.getElementById("bookList");
    div.innerHTML = "";

    books.forEach(b => {
        const available = b.copies > 0
            ? `<span class='text-green-400'>Available</span>`
            : `<span class='text-red-400'>Unavailable</span>`;

        div.innerHTML += `
            <div class="glass p-4 rounded-xl">
                <h2 class="text-xl font-bold">${b.title}</h2>
                <p class="text-gray-300">Author: ${b.author}</p>
                <p class="text-gray-300">Copies: ${b.copies}</p>
                <p class="text-gray-400">Section: ${b.section || "N/A"}</p>
                <p class="text-gray-400">Shelf: ${b.shelf || "N/A"}</p>
                <p class="mt-1">${available}</p>

                ${
                    b.copies > 0
                    ? `<button onclick="issueBook('${b.id}')" 
                              class="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                           Issue Book
                       </button>`
                    : `<button onclick="reserveBook('${b.id}')"
                              class="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded">
                           Reserve Book
                       </button>`
                }
            </div>
        `;
    });
}

// ========================================
// SEARCH FILTER
// ========================================
function filterBooks() {
    const search = document.getElementById("searchInput").value.toLowerCase();

    const filtered = allBooks.filter(b =>
        b.title.toLowerCase().includes(search) ||
        b.author.toLowerCase().includes(search)
    );

    displayBooks(filtered);
}

// ========================================
// ISSUE BOOK
// ========================================
function issueBook(book_id) {
    fetch("/api/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id })
    })
    .then(res => res.json())
    .then(d => {
        alert(d.msg || d.error);
        loadAllBooks();
        loadIssuedBooks();
        loadReturnBooks();
    });
}

// ========================================
// Convert various Firestore/Python timestamp formats
// ========================================
function convertTimestamp(ts) {
    if (!ts) return "N/A";

    // If Firestore timestamp
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString("en-IN");
    if (ts._seconds) return new Date(ts._seconds * 1000).toLocaleDateString("en-IN");

    // If Firestore returned a string (Python datetime)
    if (typeof ts === "string") {
        const d = new Date(ts);
        if (!isNaN(d)) return d.toLocaleDateString("en-IN");
    }

    return "N/A";
}

// ========================================
// LOAD ISSUED BOOKS
// ========================================
function loadIssuedBooks() {
    fetch("/api/student/issues")
        .then(res => res.json())
        .then(data => {
            const table = document.getElementById("issuedTable");
            table.innerHTML = "";

            data.forEach(item => {
                const issued = convertTimestamp(item.issued_date);
                const due    = convertTimestamp(item.due_date);

                // Fine calculation
                let fine = 0;
                let dueDate = null;

                if (item.due_date?.seconds)
                    dueDate = new Date(item.due_date.seconds * 1000);
                else if (item.due_date?._seconds)
                    dueDate = new Date(item.due_date._seconds * 1000);
                else if (typeof item.due_date === "string")
                    dueDate = new Date(item.due_date);

                if (dueDate instanceof Date && !isNaN(dueDate)) {
                    const today = new Date();
                    const lateDays = Math.floor((today - dueDate) / 86400000);
                    fine = lateDays > 0 ? lateDays * 5 : 0;
                }

                table.innerHTML += `
                    <tr class="border-b border-gray-700">
                        <td class="p-2">${item.book_title}</td>
                        <td class="p-2">${issued}</td>
                        <td class="p-2">${due}</td>
                        <td class="p-2">₹${fine}</td>
                    </tr>
                `;
            });
        });
}

// ========================================
// LOAD RETURNABLE BOOKS
// ========================================
function loadReturnBooks() {
    fetch("/api/student/issues")
        .then(res => res.json())
        .then(data => {
            const table = document.getElementById("returnTable");
            table.innerHTML = "";

            data.filter(i => !i.returned).forEach(item => {
                table.innerHTML += `
                    <tr class="border-b border-gray-700">
                        <td class="p-2">${item.book_title}</td>
                        <td class="p-2">
                            <button onclick="returnBook('${item.id}')"
                                class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
                                Return
                            </button>
                        </td>
                    </tr>
                `;
            });
        });
}

// ========================================
// RETURN BOOK
// ========================================
function returnBook(issue_id) {
    fetch("/api/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue_id })
    })
    .then(res => res.json())
    .then(d => {
        alert("Returned! Fine: ₹" + d.fine);
        loadIssuedBooks();
        loadReturnBooks();
        loadAllBooks();
    });
}

// ========================================
// RESERVATIONS
// ========================================
function loadReservations() {
    fetch("/api/reservations")
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("reservationList");
            list.innerHTML = "";

            data.forEach(r => {
                list.innerHTML += `
                    <li class="glass p-4 rounded-xl">
                        <h3 class="text-xl font-semibold">${r.book_title}</h3>
                        <p class="text-gray-400">Status: ${r.status}</p>
                    </li>
                `;
            });
        });
}

// ========================================
// MAKE RESERVATION
// ========================================
function reserveBook(book_id) {
    fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id })
    })
    .then(res => res.json())
    .then(d => {
        alert(d.msg || d.error);
        loadReservations();
    });
}

// ========================================
// ON PAGE LOAD
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    showSection("books");
    loadAllBooks();
});

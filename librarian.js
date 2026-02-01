// =====================================================
// SECTION SWITCHER
// =====================================================
function showSection(id) {
    const all = ["books", "reservations", "defaulters", "analytics"];
    all.forEach(sec => document.getElementById(sec).classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");

    if (id === "books") loadBooks();
    if (id === "reservations") loadReservations();
    if (id === "defaulters") loadDefaulters();
    if (id === "analytics") loadCharts();
}


// =====================================================
// LOAD BOOKS
// =====================================================
function loadBooks() {
    fetch("/api/books")
        .then(res => res.json())
        .then(books => {
            const table = document.getElementById("bookTable");
            table.innerHTML = "";

            books.forEach(b => {
                table.innerHTML += `
                <tr class="border-b border-gray-700">
                    <td class="p-2">${b.title}</td>
                    <td class="p-2">${b.author}</td>
                    <td class="p-2">${b.copies}</td>
                    <td class="p-2">${b.section || "N/A"}</td>
                    <td class="p-2">${b.shelf || "N/A"}</td>
                    <td class="p-2">
                        <button onclick="deleteBook('${b.id}')"
                            class="px-3 py-1 bg-red-600 rounded hover:bg-red-700">Delete</button>
                    </td>
                </tr>
                `;
            });
        });
}


// =====================================================
// ADD BOOK
// =====================================================
function addBook() {
    const data = {
        title: document.getElementById("title").value,
        author: document.getElementById("author").value,
        copies: parseInt(document.getElementById("copies").value),
        section: document.getElementById("section").value,
        shelf: document.getElementById("shelf").value
    };

    fetch("/api/add_book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(d => {
            alert("Book Added!");
            loadBooks();
        });
}


// =====================================================
// DELETE BOOK
// =====================================================
function deleteBook(id) {
    if (!confirm("Delete this book?")) return;

    fetch("/api/delete_book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    })
        .then(res => res.json())
        .then(d => {
            alert("Book deleted");
            loadBooks();
        });
}


// =====================================================
// LOAD RESERVATIONS
// =====================================================
function loadReservations() {
    fetch("/api/reservations")
        .then(res => res.json())
        .then(list => {
            const div = document.getElementById("reservationList");
            div.innerHTML = "";

            list.forEach(r => {
                div.innerHTML += `
                    <li class="glass p-4 rounded-xl">
                        <h3 class="text-xl font-semibold">${r.book_title}</h3>
                        <p class="text-gray-300">${r.student}</p>
                        <p class="text-gray-400">Status: ${r.status}</p>
                    </li>
                `;
            });
        });
}


// =====================================================
// LOAD DEFAULTERS
// =====================================================
function loadDefaulters() {
    fetch("/api/defaulters")
        .then(res => res.json())
        .then(data => {
            const div = document.getElementById("defaultersList");
            div.innerHTML = "";

            data.forEach(d => {
                div.innerHTML += `
                    <li class="glass p-4 rounded-xl">
                        <h3 class="text-xl font-semibold">${d.email}</h3>
                        <p class="text-red-400">Fine: ₹${d.fine}</p>
                    </li>
                `;
            });
        });
}


// =====================================================
// LOAD ADMIN CHARTS
// =====================================================
function loadCharts() {
    loadPopularBooksChart();
    loadWeeklyIssuedChart();
}


// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    showSection("books");
});

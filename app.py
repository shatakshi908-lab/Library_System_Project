from flask import Flask, render_template, request, redirect, session, jsonify
from firebase_admin import credentials, firestore, initialize_app
from datetime import datetime, timedelta
import os, json

app = Flask(__name__)
app.secret_key = "supersecret"

# ---------------------------------------------------
# FIREBASE INIT (Render-safe)
# ---------------------------------------------------
# Load Firebase service account from environment variable
firebase_key = os.getenv("FIREBASE_KEY")

if not firebase_key:
    raise Exception("FIREBASE_KEY environment variable missing! Add it in Render dashboard.")

cred_dict = json.loads(firebase_key)
cred = credentials.Certificate(cred_dict)
initialize_app(cred)
db = firestore.client()


# ---------------------------------------------------
# UTILITY: Convert Firestore Timestamp to datetime
# ---------------------------------------------------
def to_dt(value):
    if hasattr(value, "to_datetime"):
        value = value.to_datetime()
    if value is None:
        return None
    return value.replace(tzinfo=None)


# ---------------------------------------------------
# LOGIN
# ---------------------------------------------------
@app.route("/")
def login_page():
    return render_template("login.html")


@app.route("/login", methods=["POST"])
def login():
    email = request.form["email"]
    password = request.form["password"]

    user_doc = db.collection("users").document(email).get()
    if not user_doc.exists:
        return "User does not exist"

    user = user_doc.to_dict()

    if user["password"] != password:
        return "Invalid password"

    session["email"] = email
    session["role"] = user["role"]

    return redirect("/librarian" if user["role"] == "librarian" else "/student")


# ---------------------------------------------------
# STUDENT DASHBOARD
# ---------------------------------------------------
@app.route("/student")
def student_dashboard():
    if "email" not in session or session["role"] != "student":
        return redirect("/")
    return render_template("student_dashboard.html")


# ---------------------------------------------------
# GET ALL BOOKS
# ---------------------------------------------------
@app.route("/api/books")
def get_books():
    books = []
    for d in db.collection("books").stream():
        book = d.to_dict()
        book["id"] = d.id
        books.append(book)
    return jsonify(books)


# ---------------------------------------------------
# SEARCH BOOK
# ---------------------------------------------------
@app.route("/api/search")
def search_books():
    q = request.args.get("q", "").lower()
    results = []

    for d in db.collection("books").stream():
        book = d.to_dict()
        if q in book["title"].lower() or q in book["author"].lower():
            book["id"] = d.id
            results.append(book)

    return jsonify(results)


# ---------------------------------------------------
# GET A SINGLE BOOK
# ---------------------------------------------------
@app.route("/api/book/<book_id>")
def get_single_book(book_id):
    doc = db.collection("books").document(book_id).get()
    if not doc.exists:
        return jsonify({"error": "Not found"}), 404

    book = doc.to_dict()
    book["id"] = doc.id
    return jsonify(book)


# ---------------------------------------------------
# ISSUE BOOK
# ---------------------------------------------------
@app.route("/api/issue", methods=["POST"])
def issue_book():
    if "email" not in session:
        return jsonify({"error": "Not logged in"}), 403

    email = session["email"]
    book_id = request.json["book_id"]

    book_doc = db.collection("books").document(book_id).get()
    if not book_doc.exists:
        return jsonify({"error": "Book not found"}), 404

    book = book_doc.to_dict()

    if book["copies"] <= 0:
        return jsonify({"error": "No copies available"}), 400

    db.collection("books").document(book_id).update({
        "copies": book["copies"] - 1
    })

    issued = datetime.utcnow()
    due = issued + timedelta(days=7)

    db.collection("issues").add({
        "email": email,
        "book_id": book_id,
        "issued_date": issued,
        "due_date": due,
        "returned": False
    })

    return jsonify({"msg": "Book issued successfully"})


# ---------------------------------------------------
# RETURN BOOK
# ---------------------------------------------------
@app.route("/api/return", methods=["POST"])
def return_book():
    issue_id = request.json["issue_id"]

    ref = db.collection("issues").document(issue_id)
    issue = ref.get().to_dict()

    now = datetime.utcnow()

    ref.update({
        "returned": True,
        "return_date": now
    })

    db.collection("books").document(issue["book_id"]).update({
        "copies": firestore.Increment(1)
    })

    due = to_dt(issue["due_date"])
    late_days = (now - due).days
    fine = late_days * 5 if late_days > 0 else 0

    return jsonify({"fine": fine})


# ---------------------------------------------------
# STUDENT ISSUED BOOKS
# ---------------------------------------------------
@app.route("/api/student/issues")
def get_student_issues():
    if "email" not in session:
        return jsonify([])

    email = session["email"]
    out = []

    docs = db.collection("issues").where("email", "==", email).stream()

    for d in docs:
        issue = d.to_dict()
        issue["id"] = d.id

        issue["issued_date"] = to_dt(issue["issued_date"])
        issue["due_date"] = to_dt(issue["due_date"])

        book_doc = db.collection("books").document(issue["book_id"]).get()
        issue["book_title"] = book_doc.to_dict()["title"]

        out.append(issue)

    return jsonify(out)


# ---------------------------------------------------
# RESERVATIONS
# ---------------------------------------------------
@app.route("/api/reservations")
def get_reservations():
    docs = db.collection("reservations").order_by("time").stream()

    out = []

    for d in docs:
        r = d.to_dict()
        r["id"] = d.id

        book = db.collection("books").document(r["book_id"]).get()
        r["book_title"] = book.to_dict().get("title", "Unknown")

        out.append(r)

    if session.get("role") == "student":
        out = [x for x in out if x["email"] == session["email"]]

    return jsonify(out)


@app.route("/api/reserve", methods=["POST"])
def reserve_book():
    email = session["email"]
    book_id = request.json["book_id"]

    exists = db.collection("reservations") \
               .where("email", "==", email) \
               .where("book_id", "==", book_id) \
               .stream()

    if list(exists):
        return jsonify({"error": "Already reserved"}), 400

    db.collection("reservations").add({
        "email": email,
        "book_id": book_id,
        "time": datetime.utcnow(),
        "status": "waiting"
    })

    return jsonify({"msg": "Reservation added"})


# ---------------------------------------------------
# LIBRARIAN DASHBOARD
# ---------------------------------------------------
@app.route("/librarian")
def librarian_dashboard():
    if "email" not in session or session["role"] != "librarian":
        return redirect("/")
    return render_template("librarian_dashboard.html")


# ---------------------------------------------------
# CRUD for Books
# ---------------------------------------------------
@app.route("/api/add_book", methods=["POST"])
def add_book():
    db.collection("books").add(request.json)
    return jsonify({"msg": "Book added"})


@app.route("/api/edit_book", methods=["POST"])
def edit_book():
    data = request.json
    book_id = data.pop("id")
    db.collection("books").document(book_id).update(data)
    return jsonify({"msg": "Book updated"})


@app.route("/api/delete_book", methods=["POST"])
def delete_book():
    db.collection("books").document(request.json["id"]).delete()
    return jsonify({"msg": "Book deleted"})


# ---------------------------------------------------
# ANALYTICS: Popular Books
# ---------------------------------------------------
@app.route("/api/charts/popular_books")
def chart_popular_books():
    week_ago = datetime.utcnow() - timedelta(days=7)
    counts = {}

    docs = db.collection("issues").stream()

    for d in docs:
        issue = d.to_dict()
        issued = to_dt(issue["issued_date"])

        if issued >= week_ago:
            bid = issue["book_id"]
            counts[bid] = counts.get(bid, 0) + 1

    out = []
    for bid, c in counts.items():
        book = db.collection("books").document(bid).get()
        out.append({"title": book.to_dict()["title"], "count": c})

    return jsonify(out)


# ---------------------------------------------------
# ANALYTICS: Weekly Issued Books
# ---------------------------------------------------
@app.route("/api/charts/weekly_issued")
def chart_weekly_issued():
    week_ago = datetime.utcnow() - timedelta(days=7)

    day_map = {d: 0 for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}

    docs = db.collection("issues").stream()

    for d in docs:
        issue = d.to_dict()
        issued = to_dt(issue["issued_date"])

        if issued >= week_ago:
            day = issued.strftime("%a")
            day_map[day] += 1

    return jsonify([{"day": d, "count": c} for d, c in day_map.items()])


# ---------------------------------------------------
# RUN SERVER
# ---------------------------------------------------
if __name__ == "__main__":
    app.run()

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# -----------------------------
# INITIALIZE FIREBASE APP
# -----------------------------
cred = credentials.Certificate(
    r"C:\Users\shata\OneDrive\project\seviceAccountKey.json"
)
firebase_admin.initialize_app(cred)

db = firestore.client()

print("🔥 Connected to Firestore!")


# ========================================
# USERS (Student + Librarian)
# ========================================
users = [
    {
        "email": "librarian@library.com",
        "password": "admin123",
        "role": "librarian",
        "name": "Head Librarian"
    },
    {
        "email": "student1@college.com",
        "password": "student123",
        "role": "student",
        "name": "Student One"
    },
    {
        "email": "student2@college.com",
        "password": "student123",
        "role": "student",
        "name": "Student Two"
    }
]

print("\n📌 Seeding Users...")
for u in users:
    db.collection("users").document(u["email"]).set(u)
    print(f"✔ Added: {u['email']}")


# ========================================
# BOOK COLLECTION (with section + shelf)
# ========================================
books = [
    {
        "title": "Introduction to Algorithms",
        "author": "Cormen",
        "copies": 5,
        "issued": 0,
        "section": "A1",
        "shelf": "S1"
    },
    {
        "title": "Data Structures in Python",
        "author": "Narasimha Karumanchi",
        "copies": 3,
        "issued": 0,
        "section": "A2",
        "shelf": "S4"
    },
    {
        "title": "Operating System Concepts",
        "author": "Silberschatz",
        "copies": 4,
        "issued": 0,
        "section": "B1",
        "shelf": "S2"
    },
    {
        "title": "Computer Networks",
        "author": "Tanenbaum",
        "copies": 2,
        "issued": 0,
        "section": "B3",
        "shelf": "S3"
    }
]

print("\n📚 Seeding Books...")
for b in books:
    ref = db.collection("books").add(b)
    print(f"✔ Book Added: {b['title']} (id: {ref[1].id})")


# ========================================
# SAMPLE ISSUES (optional for testing)
# ========================================
sample_issues = [
    {
        "email": "student1@college.com",
        "book_id": None,      # WILL BE FILLED BELOW
        "issued_date": datetime.now(),
        "due_date": datetime.now(),
        "returned": False
    }
]

# Auto-fill one book ID for sample issue
all_books = list(db.collection("books").stream())
if all_books:
    sample_issues[0]["book_id"] = all_books[0].id

print("\n📘 Creating Sample Issue...")
for issue in sample_issues:
    db.collection("issues").add(issue)
print("✔ Sample issue added")


# ========================================
# SAMPLE RESERVATIONS
# ========================================
sample_reservations = [
    {
        "email": "student2@college.com",
        "book_id": all_books[1].id if len(all_books) > 1 else "",
        "time": datetime.now(),
        "status": "waiting"
    }
]

print("\n⏳ Adding Sample Reservations...")
for r in sample_reservations:
    db.collection("reservations").add(r)
print("✔ Reservations added")


# ========================================
# OPTIONAL → Ensure empty collections exist
# ========================================
print("\n🗂 Creating empty collections (if not created)...")

db.collection("issues")
db.collection("reservations")

print("\n✅ Firestore Seeding Completed Successfully!")

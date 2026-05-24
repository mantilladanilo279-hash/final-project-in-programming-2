let books = JSON.parse(localStorage.getItem("books")) || [
  { title: "The Alchemist", author: "Paulo Coelho", status: "Available" },
  { title: "Harry Potter", author: "J.K. Rowling", status: "Available" },
  { title: "The Hobbit", author: "J.R.R. Tolkien", status: "Borrowed" }
];

let selectedBookCover = "";
let coverProcessingPromise = Promise.resolve();
let editingBookIndex = null;
let editSelectedBookCover = "";
let editCoverProcessingPromise = Promise.resolve();
let removingBookIndex = null;

/* =========================
   SAVE DATA
========================= */
function saveBooks() {
  localStorage.setItem("books", JSON.stringify(books));
}

/* =========================
   INIT
========================= */
window.onload = function () {
  refreshAll();
};

/* =========================
   REFRESH ALL UI
========================= */
function refreshAll() {
  renderDashboard();
  renderBorrowOptions();
  renderReturnOptions();
  renderBooks();
  renderManageBooks();
  searchBook();
}

/* =========================
   SORT HELPERS
========================= */
function getSortedBooks() {
  return [...books].sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}

function getSortedBooksWithIndex() {
  return books
    .map((book, index) => ({ book, index }))
    .sort((a, b) =>
      a.book.title.localeCompare(b.book.title)
    );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getBookGradient(book) {
  const gradients = [
    "linear-gradient(135deg, #bfdbfe, #dbeafe 45%, #ffffff)",
    "linear-gradient(135deg, #bae6fd, #e0f2fe 50%, #ffffff)",
    "linear-gradient(135deg, #c7d2fe, #e0e7ff 52%, #ffffff)",
    "linear-gradient(135deg, #bbf7d0, #dcfce7 50%, #ffffff)",
    "linear-gradient(135deg, #fde68a, #fef3c7 50%, #ffffff)",
    "linear-gradient(135deg, #fecdd3, #ffe4e6 52%, #ffffff)"
  ];
  const title = book.title || "";
  const total = title.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return gradients[total % gradients.length];
}

function getBookCoverMarkup(book) {
  if (book.cover) {
    return `
      <div class="book-cover">
        <img src="${book.cover}" alt="${escapeHtml(book.title)} cover">
      </div>
    `;
  }

  return `
    <div class="book-cover book-cover-empty" style="background:${getBookGradient(book)}">
      <span>${escapeHtml((book.title || "Book").charAt(0).toUpperCase())}</span>
    </div>
  `;
}

function resizeBookCover(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const width = 360;
        const height = 540;
        const ctx = canvas.getContext("2d");
        const imageRatio = image.width / image.height;
        const coverRatio = width / height;
        let sourceWidth = image.width;
        let sourceHeight = image.height;
        let sourceX = 0;
        let sourceY = 0;

        if (imageRatio > coverRatio) {
          sourceWidth = image.height * coverRatio;
          sourceX = (image.width - sourceWidth) / 2;
        } else {
          sourceHeight = image.width / coverRatio;
          sourceY = (image.height - sourceHeight) / 2;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.onerror = reject;
      image.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function previewBookCover(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("bookCoverPreview");

  if (!file) {
    selectedBookCover = "";
    coverProcessingPromise = Promise.resolve();
    if (preview) preview.style.backgroundImage = "";
    return;
  }

  coverProcessingPromise = resizeBookCover(file);

  try {
    selectedBookCover = await coverProcessingPromise;

    if (preview) {
      preview.style.backgroundImage = `url("${selectedBookCover}")`;
    }

    showFlashMessage("Book Cover Inserted Successfully!", "success");
  } catch (error) {
    selectedBookCover = "";
    coverProcessingPromise = Promise.resolve();
    event.target.value = "";
    if (preview) preview.style.backgroundImage = "";
    showFlashMessage("Cover image could not be added", "error");
  }
}

async function previewEditBookCover(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("editBookCoverPreview");

  if (!file) {
    editSelectedBookCover = "";
    editCoverProcessingPromise = Promise.resolve();
    if (preview) preview.style.backgroundImage = "";
    return;
  }

  editCoverProcessingPromise = resizeBookCover(file);

  try {
    editSelectedBookCover = await editCoverProcessingPromise;

    if (preview) {
      preview.style.backgroundImage = `url("${editSelectedBookCover}")`;
    }

    showFlashMessage("Book Cover Inserted Successfully!", "success");
  } catch (error) {
    editSelectedBookCover = "";
    editCoverProcessingPromise = Promise.resolve();
    event.target.value = "";
    if (preview) preview.style.backgroundImage = "";
    showFlashMessage("Cover image could not be added", "error");
  }
}

function renderBookRow(book) {
  let statusClass = book.status.toLowerCase();

  if (statusClass === "borrow") {
    statusClass = "borrowed";
  }

  return `
    <tr>
      <td>${escapeHtml(book.title)}</td>
      <td>${escapeHtml(book.author)}</td>
      <td class="${statusClass}">
        ${escapeHtml(book.status)}
      </td>
    </tr>
  `;
}

/* =========================
   SHOW DASHBOARD BOOK GRID
========================= */
function renderBooks() {
  let grid = document.getElementById("bookGrid");
  if (!grid) return;

  grid.innerHTML = "";

  getSortedBooks().forEach(b => {
    const statusClass = b.status.toLowerCase() === "borrow" ? "borrowed" : b.status.toLowerCase();

    grid.innerHTML += `
      <article class="book-item">
        ${getBookCoverMarkup(b)}
        <div class="book-info">
          <h3>${escapeHtml(b.title)}</h3>
          <p>${escapeHtml(b.author)}</p>
          <span class="book-status ${statusClass}">${escapeHtml(b.status)}</span>
        </div>
      </article>
    `;
  });
}

/* =========================
   MANAGE BOOKS
========================= */
function renderManageBooks() {
  const list = document.getElementById("manageBookList");
  if (!list) return;

  list.innerHTML = "";

  if (books.length === 0) {
    list.innerHTML = `<p class="empty-manage-message">No books yet.</p>`;
    return;
  }

  getSortedBooksWithIndex().forEach(({ book, index }) => {
    const statusClass = book.status.toLowerCase() === "borrow" ? "borrowed" : book.status.toLowerCase();

    list.innerHTML += `
      <article class="manage-book-item">
        <div class="manage-book-cover">
          ${getBookCoverMarkup(book)}
        </div>
        <div class="manage-book-details">
          <h3>${escapeHtml(book.title)}</h3>
          <p>${escapeHtml(book.author)}</p>
          <span class="book-status ${statusClass}">${escapeHtml(book.status)}</span>
        </div>
        <div class="manage-book-actions">
          <button class="edit-book-button" onclick="startEditBook(${index})">Edit</button>
          <button class="remove-book-button" onclick="removeBook(${index})">Remove</button>
        </div>
      </article>
    `;
  });
}

function resetBookForm() {
  const titleInput = document.getElementById("bookTitle");
  const authorInput = document.getElementById("bookAuthor");
  const coverInput = document.getElementById("bookCover");
  const preview = document.getElementById("bookCoverPreview");

  if (titleInput) titleInput.value = "";
  if (authorInput) authorInput.value = "";
  if (coverInput) coverInput.value = "";
  if (preview) preview.style.backgroundImage = "";

  selectedBookCover = "";
  coverProcessingPromise = Promise.resolve();
}

function startEditBook(index) {
  const book = books[index];
  if (!book) return;

  const modal = document.getElementById("editBookModal");
  const titleInput = document.getElementById("editBookTitle");
  const authorInput = document.getElementById("editBookAuthor");
  const coverInput = document.getElementById("editBookCover");
  const preview = document.getElementById("editBookCoverPreview");

  if (titleInput) titleInput.value = book.title;
  if (authorInput) authorInput.value = book.author;
  if (coverInput) coverInput.value = "";
  if (preview) preview.style.backgroundImage = book.cover ? `url("${book.cover}")` : "";

  editSelectedBookCover = book.cover || "";
  editCoverProcessingPromise = Promise.resolve();
  editingBookIndex = index;
  if (modal) modal.classList.remove("hidden");
  if (titleInput) titleInput.focus();
}

function cancelEditBook() {
  const modal = document.getElementById("editBookModal");
  const titleInput = document.getElementById("editBookTitle");
  const authorInput = document.getElementById("editBookAuthor");
  const coverInput = document.getElementById("editBookCover");
  const preview = document.getElementById("editBookCoverPreview");

  if (modal) modal.classList.add("hidden");
  if (titleInput) titleInput.value = "";
  if (authorInput) authorInput.value = "";
  if (coverInput) coverInput.value = "";
  if (preview) preview.style.backgroundImage = "";

  editingBookIndex = null;
  editSelectedBookCover = "";
  editCoverProcessingPromise = Promise.resolve();
  showFlashMessage("Edit cancelled", "success");
}

function removeBook(index) {
  const book = books[index];
  if (!book) return;

  const modal = document.getElementById("removeBookModal");
  const message = document.getElementById("removeBookMessage");

  removingBookIndex = index;
  if (message) {
    message.innerText = `Are you sure you want to remove "${book.title}" from the library?`;
  }
  if (modal) modal.classList.remove("hidden");
}

function cancelRemoveBook() {
  const modal = document.getElementById("removeBookModal");

  if (modal) modal.classList.add("hidden");
  removingBookIndex = null;
  showFlashMessage("Remove cancelled", "success");
}

function confirmRemoveBook() {
  if (removingBookIndex === null || !books[removingBookIndex]) {
    const modal = document.getElementById("removeBookModal");
    if (modal) modal.classList.add("hidden");
    removingBookIndex = null;
    showFlashMessage("Please choose a book to remove again", "error");
    return;
  }

  const modal = document.getElementById("removeBookModal");

  books.splice(removingBookIndex, 1);
  saveBooks();
  refreshAll();

  if (editingBookIndex !== null) {
    closeEditBookModal();
  }

  if (modal) modal.classList.add("hidden");
  removingBookIndex = null;
  showFlashMessage("Book Removed Successfully!", "success");
}

function closeEditBookModal() {
  const modal = document.getElementById("editBookModal");
  const titleInput = document.getElementById("editBookTitle");
  const authorInput = document.getElementById("editBookAuthor");
  const coverInput = document.getElementById("editBookCover");
  const preview = document.getElementById("editBookCoverPreview");

  if (modal) modal.classList.add("hidden");
  if (titleInput) titleInput.value = "";
  if (authorInput) authorInput.value = "";
  if (coverInput) coverInput.value = "";
  if (preview) preview.style.backgroundImage = "";

  editingBookIndex = null;
  editSelectedBookCover = "";
  editCoverProcessingPromise = Promise.resolve();
}

/* =========================
   DASHBOARD COUNTS
========================= */
function renderDashboard() {
  let total = document.getElementById("totalBooks");
  let borrowed = document.getElementById("borrowedBooks");
  let available = document.getElementById("availableBooks");

  if (!total || !borrowed || !available) return;

  let borrowedCount = books.filter(b => b.status === "Borrowed").length;

  total.innerText = books.length;
  borrowed.innerText = borrowedCount;
  available.innerText = books.length - borrowedCount;
}

/* =========================
   ADD OR EDIT BOOK
========================= */
async function saveBookFromForm() {
  let title = document.getElementById("bookTitle").value.trim();
  let author = document.getElementById("bookAuthor").value.trim();

  if (!title || !author) {
    showFlashMessage("Please fill all fields", "error");
    return;
  }

  try {
    await coverProcessingPromise;
  } catch (error) {
    showFlashMessage("Cover image could not be added", "error");
    return;
  }

  const updatedBook = {
    title,
    author,
    status: "Available",
    cover: selectedBookCover
  };
  books.push(updatedBook);

  try {
    saveBooks();
  } catch (error) {
    books.pop();
    showFlashMessage("Cover image is too large to save", "error");
    return;
  }
  refreshAll();

  showFlashMessage("Book Added Successfully!", "success");

  resetBookForm();
}

async function saveEditedBook() {
  const title = document.getElementById("editBookTitle").value.trim();
  const author = document.getElementById("editBookAuthor").value.trim();

  if (!title || !author) {
    showFlashMessage("Please fill all fields", "error");
    return;
  }

  try {
    await editCoverProcessingPromise;
  } catch (error) {
    showFlashMessage("Cover image could not be added", "error");
    return;
  }

  if (editingBookIndex === null || !books[editingBookIndex]) {
    closeEditBookModal();
    showFlashMessage("Please choose a book to edit again", "error");
    return;
  }

  const previousBook = books[editingBookIndex];

  books[editingBookIndex] = {
    ...previousBook,
    title,
    author,
    cover: editSelectedBookCover
  };

  try {
    saveBooks();
  } catch (error) {
    books[editingBookIndex] = previousBook;
    showFlashMessage("Cover image is too large to save", "error");
    return;
  }

  refreshAll();
  closeEditBookModal();
  showFlashMessage("Book Updated Successfully!", "success");
}

/* =========================
   BORROW OPTIONS
========================= */
function renderBorrowOptions() {
  let select = document.getElementById("borrowSelect");
  if (!select) return;

  select.innerHTML = "";

  getSortedBooksWithIndex().forEach(({ book, index }) => {
    if (book.status === "Available") {
      select.innerHTML += `<option value="${index}">${escapeHtml(book.title)}</option>`;
    }
  });
}

/* =========================
   BORROW BOOK
========================= */
function borrowBook() {
  let index = document.getElementById("borrowSelect").value;

  if (index === "") {
    showFlashMessage("No book selected", "error");
    return;
  }

  books[index].status = "Borrowed";

  saveBooks();
  refreshAll();

  showFlashMessage("Book Borrowed Successfully!", "success");
}

/* =========================
   RETURN OPTIONS
========================= */
function renderReturnOptions() {
  let select = document.getElementById("returnSelect");
  if (!select) return;

  select.innerHTML = "";

  getSortedBooksWithIndex().forEach(({ book, index }) => {
    if (book.status === "Borrowed") {
      select.innerHTML += `<option value="${index}">${escapeHtml(book.title)}</option>`;
    }
  });
}

/* =========================
   RETURN BOOK
========================= */
function returnBook() {
  let index = document.getElementById("returnSelect").value;

  if (index === "") {
    showFlashMessage("No book selected", "error");
    return;
  }

  books[index].status = "Available";

  saveBooks();
  refreshAll();

  showFlashMessage("Book Returned Successfully!", "success");
}

/* =========================
   SEARCH BOOK (FIXED)
========================= */
function searchBook() {

  let inputElement = document.getElementById("searchInput");
  let table = document.getElementById("searchTable");

  if (!inputElement || !table) return;

  let input = inputElement.value.toLowerCase().trim();

  table.innerHTML = "";

  let found = false;

  getSortedBooks().forEach(b => {

    if (b.title.toLowerCase().includes(input)) {

      found = true;

      table.innerHTML += renderBookRow(b);
    }
  });

  if (!found && input !== "") {
    table.innerHTML = `
      <tr>
        <td colspan="3">No book found</td>
      </tr>
    `;
  }
}

/* =========================
   TOP SEARCH BAR
========================= */
function topSearchBook() {
  let topInput = document.getElementById("topSearchInput");
  let sectionInput = document.getElementById("searchInput");

  if (!topInput || !sectionInput) return;

  sectionInput.value = topInput.value;
  showSection("searchBook");
  searchBook();
}

/* =========================
   LOGOUT
========================= */
function logoutUser(event) {
  event.preventDefault();
  localStorage.removeItem("loggedIn");

  showFlashMessage("Logged Out Successfully", "success", "login.html");
}

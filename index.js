// Import Firebase from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

// TODO: Replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyD7qJ3BZ3ppoA9zvT264OzOMkD9L7ls0-Q",
  authDomain: "lunchbreakpoll-c4ecc.firebaseapp.com",
  databaseURL: "https://lunchbreakpoll-c4ecc-default-rtdb.firebaseio.com",
  projectId: "lunchbreakpoll-c4ecc",
  storageBucket: "lunchbreakpoll-c4ecc.firebasestorage.app",
  messagingSenderId: "143579801004",
  appId: "1:143579801004:web:cf8d2dbc25b12a9ae5c609"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const placesRef = ref(db, "lunchPlaces");

const placeForm = document.getElementById("placeForm");
const placeInput = document.getElementById("placeInput");
const placesList = document.getElementById("placesList");

// Submit new place
placeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const placeName = placeInput.value.trim();
  if (placeName) {
    push(placesRef, {
      name: placeName,
      votes: 0
    });
    placeInput.value = "";
  }
});

// Render place list with live updates
onValue(placesRef, (snapshot) => {
  placesList.innerHTML = "";
  const data = snapshot.val();
  for (let id in data) {
    const place = data[id];
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${place.name} — <strong>${place.votes} votes</strong></span>
      <button class="vote-btn" data-id="${id}">Vote</button>
    `;
    placesList.appendChild(li);
  }
});

// Handle voting
placesList.addEventListener("click", (e) => {
  if (e.target.classList.contains("vote-btn")) {
    const id = e.target.getAttribute("data-id");
    const voteRef = ref(db, `lunchPlaces/${id}`);
    // Get current votes and increment
    onValue(voteRef, (snapshot) => {
      const current = snapshot.val();
      if (current) {
        update(voteRef, { votes: (current.votes || 0) + 1 });
      }
    }, { onlyOnce: true });
  }
});

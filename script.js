// ---------------------- Selectors ----------------------
const form = document.getElementById('form');
const search = document.getElementById('search');
const result = document.getElementById('result');
const more = document.getElementById('more');
const loading = document.getElementById('loading');
const favoritesList = document.getElementById('favorites-list');
const noFavorites = document.getElementById('no-favorites');

const apiURL = 'https://api.lyrics.ovh';

// ---------------------- Helpers ----------------------
function showLoading() {
  loading.classList.remove('hidden');
  loading.setAttribute('aria-hidden', 'false');
}
function hideLoading() {
  loading.classList.add('hidden');
  loading.setAttribute('aria-hidden', 'true');
}

// Simple debounce so we don't fire a search on every keystroke
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ---------------------- Favorites (localStorage) ----------------------
function loadFavorites() {
  const raw = localStorage.getItem('lyricsFavorites');
  return raw ? JSON.parse(raw) : [];
}
function saveFavorites(favs) {
  localStorage.setItem('lyricsFavorites', JSON.stringify(favs));
  renderFavorites();
}
function addFavorite(artist, title) {
  const favs = loadFavorites();
  // avoid duplicates
  if (!favs.find((f) => f.artist === artist && f.title === title)) {
    favs.push({ artist, title });
    saveFavorites(favs);
  }
}
function removeFavorite(index) {
  const favs = loadFavorites();
  favs.splice(index, 1);
  saveFavorites(favs);
}
function renderFavorites() {
  const favs = loadFavorites();
  favoritesList.innerHTML = '';
  if (favs.length === 0) {
    noFavorites.style.display = 'block';
    return;
  }
  noFavorites.style.display = 'none';
  favs.forEach((f, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.innerHTML = `<strong>${f.artist}</strong> - ${f.title}`;

    const actions = document.createElement('div');

    const goBtn = document.createElement('button');
    goBtn.className = 'btn small';
    goBtn.textContent = 'View';
    goBtn.addEventListener('click', () => getLyricsSafe(f.artist, f.title));

    const del = document.createElement('button');
    del.className = 'btn small';
    del.textContent = 'Remove';
    del.addEventListener('click', () => removeFavorite(i));

    actions.append(goBtn, del);
    li.append(span, actions);
    favoritesList.appendChild(li);
  });
}

// ---------------------- Fetch & show functions ----------------------

// Search by song or artist
async function searchSongs(term) {
  try {
    showLoading();
    // NOTE: important slash before term: /suggest/<term>
    const res = await fetch(`${apiURL}/suggest/${encodeURIComponent(term)}`);
    const data = await res.json();
    // call safe show function
    showDataSafe(data);
  } catch (err) {
    console.error(err);
    result.innerHTML = `<p>There was an error fetching results. Try again.</p>`;
    more.innerHTML = '';
  } finally {
    hideLoading();
  }
}

// Fetch more songs using links in API response (lyrics.ovh returns full URLs for prev/next)
async function getMoreSongs(url) {
  try {
    showLoading();
    // The API returns http/https full URLs; fetch them directly
    const res = await fetch(url);
    const data = await res.json();
    showDataSafe(data);
  } catch (err) {
    console.error(err);
    result.innerHTML = `<p>Couldn't load more results.</p>`;
    more.innerHTML = '';
  } finally {
    hideLoading();
  }
}

// Safe DOM rendering (no .innerHTML insertion of raw data)
function showDataSafe(lyrics) {
  result.innerHTML = '';
  more.innerHTML = '';

  if (!lyrics || !lyrics.data || lyrics.data.length === 0) {
    result.innerHTML = '<p>No results. Try a different search.</p>';
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'songs';

  lyrics.data.forEach((song) => {
    const li = document.createElement('li');

    const span = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = song.artist.name;
    span.appendChild(strong);
    span.appendChild(document.createTextNode(` - ${song.title}`));
    li.appendChild(span);

    const actions = document.createElement('div');

    const lyricsBtn = document.createElement('button');
    lyricsBtn.className = 'btn';
    lyricsBtn.textContent = 'Get Lyrics';
    lyricsBtn.dataset.artist = song.artist.name;
    lyricsBtn.dataset.songtitle = song.title;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn small';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () =>
      addFavorite(song.artist.name, song.title)
    );

    actions.append(lyricsBtn, saveBtn);
    li.appendChild(actions);
    ul.appendChild(li);
  });

  result.appendChild(ul);

  // Pagination handling
  if (lyrics.prev || lyrics.next) {
    if (lyrics.prev) {
      const prevButton = document.createElement('button');
      prevButton.className = 'btn';
      prevButton.textContent = 'Prev';
      prevButton.addEventListener('click', () => getMoreSongs(lyrics.prev));
      more.appendChild(prevButton);
    }
    if (lyrics.next) {
      const nextButton = document.createElement('button');
      nextButton.className = 'btn';
      nextButton.textContent = 'Next';
      nextButton.addEventListener('click', () => getMoreSongs(lyrics.next));
      more.appendChild(nextButton);
    }
  } else {
    more.innerHTML = '';
  }
}

// Get lyrics for song (safe DOM operations)
async function getLyricsSafe(artist, songTitle) {
  try {
    showLoading();
    const res = await fetch(`${apiURL}/v1/${encodeURIComponent(artist)}/${encodeURIComponent(songTitle)}`);
    const data = await res.json();

    result.innerHTML = '';
    more.innerHTML = '';

    if (data.error) {
      const p = document.createElement('p');
      p.textContent = data.error;
      result.appendChild(p);
      return;
    }

    // Heading
    const heading = document.createElement('h2');
    const strong = document.createElement('strong');
    strong.textContent = artist;
    heading.append(strong, ` - ${songTitle}`);
    result.appendChild(heading);

    // Lyrics with line breaks
    const span = document.createElement('span');
    const lines = data.lyrics.split(/\r\n|\r|\n/);
    lines.forEach((line, i) => {
      span.append(line);
      if (i < lines.length - 1) span.append(document.createElement('br'));
    });
    result.appendChild(span);

    // Back button (go back to a blank search or you can implement history)
    const back = document.createElement('button');
    back.className = 'btn';
    back.textContent = 'Back to results';
    back.addEventListener('click', () => {
      result.innerHTML = '<p>Type a search to get results again.</p>';
    });
    result.appendChild(document.createElement('br'));
    result.appendChild(back);
  } catch (err) {
    console.error(err);
    result.innerHTML = `<p>Failed to load lyrics. Try again.</p>`;
  } finally {
    hideLoading();
  }
}

// ---------------------- Event listeners ----------------------

// Submit form (search)
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const searchTerm = search.value.trim();
  if (!searchTerm) {
    alert('Please type in a search term');
    return;
  }
  searchSongs(searchTerm);
});

// Clicks inside results (Get Lyrics uses data attributes)
result.addEventListener('click', (e) => {
  const clickedEl = e.target;
  if (clickedEl.tagName === 'BUTTON' && clickedEl.dataset.artist) {
    const artist = clickedEl.getAttribute('data-artist');
    const songTitle = clickedEl.getAttribute('data-songtitle');
    getLyricsSafe(artist, songTitle);
  }
});

// Debounced live search on input (optional)
const debouncedSearch = debounce(() => {
  const term = search.value.trim();
  if (term.length >= 2) searchSongs(term);
}, 700);
search.addEventListener('input', debouncedSearch);

// ---------------------- Init ----------------------
renderFavorites();

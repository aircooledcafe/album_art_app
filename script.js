const searchForm = document.getElementById('searchForm');
const artistNameInput = document.getElementById('artistName');
const albumNameInput = document.getElementById('albumName');
const resultsArea = document.getElementById('resultsArea');
const loadingIndicator = document.getElementById('loadingIndicator');
const messageArea = document.getElementById('messageArea');

const paginationControls = document.getElementById('paginationControls');
const prevPageButton = document.getElementById('prevPage');
const nextPageButton = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

const downloadModal = document.getElementById('downloadModal');
const modalAlbumTitle = document.getElementById('modalAlbumTitle');
const modalAlbumArt = document.getElementById('modalAlbumArt');
const downloadLinksContainer = document.getElementById('downloadLinks');
const closeModalButton = document.getElementById('closeModal');

const RESULTS_PER_PAGE = 72;
let currentPage = 1;
let totalResults = 0;
let currentAlbumResults = [];

// --- Event Listeners ---
searchForm.addEventListener('submit', handleSearch);
prevPageButton.addEventListener('click', () => changePage(currentPage - 1));
nextPageButton.addEventListener('click', () => changePage(currentPage + 1));
closeModalButton.addEventListener('click', hideDownloadModal);
downloadModal.addEventListener('click', (event) => {
    if (event.target === downloadModal) {
        hideDownloadModal();
    }
});


// --- API Call and Data Handling ---
async function handleSearch(event) {
    event.preventDefault();
    const artistName = artistNameInput.value.trim();
    const albumName = albumNameInput.value.trim();

    currentPage = 1; 
    resultsArea.innerHTML = '';
    paginationControls.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');
    messageArea.textContent = '';

    try {
        const searchTerm = `${artistName} ${albumName}`.trim();
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=album&limit=200&media=music`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText} (Status: ${response.status})`);
        }
        const data = await response.json();
        
        currentAlbumResults = data.results.filter(result => result.artworkUrl100);
        totalResults = currentAlbumResults.length;

        if (totalResults === 0) {
            showMessage("No albums found for your search. Try different terms or check spelling.", "info");
        } else {
            displayResultsPage();
        }
    } catch (error) {
        console.error("Search error:", error);
        showMessage(`Failed to fetch album art: ${error.message}. Please check your connection or try again later.`, "error");
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

// --- Displaying Results ---
function displayResultsPage() {
    resultsArea.innerHTML = ''; 
    messageArea.textContent = '';

    if (totalResults === 0) {
        paginationControls.classList.add('hidden');
        return;
    }
    
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const endIndex = startIndex + RESULTS_PER_PAGE;
    const paginatedResults = currentAlbumResults.slice(startIndex, endIndex);

    paginatedResults.forEach(album => {
        const card = createAlbumCard(album);
        resultsArea.appendChild(card);
    });

    updatePaginationControls();
    if (totalResults > RESULTS_PER_PAGE) {
        paginationControls.classList.remove('hidden');
    } else {
         paginationControls.classList.add('hidden');
    }
}

function createAlbumCard(album) {
    // 1. Create Card Container
    const card = document.createElement('div');
    card.className = 'album-card'; // Changed from Tailwind classes

    const releaseYear = album.releaseDate ? new Date(album.releaseDate).getFullYear() : 'N/A';
    
    // 2. Image Container
    const imgContainer = document.createElement('div');
    imgContainer.className = 'img-container'; 

    const placeholderText = 'Artwork';
    const placeholderImg = document.createElement('div');
    placeholderImg.className = 'placeholder-img';
    placeholderImg.textContent = placeholderText;
    imgContainer.appendChild(placeholderImg);

    const img = document.createElement('img');
    img.src = album.artworkUrl100.replace('100x100bb.jpg', '300x300bb.jpg');
    img.alt = `${album.collectionName} by ${album.artistName}`;
    img.className = 'album-art-img'; 
    img.onerror = function() {
        img.style.display = 'none'; 
        placeholderImg.textContent = 'Art N/A';
    };
    img.onload = function() {
        placeholderImg.style.display = 'none';
    }
    imgContainer.appendChild(img);

    // 3. Info Container
    const infoDiv = document.createElement('div');
    infoDiv.className = 'card-info'; 

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = album.collectionName;
    title.title = album.collectionName; 

    const artist = document.createElement('p');
    artist.className = 'card-artist';
    artist.textContent = album.artistName;
    artist.title = album.artistName;

    const year = document.createElement('p');
    year.className = 'card-year';
    year.textContent = `Released: ${releaseYear}`;
    
    infoDiv.appendChild(title);
    infoDiv.appendChild(artist);
    infoDiv.appendChild(year);

    // 4. View Button
    const viewButton = document.createElement('button');
    viewButton.className = 'btn-primary btn-card'; 
    viewButton.textContent = 'View & Download';
    viewButton.onclick = () => showDownloadModal(album);

    card.appendChild(imgContainer);
    card.appendChild(infoDiv);
    card.appendChild(viewButton);
    return card;
}

// --- Pagination Logic ---
function updatePaginationControls() {
    const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages || totalResults === 0;

    if (totalPages <= 1) {
        paginationControls.classList.add('hidden');
    } else {
        paginationControls.classList.remove('hidden');
    }
}

function changePage(newPage) {
    if (newPage < 1 || newPage > Math.ceil(totalResults / RESULTS_PER_PAGE)) {
        return;
    }
    currentPage = newPage;
    displayResultsPage();
    resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Download Logic ---
async function forceDownload(url, filename, button) {
    const originalText = button.textContent;
    button.textContent = 'Downloading...';
    button.disabled = true;
    button.style.opacity = '0.5'; 
    button.style.cursor = 'not-allowed';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download failed:', error);
        alert('Download failed. Attempting to open in new tab instead.');
        window.open(url, '_blank');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    }
}

function showDownloadModal(album) {
    modalAlbumTitle.textContent = `${album.collectionName}`;
    const baseArtworkUrl = album.artworkUrl100.replace('100x100bb.jpg', ''); 
    
    modalAlbumArt.src = baseArtworkUrl + '600x600bb.jpg'; 
    modalAlbumArt.alt = album.collectionName;
    modalAlbumArt.onerror = () => {
        modalAlbumArt.src = `https://placehold.co/300x300/374151/9ca3af?text=Art+Not+Found`;
    };

    downloadLinksContainer.innerHTML = ''; 

    const sizes = [
        { label: 'Small (300x300)', dim: '300x300bb.jpg' },
        { label: 'Medium (600x600)', dim: '600x600bb.jpg' },
        { label: 'Large (1000x1000)', dim: '1000x1000bb.jpg' },
        { label: 'Max (~3000x3000)', dim: '3000x3000bb.jpg' }
    ];

    const releaseYear = album.releaseDate ? new Date(album.releaseDate).getFullYear() : 'UnknownYear';
    const safeArtistName = album.artistName.replace(/[/\\?%*:|"<>]/g, '-');
    const safeAlbumName = album.collectionName.replace(/[/\\?%*:|"<>]/g, '-');
    
    sizes.forEach(size => {
        const btn = document.createElement('button');
        const imageUrl = baseArtworkUrl + size.dim;
        
        let filename;
        if (size.label.includes('Max')) {
             filename = `${releaseYear} - ${safeArtistName} - ${safeAlbumName}.jpg`;
        } else {
             filename = `${releaseYear} - ${safeArtistName} - ${safeAlbumName} - ${size.dim.replace('bb.jpg', '')}.jpg`;
        }

        btn.className = 'download-btn'; // CSS Class from styles.css
        btn.textContent = `Download ${size.label}`;
        btn.onclick = () => forceDownload(imageUrl, filename, btn);
        
        downloadLinksContainer.appendChild(btn);
    });

    downloadModal.classList.remove('hidden');
}

function hideDownloadModal() {
    downloadModal.classList.add('hidden');
}

// --- Utility Functions ---
function showMessage(message, type = "info") {
    messageArea.textContent = message;
    
    // Reset classes
    messageArea.className = '';
    
    if (type === "error") {
        messageArea.classList.add('msg-error');
    } else if (type === "info") {
        messageArea.classList.add('msg-info');
    } else {
        messageArea.classList.add('msg-default');
    }
    
    resultsArea.innerHTML = ''; 
    paginationControls.classList.add('hidden');
}

showMessage("Enter an artist and optionally an album name to begin your search.", "default");
// js/search.js
// Live search bar — filters visible table rows as the user types.
// Depends on: utils.js (escapeHtml not needed here, but load order still matters)

const searchInput = document.getElementById('search-bar');

searchInput.addEventListener('input', (event) => {
    const searchFilter = event.target.value.toLowerCase().trim();

    // Query rows fresh on every keystroke so newly rendered tables are always picked up.
    const tableRows = document.querySelectorAll('#table-body tr');

    tableRows.forEach((row) => {
        const rowText = row.textContent.toLowerCase();
        if (rowText.includes(searchFilter)) {
            row.classList.remove('is-hidden');
        } else {
            row.classList.add('is-hidden');
        }
    });
});

// js/utils.js
// Shared helper functions — load this first, everything else depends on it.

// Escapes special HTML characters to prevent XSS when injecting user data into the DOM.
function escapeHtml(str)
{
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Returns the query name (e.g. 'customer', 'orders') of whichever table tab is active.
function getActiveQueryName()
{
    const activeBtn = document.querySelector('.tab-btn.active');
    return activeBtn ? activeBtn.dataset.query : 'customer';
}

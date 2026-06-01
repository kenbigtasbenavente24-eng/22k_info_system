// -------------------------------------------------------
// js/table-renderer.js — Renders JSON data as an HTML table
// and provides helper functions for SELECT, DELETE, UPDATE.
// Place this file in: htdocs/myapp/js/table-renderer.js
// -------------------------------------------------------


// ==== TABLE RENDERER ====================================

/**
 * Turns an array of row objects into an HTML <table> and
 * injects it into the element matching `containerId`.
 *
 * @param {string} containerId  - id of the target <div>
 * @param {Array}  rows         - array of objects (from SELECT response)
 */
function renderTable(containerId, rows) {
    const container = document.getElementById(containerId);

    if (!rows || rows.length === 0) {
        container.innerHTML = '<p>No results found.</p>';
        return;
    }

    // Build the header row from the keys of the first object
    const columns = Object.keys(rows[0]);

    let html = '<table border="1" cellpadding="6" cellspacing="0">';

    // --- Header ---
    html += '<thead><tr>';
    columns.forEach(col => {
        html += `<th>${escapeHtml(col)}</th>`;
    });
    html += '<th>Options</th>'
    html += '</tr></thead>';

    // --- Body ---
    html += '<tbody>';
    rows.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            // Use ?? '' so null values display as empty string
            html += `<td>${escapeHtml(String(row[col] ?? ''))}</td>`;
        });
        html += '<td><button>View</button></td>'
        html += '</tr>';
    });
    html += '</tbody></table>';

    container.innerHTML = html;
}

/**
 * Prevents XSS by escaping special HTML characters before
 * inserting any database value into the page.
 */
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// ==== API HELPERS =======================================

/**
 * Runs a named SELECT query and renders the results as a table.
 *
 * @param {string} queryName    - key from $SELECT_QUERIES in queries.php
 * @param {string} containerId  - id of the <div> to render the table into
 */
async function runSelect(queryName, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = 'Loading...';

    if(queryName = 'get_table') queryName = document.getElementById('table-select').value; 

    try {
        const res  = await fetch(`api/select.php?query=${encodeURIComponent(queryName)}`);
        const json = await res.json();

        if (json.error) {
            container.innerHTML = `<span style="color:red;">Error: ${escapeHtml(json.error)}</span>`;
            return;
        }

        renderTable(containerId, json.data);

    } catch (err) {
        container.innerHTML = `<span style="color:red;">Fetch failed: ${err.message}</span>`;
    }
}

/**
 * Runs a named DELETE query with the given parameter values.
 *
 * @param {string} queryName  - key from $DELETE_QUERIES in queries.php
 * @param {Array}  params     - values matching the ? placeholders in that query
 * @returns {Promise<number>} - number of affected rows, or -1 on error
 *
 * Example:
 *   const affected = await runDelete('delete_item_by_id', [42]);
 */
async function runDelete(queryName, params = []) {
    try {
        const res  = await fetch('api/delete.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ query: queryName, params }),
        });
        const json = await res.json();

        if (json.error) {
            console.error('DELETE error:', json.error);
            return -1;
        }

        return json.affected_rows;

    } catch (err) {
        console.error('DELETE fetch failed:', err);
        return -1;
    }
}

/**
 * Runs a named UPDATE query with the given parameter values.
 *
 * @param {string} queryName  - key from $UPDATE_QUERIES in queries.php
 * @param {Array}  params     - values matching the ? placeholders in that query
 * @returns {Promise<number>} - number of affected rows, or -1 on error
 *
 * Example:
 *   const affected = await runUpdate('update_item_name', ['New Name', 42]);
 */
async function runUpdate(queryName, params = []) {
    try {
        const res  = await fetch('api/update.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ query: queryName, params }),
        });
        const json = await res.json();

        if (json.error) {
            console.error('UPDATE error:', json.error);
            return -1;
        }

        return json.affected_rows;

    } catch (err) {
        console.error('UPDATE fetch failed:', err);
        return -1;
    }
}

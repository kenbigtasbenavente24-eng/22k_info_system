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
function renderTable(containerId, rows)
{
    const container = document.getElementById(containerId);

    if (!rows || rows.length === 0)
    {
        container.innerHTML = '<p>No results found.</p>';
        return;
    }

    // Build the header row from the keys of the first object
    const columns = Object.keys(rows[0]);

    // FIX: removed border/cellpadding/cellspacing attributes — styling is handled by CSS
    let html = '<div class="table-scroll"><table>';

    // --- Header ---
    html += '<thead><tr>';
    columns.forEach(col =>
    {
        html += `<th>${escapeHtml(col)}</th>`;
    });
    html += '<th>Options</th>';
    html += '</tr></thead>';

    // --- Body ---
    html += '<tbody>';
    rows.forEach(row =>
    {
        html += '<tr>';
        columns.forEach(col =>
        {
            // Use ?? '' so null values display as empty string
            html += `<td>${escapeHtml(String(row[col] ?? ''))}</td>`;
        });

        // FIX: use btoa() to base64-encode the JSON so quote characters in data
        // don't break the onclick HTML attribute (escapeHtml was corrupting the JSON,
        // causing JSON.parse to throw in ViewOptions).
        const rowDataB64 = btoa(unescape(encodeURIComponent(JSON.stringify(row))));
        html += `<td><button onclick="ViewOptions('${rowDataB64}')">View</button></td>`;
        html += '</tr>';
    });
    html += '</tbody></table></div>';

    container.innerHTML = html;
}

/**
 * VIEW POP-UP BUTTONS: Update | Delete | Close
 */
function ViewOptions(rowDataB64)
{
    // FIX: decode from base64 instead of trying to JSON.parse a quote-escaped string
    const row = JSON.parse(decodeURIComponent(escape(atob(rowDataB64))));
    const columns = Object.keys(row);
    const primaryId = row[columns[0]];

    // FIX: read the current table name from the active tab button,
    // not from a #table-select element that doesn't exist in the HTML
    const activeBtn = document.querySelector('.tab-btn.active');
    const currentTable = activeBtn ? activeBtn.textContent.trim() : 'record';

    // Elements
    const modal = document.getElementById('viewModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDetails = document.getElementById('modalDetails');

    // Set up text details
    let detailsText = '';
    columns.forEach(col =>
    {
        detailsText += `<strong>${escapeHtml(col)}:</strong> ${escapeHtml(String(row[col] ?? ''))}\n`;
    });

    // Reset components & display modal
    modalTitle.innerText = `Manage ${currentTable.toUpperCase()} (ID: ${primaryId})`;
    modalDetails.style.display = 'none';
    modalDetails.innerHTML = detailsText;
    modal.style.display = 'flex';

    // --- BUTTON EVENT LISTENERS ---

    // 1. Update Button
    document.getElementById('btnUpdate').onclick = async function()
    {
        modal.style.display = 'none';
        const oldNameValue = row[columns[1]] || '';
        await handleUpdate(currentTable, primaryId, oldNameValue);
    };

    // 2. Delete Button
    document.getElementById('btnDelete').onclick = function()
    {
        modal.style.display = 'none';
        handleDelete(currentTable, primaryId);
    };

    // 3. Close Button
    document.getElementById('btnClose').onclick = function()
    {
        modal.style.display = 'none';
    };
}

/**
 * Prevents XSS by escaping special HTML characters before
 * inserting any database value into the page.
 */
function escapeHtml(str)
{
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// ==== API HELPERS =======================================

/**
 * Returns the query name for the currently active tab.
 * Used by handleDelete / handleUpdate to refresh the right table.
 */
function getActiveQueryName()
{
    const activeBtn = document.querySelector('.tab-btn.active');
    return activeBtn ? activeBtn.dataset.query : 'customer';
}

/**
 * Runs a named SELECT query and renders the results as a table.
 *
 * @param {string} queryName    - key from $SELECT_QUERIES in queries.php
 * @param {string} containerId  - id of the <div> to render the table into
 */
async function runSelect(queryName, containerId)
{
    const container = document.getElementById(containerId);
    container.innerHTML = '<p class="loading-text">Loading...</p>';

    try
    {
        const res  = await fetch(`api/select.php?query=${encodeURIComponent(queryName)}`);
        const json = await res.json();

        if (json.error)
        {
            container.innerHTML = `<p class="error-text">Error: ${escapeHtml(json.error)}</p>`;
            return;
        }

        renderTable(containerId, json.data);
    }
    catch (err)
    {
        container.innerHTML = `<p class="error-text">Fetch failed: ${escapeHtml(err.message)}</p>`;
    }
}

/**
 * Handles a DELETE action triggered from the modal.
 * Calls the appropriate named query, alerts the result, then refreshes.
 *
 * @param {string} tableName  - name of the table (used to pick the query key)
 * @param {number} primaryId  - id of the row to delete
 */
async function handleDelete(tableName, primaryId)
{
    const queryName = `delete_${tableName}`;
    const affected  = await runDelete(queryName, [primaryId]);

    if (affected >= 0)
        alert(`Deleted ${affected} row(s).`);
    else
        alert('Delete failed. Check the console for details.');

    runSelect(getActiveQueryName(), 'result-container');
}

/**
 * Handles an UPDATE action triggered from the modal.
 * Prompts the user for a new name, then calls the appropriate named query.
 *
 * @param {string} tableName    - name of the table (used to pick the query key)
 * @param {number} primaryId    - id of the row to update
 * @param {string} oldNameValue - current value shown as the prompt default
 */
async function handleUpdate(tableName, primaryId, oldNameValue)
{
    const newName = prompt(`Enter new name for ID ${primaryId}:`, oldNameValue);
    if (newName === null) return; // user cancelled

    const queryName = `update_${tableName}`;
    const affected  = await runUpdate(queryName, [newName, primaryId]);

    if (affected >= 0)
        alert(`Updated ${affected} row(s).`);
    else
        alert('Update failed. Check the console for details.');

    runSelect(getActiveQueryName(), 'result-container');
}

/**
 * Runs a named DELETE query with the given parameter values.
 *
 * @param {string} queryName  - key from $DELETE_QUERIES in queries.php
 * @param {Array}  params     - values matching the ? placeholders in that query
 * @returns {Promise<number>} - number of affected rows, or -1 on error
 */
async function runDelete(queryName, params = [])
{
    try
    {
        const res  = await fetch('api/delete.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ query: queryName, params }),
        });
        const json = await res.json();

        if (json.error)
        {
            console.error('DELETE error:', json.error);
            return -1;
        }

        return json.affected_rows;
    }
    catch (err)
    {
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
 */
async function runUpdate(queryName, params = [])
{
    try
    {
        const res  = await fetch('api/update.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ query: queryName, params }),
        });
        const json = await res.json();

        if (json.error)
        {
            console.error('UPDATE error:', json.error);
            return -1;
        }

        return json.affected_rows;
    }
    catch (err)
    {
        console.error('UPDATE fetch failed:', err);
        return -1;
    }
}

function switchTable(btn, tableName)
{
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    runSelect(tableName, 'result-container');
}

switchTable(document.querySelector('.tab-btn'), 'customer');
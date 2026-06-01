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
    const row = JSON.parse(decodeURIComponent(escape(atob(rowDataB64))));
    const columns = Object.keys(row);
    const primaryId = row[columns[0]];

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
    modalDetails.style.display = 'block';
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

// ==== REPORTS ===========================================
 
// Subtitle descriptions for each report — shown below the report title when a tab is active.
const REPORT_DESCRIPTIONS = {
    'report_customer_order_history':   'Track customer purchases and payment references.',
    'report_order_item_breakdown':     'View each order with its product and supplier details.',
    'report_supplier_product_catalog': 'Browse all supplier products with stock and pricing.',
};

// Keeps track of which report is currently open, used as the title when printing/exporting.
let activeReportName = 'Customer Order History';

// Handles clicking a report tab.
// Marks the clicked tab as active, updates the title and subtitle on the page,
// then triggers the data fetch for that report.
function switchReport(btn, queryName, label) {
    // Deactivate all report tabs, then activate the clicked one
    document.querySelectorAll('#report-nav .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update the header title and subtitle
    activeReportName = label;
    document.getElementById('reportTitle').textContent    = label;
    document.getElementById('reportSubtitle').textContent = REPORT_DESCRIPTIONS[queryName] ?? '';

    loadReport(queryName);
}

// Fetches report data from the backend using the given query name.
// Shows a loading message while waiting, then passes the data to renderReportTable().
// If something goes wrong (server error or network failure), it shows an error message instead.
async function loadReport(queryName) {
    const container = document.getElementById('report-container');
    container.innerHTML = '<p class="loading-text">Loading report...</p>';

    try {
        const res  = await fetch(`api/select.php?query=${encodeURIComponent(queryName)}`);
        const json = await res.json();

        if (json.error) {
            container.innerHTML = `<p class="error-text">Error: ${escapeHtml(json.error)}</p>`;
            return;
        }

        renderReportTable(json.data, queryName);

    } catch (err) {
        container.innerHTML = `<p class="error-text">Fetch failed: ${escapeHtml(err.message)}</p>`;
    }
}

// Takes the fetched rows and puts them on the page.
// If there's no data, shows a "no results" message.
// Otherwise, grabs the column names and hands everything off to buildTableHTML().
function renderReportTable(rows) {
    const container = document.getElementById('report-container');

    if (!rows || rows.length === 0) {
        container.innerHTML = '<p>No data found for this report.</p>';
        return;
    }

    const columns = Object.keys(rows[0]);

    container.innerHTML = buildTableHTML(rows, columns);
}

// Builds the full table HTML string from the rows and column names.
// Handles status columns specially — wraps their values in a colored badge.
// Also adds a record count footer at the bottom (e.g. "24 records").
function buildTableHTML(rows, columns) {
    const isStatusColumn = col => col.toLowerCase().includes('status');

    const headerCells = columns
        .map(col => `<th>${escapeHtml(col)}</th>`)
        .join('');

    const bodyRows = rows.map(row => {
        const cells = columns.map(col => {
            const value = String(row[col] ?? '');
            const cell  = isStatusColumn(col) ? statusBadge(value) : escapeHtml(value);
            return `<td>${cell}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    const recordCount = rows.length;
    const recordLabel = `${recordCount} record${recordCount !== 1 ? 's' : ''}`;

    return `
        <div class="table-scroll">
            <table>
                <thead><tr>${headerCells}</tr></thead>
                <tbody>${bodyRows}</tbody>
            </table>
        </div>
        <p class="record-count">${recordLabel}</p>
    `;
}

/**
 * Exports the currently displayed report table as a PDF file.
 * Uses jsPDF for document creation and jsPDF-AutoTable for table rendering.
 * The filename is derived from the report title shown on screen.
 */
function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    const formattedDate = `${day}, ${date}`;

    //Header Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(document.getElementById('reportTitle').textContent, 14, 16);

    //Formatted Date as subtitle
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(formattedDate, 14, 23);

    //Table
    const table = document.querySelector('#report-container table');
    if (!table) {
        alert('No report table to export.');
        return;
    }

    doc.autoTable({
        html: table,
        startY: 28,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 }
    });

     // Convert the report title to a filename, replacing spaces with underscores
    const filename = document.getElementById('reportTitle').textContent.replace(/\s+/g, '_') + '.pdf';
    doc.save(filename);
}

// Switches between the Tables and Reports sections of the app.
// Shows the correct section, hides the other, and updates the nav button states.
// If the user is opening Reports for the first time (container is empty),
// it auto-clicks the first tab so they don't land on a blank page.
function showSection(section) {
    const isReports = section === 'reports';

    document.getElementById('section-tables').style.display  = isReports ? 'none'  : 'block';
    document.getElementById('section-reports').style.display = isReports ? 'block' : 'none';

    document.getElementById('navTables').classList.toggle('active', !isReports);
    document.getElementById('navReports').classList.toggle('active',  isReports);

   
    if (isReports) {
        const firstBtn      = document.querySelector('#report-nav .tab-btn');
        const containerEmpty = document.getElementById('report-container').innerHTML === '';
        if (firstBtn && containerEmpty) firstBtn.click();
    }
}
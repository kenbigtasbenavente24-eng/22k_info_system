// js/app.js

// Columns that come from JOINs — displayed in the edit form but not editable since they don't exist in the main table.
const TABLE_READONLY_COLS = {
    product: ['Supplier_Name'],   // comes from JOIN supplier
    orders:  ['Cust_Name'],       // comes from JOIN customer
};

// ==== LIVE TABLE SEARCH ====================================

const searchInput = document.getElementById('search-bar');

searchInput.addEventListener('input', (event) => {
    const searchFilter = event.target.value.toLowerCase().trim();
    // Target rows inside tbody specifically to protect the header row
    const tableRows = document.querySelectorAll('#table-body tr');

    tableRows.forEach((row) => {
        // Combine all column text within this specific row into one string
        const rowText = row.textContent.toLowerCase();

        // If the query matches any column value, show the row
        if (rowText.includes(searchFilter)) {
        row.classList.remove('is-hidden');
    } else {
        row.classList.add('is-hidden');
    }
  });
});

// ==== TABLE RENDERER ====================================

function renderTable(containerId, rows)
{
    const container = document.getElementById(containerId);

    if (!rows || rows.length === 0)
    {
        container.innerHTML = '<p>No results found.</p>';
        return;
    }

    const columns = Object.keys(rows[0]);

    let html = '<div class="table-scroll"><table>';

    // --- Header ---
    html += '<thead><tr>';
    columns.forEach(col => { html += `<th>${escapeHtml(col)}</th>`; });
    html += '<th>Options</th>';
    html += '</tr></thead>';

    // --- Body ---
    html += '<tbody id="table-body">';
    rows.forEach(row =>
    {
        html += '<tr>';
        columns.forEach(col =>
        {
            html += `<td>${escapeHtml(String(row[col] ?? ''))}</td>`;
        });

        // Encode row data as base64 so it's safe inside an HTML attribute
        const rowDataB64 = btoa(unescape(encodeURIComponent(JSON.stringify(row))));
        html += `<td><button onclick="ViewOptions('${rowDataB64}')">View</button></td>`;
        html += '</tr>';
    });
    html += '</tbody></table></div>';

    container.innerHTML = html;
}

// ==== VIEW / EDIT MODAL =================================

/**
 * Opens the modal in VIEW mode showing all fields of a row.
 * The Update button switches the modal to EDIT mode in-place.
 */
function ViewOptions(rowDataB64)
{
    const row     = JSON.parse(decodeURIComponent(escape(atob(rowDataB64))));
    const columns = Object.keys(row);
    const primaryId = row[columns[0]];  // first column is always the PK

    // Get the current table name from the active tab's data-query attribute
    const activeBtn    = document.querySelector('.tab-btn.active');
    const currentTable = activeBtn ? activeBtn.dataset.query : 'record';

    // --- Modal elements ---
    const modal        = document.getElementById('viewModal');
    const modalTitle   = document.getElementById('modalTitle');
    const modalDetails = document.getElementById('modalDetails');
    const btnUpdate    = document.getElementById('btnUpdate');
    const btnDelete    = document.getElementById('btnDelete');
    const btnClose     = document.getElementById('btnClose');

    // ---- Render the modal in VIEW mode ----
    showViewMode();

    function showViewMode()
    {
        // Title
        modalTitle.innerText = `Manage ${currentTable.toUpperCase()} (ID: ${primaryId})`;

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

        // Restore buttons to their original labels and visibility
        btnUpdate.textContent  = 'Update Record';
        btnDelete.textContent  = 'Delete Record';
        btnDelete.className    = 'modal-btn danger';
        btnDelete.style.display = '';

        modal.style.display = 'flex';

        // Update → switch to edit mode
        btnUpdate.onclick = function() { showEditMode(); };

        // Delete → run delete then close
        btnDelete.onclick = function()
        {
            modal.style.display = 'none';
            handleDelete(currentTable, primaryId);
        };

        // Close → just close
        btnClose.onclick = function() { modal.style.display = 'none'; };
    }

    function showEditMode()
    {
        const readonlyCols = TABLE_READONLY_COLS[currentTable] || [];
        console.log('currentTable:', currentTable);
        console.log('readonlyCols:', readonlyCols);   // should show ['Supplier_Name']
        console.log('columns:', columns);             // check exact column name casing

        modalTitle.innerText = `Edit ${currentTable.toUpperCase()} (ID: ${primaryId})`;

        let formHtml = '<div class="update-form">';
        columns.forEach((col, i) =>
        {
            const currentVal = escapeHtml(String(row[col] ?? ''));
            const isPK       = (i === 0);
            const isReadonly = isPK || readonlyCols.includes(col); // ← joined cols are readonly

            formHtml += `
                <div class="form-field">
                    <label for="edit-field-${i}">
                        ${escapeHtml(col)}${isPK ? ' <span class="pk-label">(ID — read only)</span>' : ''}
                        ${(!isPK && isReadonly) ? ' <span class="pk-label">(read only)</span>' : ''}
                    </label>
                    <input
                        id="edit-field-${i}"
                        type="text"
                        value="${currentVal}"
                        ${isReadonly ? 'readonly' : ''}
                    >
                </div>`;
        });
        formHtml += '</div>';
        modalDetails.innerHTML = formHtml;

        btnUpdate.textContent = 'Confirm Update';
        btnDelete.textContent = 'Cancel';
        btnDelete.className   = 'modal-btn cancel';

        btnUpdate.onclick = async function()
        {
            const params = [];
            columns.forEach((col, i) =>
            {
                if (i === 0) return;                    // skip PK
                if (readonlyCols.includes(col)) return; // skip joined/readonly cols
                params.push(document.getElementById(`edit-field-${i}`).value);
            });
            params.push(primaryId); // PK at the end for WHERE

            const queryName = `update_${currentTable}`;
            const affected  = await runUpdate(queryName, params);

            if (affected > 0)
                alert(`Updated ${affected} row(s) successfully.`);
            else
                alert('Update failed or no values were changed.');

            modal.style.display = 'none';
            runSelect(getActiveQueryName(), 'result-container');
        };

        btnDelete.onclick = function() { showViewMode(); };
        btnClose.onclick  = function() { modal.style.display = 'none'; };
    }
}


// ==== HELPERS ===========================================

function escapeHtml(str)
{
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getActiveQueryName()
{
    const activeBtn = document.querySelector('.tab-btn.active');
    return activeBtn ? activeBtn.dataset.query : 'customer';
}


// ==== API HELPERS =======================================

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

        if (json.error) { console.error('DELETE error:', json.error); return -1; }
        return json.affected_rows;
    }
    catch (err)
    {
        console.error('DELETE fetch failed:', err);
        return -1;
    }
}

async function runUpdate(queryName, params = [])
{
    try
    {
        const res  = await fetch('api/update.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ query: queryName, params }),
        });
        const text = await res.text(); // read raw text for debugging
        console.log('UPDATE response text:', text); // log raw response
        const json = text ? JSON.parse(text) : {}; // handle empty response gracefully

        if (json.error) { console.error('UPDATE error:', json.error); return -1; }
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
    document.getElementById('search-bar').value = ''; // ← clear live search
    runSelect(tableName, 'result-container');
}

switchTable(document.querySelector('.tab-btn'), 'customer');

// ==== REPORTS ===========================================
 
// Subtitle descriptions for each report, shown below the report title when a tab is active.
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
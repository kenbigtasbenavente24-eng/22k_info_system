// js/table.js
// Renders fetched rows into an HTML table and handles tab switching.
// Depends on: utils.js, api.js

// Builds and injects the full <table> HTML into the given container element.
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

        // Encode row data as base64 so it's safe inside an HTML attribute.
        const rowDataB64 = btoa(unescape(encodeURIComponent(JSON.stringify(row))));
        html += `<td><button onclick="ViewOptions('${rowDataB64}')">View</button></td>`;
        html += '</tr>';
    });
    html += '</tbody></table></div>';

    container.innerHTML = html;
}

// Marks the clicked tab as active, clears the search bar, and loads the selected table.
function switchTable(btn, tableName)
{
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('search-bar').value = '';
    runSelect(tableName, 'result-container');
}

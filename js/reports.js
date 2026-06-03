// js/reports.js
// Report tab switching, data loading, table rendering, PDF export,
// and the main section toggle between Tables and Reports.
// Depends on: utils.js, api.js

// Subtitle descriptions shown below the report title when a tab is active.
const REPORT_DESCRIPTIONS = {
    'report_customer_order_history':   'Track customer purchases and payment references.',
    'report_order_item_breakdown':     'View each order with its product and supplier details.',
    'report_supplier_product_catalog': 'Browse all supplier products with stock and pricing.',
};

// Tracks the active report label — used as the PDF title and filename.
let activeReportName = 'Customer Order History';

// Marks the clicked tab active, updates the page header, and fetches the report data.
function switchReport(btn, queryName, label)
{
    document.querySelectorAll('#report-nav .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    activeReportName = label;
    document.getElementById('reportTitle').textContent    = label;
    document.getElementById('reportSubtitle').textContent = REPORT_DESCRIPTIONS[queryName] ?? '';

    loadReport(queryName);
}

// Fetches report rows from the backend and hands them to renderReportTable().
async function loadReport(queryName)
{
    const container = document.getElementById('report-container');
    container.innerHTML = '<p class="loading-text">Loading report...</p>';

    try
    {
        const res  = await fetch(`api/select.php?query=${encodeURIComponent(queryName)}`);
        const json = await res.json();

        if (json.error)
        {
            container.innerHTML = `<p class="error-text">Error: ${escapeHtml(json.error)}</p>`;
            return;
        }

        renderReportTable(json.data);
    }
    catch (err)
    {
        container.innerHTML = `<p class="error-text">Fetch failed: ${escapeHtml(err.message)}</p>`;
    }
}

// Injects the report table HTML into the report container.
function renderReportTable(rows)
{
    const container = document.getElementById('report-container');

    if (!rows || rows.length === 0)
    {
        container.innerHTML = '<p>No data found for this report.</p>';
        return;
    }

    const columns = Object.keys(rows[0]);
    container.innerHTML = buildTableHTML(rows, columns);
}

// Builds the full table HTML string, including status badges and a record count footer.
function buildTableHTML(rows, columns)
{
    const isStatusColumn = col => col.toLowerCase().includes('status');

    const headerCells = columns
        .map(col => `<th>${escapeHtml(col)}</th>`)
        .join('');

    const bodyRows = rows.map(row =>
    {
        const cells = columns.map(col =>
        {
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

// Exports the currently visible report table as a formatted PDF.
function exportPDF()
{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const now  = new Date();
    const day  = now.toLocaleDateString('en-US', { weekday: 'long' });
    const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    const formattedDate = `${day}, ${date}`;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(document.getElementById('reportTitle').textContent, 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(formattedDate, 14, 23);

    const table = document.querySelector('#report-container table');
    if (!table)
    {
        alert('No report table to export.');
        return;
    }

    doc.autoTable({
        html:               table,
        startY:             28,
        styles:             { fontSize: 9, cellPadding: 4 },
        headStyles:         { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin:             { left: 14, right: 14 },
    });

    const filename = document.getElementById('reportTitle').textContent.replace(/\s+/g, '_') + '.pdf';
    doc.save(filename);
}

// Toggles between the Tables section and the Reports section.
// Auto-loads the first report tab if the container is still empty.
function showSection(section)
{
    const isReports = section === 'reports';

    document.getElementById('section-tables').style.display  = isReports ? 'none'  : 'block';
    document.getElementById('section-reports').style.display = isReports ? 'block' : 'none';

    document.getElementById('navTables').classList.toggle('active', !isReports);
    document.getElementById('navReports').classList.toggle('active',  isReports);

    if (isReports)
    {
        const firstBtn       = document.querySelector('#report-nav .tab-btn');
        const containerEmpty = document.getElementById('report-container').innerHTML === '';
        if (firstBtn && containerEmpty) firstBtn.click();
    }
}

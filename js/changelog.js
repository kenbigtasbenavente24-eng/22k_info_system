// js/changelog.js
// Handles rendering the Changelog section and logging actions.

// -------------------------------------------------------
// writeLog(table, recordId, action)
// Call this from modal.js wherever a change is made.
// -------------------------------------------------------
async function writeLog(table, recordId, action)
{
    try
    {
        await fetch('api/changelog.php',
        {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ table, record_id: recordId, action })
        });
    }
    catch (e) { console.error('Changelog write error:', e); }
}

// -------------------------------------------------------
// loadChangelog()
// Fetches all log entries and renders them into the page.
// -------------------------------------------------------
async function loadChangelog()
{
    const container = document.getElementById('changelog-container');
    const subtitle  = document.getElementById('changelogSubtitle');
    container.innerHTML = '<p style="color:#888; font-size:13px; padding:12px;">Loading...</p>';

    try
    {
        const res  = await fetch('api/changelog.php?action=fetch');
        const json = await res.json();

        if (!json.data || json.data.length === 0)
        {
            subtitle.textContent    = 'No changes recorded yet.';
            container.innerHTML     = '<p style="color:#94a3b8; font-size:13px; padding:12px; font-style:italic;">The changelog is empty.</p>';
            return;
        }

        subtitle.textContent = `${json.data.length} change${json.data.length !== 1 ? 's' : ''} recorded`;

        // Action → badge style map
        const badgeStyle = (action) =>
        {
            const a = action.toLowerCase();
            if (a.includes('added') || a.includes('inserted'))
                return 'background:#dcfce7; color:#166534; border:1px solid #86efac;';
            if (a.includes('deleted') || a.includes('removed'))
                return 'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;';
            if (a.includes('updated') || a.includes('modified'))
                return 'background:#fef3c7; color:#92400e; border:1px solid #fcd34d;';
            if (a.includes('payment'))
                return 'background:#ede9fe; color:#5b21b6; border:1px solid #c4b5fd;';
            return 'background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;';
        };

        const tableLabel = (t) => t.charAt(0).toUpperCase() + t.slice(1);

        let html = `
            <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:13px; font-family:system-ui,sans-serif;">
                <thead>
                    <tr style="background:#38414e; color:#fff;">
                        <th style="padding:10px 14px; text-align:left; font-weight:600; white-space:nowrap;">Log ID</th>
                        <th style="padding:10px 14px; text-align:left; font-weight:600; white-space:nowrap;">Modification Date</th>
                        <th style="padding:10px 14px; text-align:left; font-weight:600; white-space:nowrap;">Table</th>
                        <th style="padding:10px 14px; text-align:left; font-weight:600; white-space:nowrap;">Record ID</th>
                        <th style="padding:10px 14px; text-align:left; font-weight:600;">Summary</th>
                    </tr>
                </thead>
                <tbody>
        `;

        json.data.forEach((row, i) =>
        {
            const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
            html += `
                <tr style="background:${bg};">
                    <td style="padding:9px 14px; border-bottom:1px solid #f1f5f9; color:#94a3b8; font-size:11.5px;">#${escapeHtml(String(row.Log_ID))}</td>
                    <td style="padding:9px 14px; border-bottom:1px solid #f1f5f9; white-space:nowrap; color:#475569;">${escapeHtml(row.Log_Date)}</td>
                    <td style="padding:9px 14px; border-bottom:1px solid #f1f5f9;">
                        <span style="font-weight:600; color:#1e293b;">${escapeHtml(tableLabel(row.Log_Table))}</span>
                    </td>
                    <td style="padding:9px 14px; border-bottom:1px solid #f1f5f9; color:#334155; font-weight:500;">${escapeHtml(String(row.Log_RecordID))}</td>
                    <td style="padding:9px 14px; border-bottom:1px solid #f1f5f9;">
                        <span style="display:inline-block; padding:3px 10px; border-radius:999px; font-size:11.5px; font-weight:600; ${badgeStyle(row.Log_Action)}">
                            ${escapeHtml(row.Log_Action)}
                        </span>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }
    catch (e)
    {
        container.innerHTML = `<p style="color:#c0392b; font-size:13px; padding:12px;">Failed to load changelog: ${escapeHtml(e.message)}</p>`;
    }
}

// -------------------------------------------------------
// exportChangelogPDF()
// -------------------------------------------------------
function exportChangelogPDF()
{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.text('22K Information System — Changelog', 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 22);

    const table = document.querySelector('#changelog-container table');
    if (!table) { alert('No changelog data to export.'); return; }

    doc.autoTable({
        html:        table,
        startY:      28,
        styles:      { fontSize: 8, cellPadding: 3 },
        headStyles:  { fillColor: [56, 65, 78], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 4: { cellWidth: 80 } }
    });

    doc.save('changelog.pdf');
}
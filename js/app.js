// js/app.js
// Entry point — runs after all other scripts have loaded.
// Kicks off the initial table load so the page isn't blank on first visit.

// Toggles between the Tables section and the Reports section.
// Auto-loads the first report tab if the container is still empty.
function showSection(section)
{
    // Hide all sections
    document.getElementById('section-tables').style.display    = 'none';
    document.getElementById('section-reports').style.display   = 'none';
    document.getElementById('section-changelog').style.display = 'none';

    // Deactivate all nav buttons
    document.querySelectorAll('.site-nav-btn').forEach(b => b.classList.remove('active'));

    if (section === 'tables')
    {
        document.getElementById('section-tables').style.display = 'block';
        document.getElementById('navTables').classList.add('active');
    }
    else if (section === 'reports')
    {
        document.getElementById('section-reports').style.display = 'block';
        document.getElementById('navReports').classList.add('active');

        // Trigger whichever report tab is currently active
        const activeReportBtn = document.querySelector('#report-nav .tab-btn.active');
        if (activeReportBtn)
        {
            const reportQuery = activeReportBtn.dataset.report;
            const reportTitle = activeReportBtn.textContent.trim();
            switchReport(activeReportBtn, reportQuery, reportTitle);
        }
    }
    else if (section === 'changelog')
    {
        document.getElementById('section-changelog').style.display = 'block';
        document.getElementById('navChangelog').classList.add('active');
        loadChangelog();
    }
}

// Initial page load — populate the default table and pre-load the default report
switchTable(document.querySelector('.tab-btn'), 'customer');
switchReport(
    document.querySelector('[data-report="report_customer_order_history"]'),
    'report_customer_order_history',
    'Customer Order History'
);
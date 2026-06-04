// js/api.js
// All fetch calls to the PHP backend (select, insert, update, delete).
// Depends on: utils.js

// Fetches rows for the given query and renders them into the given container.
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

// Calls runDelete then refreshes the active table.
async function handleDelete(tableName, primaryId)
{
    const queryName = `delete_${tableName}`;
    const affected  = await runDelete(queryName, [primaryId]);

    if (affected >= 0) {
        alert(`Deleted ${affected} row(s).`);
        // After confirmed delete:
        writeLog(currentTable, primaryId, `Record deleted from ${currentTable}`);
    }
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
        const text = await res.text();
        console.log('UPDATE response text:', text);
        const json = text ? JSON.parse(text) : {};

        if (json.error) { console.error('UPDATE error:', json.error); return -1; }
        return json.affected_rows;
    }
    catch (err)
    {
        console.error('UPDATE fetch failed:', err);
        return -1;
    }
}

async function runInsert(queryName, params = [])
{
    try
    {
        const res  = await fetch('api/insert.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ query: queryName, params }),
        });
        const text = await res.text();
        console.log('INSERT response text:', text);
        const json = text ? JSON.parse(text) : {};

        if (json.error) { console.error('INSERT error:', json.error); return null; }
        return json;
    }
    catch (err)
    {
        console.error('INSERT fetch failed:', err);
        return null;
    }
}

// js/modal.js
// All modal behaviour: view, edit, and add (insert) modes.
// Depends on: utils.js, api.js

// -------------------------------------------------------
// Columns that come from JOINs — shown in the edit form
// but excluded from UPDATE params since they're not real
// columns on the base table.
// -------------------------------------------------------
const TABLE_READONLY_COLS = {
    product:       ['Supplier_Name'],
    orders:        ['Cust_Name', 'Pay_ID'],
    deliverystock: ['Prod_Name', 'Prod_Price'],
};

// Readonly columns for the related records (orderdetails) edit form.
// Prod_Name is a JOIN column; Total_Price is computed — neither exists on orderdetails.
const RELATED_READONLY_COLS = ['Prod_Name', 'Total_Price'];

// -------------------------------------------------------
// Field definitions for the Add modal.
// Each entry maps to one ? placeholder in INSERT_QUERIES.
// -------------------------------------------------------
const TABLE_INSERT_FIELDS = {
    customer: [
        { label: 'Customer Name',  key: 'Cust_Name',     type: 'text'   },
        { label: 'Address',        key: 'Cust_Address',  type: 'text'   },
        { label: 'Phone Number',   key: 'Cust_PhoneNum', type: 'text'   },
    ],
    product: [
        { label: 'Product Name',   key: 'Prod_Name',     type: 'text'   },
        { label: 'Stock',          key: 'Prod_Stock',    type: 'number' },
        { label: 'Price',          key: 'Prod_Price',    type: 'number' },
        { label: 'Supplier ID',    key: 'Supply_ID',     type: 'number' },
    ],
    supplier: [
        { label: 'Supplier Name',  key: 'Supply_Name',     type: 'text' },
        { label: 'Phone Number',   key: 'Supply_PhoneNum', type: 'text' },
        { label: 'City',           key: 'Supply_City',     type: 'text' },
        { label: 'State',          key: 'Supply_State',    type: 'text' },
        { label: 'Zip Code',       key: 'Supply_ZipCode',  type: 'text' },
    ],
    orders: [
        { label: 'Order Date',     key: 'Order_Date',    type: 'date'   },
        { label: 'Customer ID',    key: 'Cust_ID',       type: 'number' },
    ],
    payment: [
        { label: 'Order ID',       key: 'Order_ID',      type: 'number' },
        { label: 'Payment Method', key: 'Pay_Method',    type: 'text'   },
        { label: 'Amount',         key: 'Pay_Amount',    type: 'number' },
    ],
    deliverystock: [
        { label: 'Product ID',     key: 'Prod_ID',       type: 'number' },
        { label: 'Delivery Date',  key: 'DStock_Date',   type: 'date'   },
        { label: 'Stock Quantity', key: 'DStock_Stock',  type: 'number' },
    ],
};

// Tables that get the "View Related Records" button in view mode.
const TABLES_WITH_RELATED = ['orders', 'purchase'];


// ==== VIEW / EDIT MODAL =================================

/**
 * Opens the modal in VIEW mode showing all fields of a row.
 * The Update button switches the modal to EDIT mode in-place.
 */
function ViewOptions(rowDataB64)
{
    const row       = JSON.parse(decodeURIComponent(escape(atob(rowDataB64))));
    const columns   = Object.keys(row);
    const primaryId = row[columns[0]];  // first column is always the PK

    const activeBtn    = document.querySelector('.tab-btn.active');
    const currentTable = activeBtn ? activeBtn.dataset.query : 'record';

    const modal        = document.getElementById('viewModal');
    const modalTitle   = document.getElementById('modalTitle');
    const modalDetails = document.getElementById('modalDetails');
    const btnsModal    = document.querySelector('.modal-buttons');

    const hasRelated = TABLES_WITH_RELATED.includes(currentTable);

    showViewMode();

    // ---- VIEW MODE ----
    // Always redraws btnsModal.innerHTML so buttons are fresh, live DOM nodes.
    // This is what prevents the stale-reference bug when returning from edit mode.
    function showViewMode()
    {
        modalTitle.innerText = `Manage ${currentTable.toUpperCase()} (ID: ${primaryId})`;

        let detailsText = '';
        columns.forEach(col =>
        {
            detailsText += `<strong>${escapeHtml(col)}:</strong> ${escapeHtml(String(row[col] ?? ''))}\n`;
        });

        modalDetails.style.display = 'block';
        modalDetails.innerHTML     = detailsText;
        modal.style.display        = 'flex';

        // Reset modal width in case it was expanded for the related records table.
        document.querySelector('#viewModal .modal-content').style.maxWidth = '450px';

        // Render the correct button set for this table.
        // Orders/purchase get an extra "View Related Records" button.
        if (hasRelated)
        {
            btnsModal.innerHTML = `
                <button id="btnViewRelated" class="modal-btn info">View Related Records</button>
                <button id="btnUpdate"      class="modal-btn warning">Update Record</button>
                <button id="btnDelete"      class="modal-btn danger">Delete Record</button>
                <button id="btnClose"       class="modal-btn cancel">Close</button>
            `;
            document.getElementById('btnViewRelated').onclick = function ()
            {
                showRelatedRecords(currentTable, primaryId);
            };
        }
        else
        {
            btnsModal.innerHTML = `
                <button id="btnUpdate" class="modal-btn warning">Update Record</button>
                <button id="btnDelete" class="modal-btn danger">Delete Record</button>
                <button id="btnClose"  class="modal-btn cancel">Close</button>
            `;
        }

        // Wire up buttons after innerHTML is set so they're guaranteed to exist.
        document.getElementById('btnUpdate').onclick = function () { showEditMode(); };
        document.getElementById('btnDelete').onclick = function ()
        {
            modal.style.display = 'none';
            handleDelete(currentTable, primaryId);
        };
        document.getElementById('btnClose').onclick = function () { modal.style.display = 'none'; };
    }

    // ---- EDIT MODE ----
    function showEditMode()
    {
        const readonlyCols = TABLE_READONLY_COLS[currentTable] || [];

        modalTitle.innerText = `Edit ${currentTable.toUpperCase()} (ID: ${primaryId})`;

        let formHtml = '<div class="update-form">';
        columns.forEach((col, i) =>
        {
            const currentVal = escapeHtml(String(row[col] ?? ''));
            const isPK       = (i === 0);
            const isReadonly = isPK || readonlyCols.includes(col);

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

        // Redraw buttons for edit mode — "Cancel" goes back to view mode, not close.
        btnsModal.innerHTML = `
            <button id="btnUpdate" class="modal-btn warning">Confirm Update</button>
            <button id="btnDelete" class="modal-btn cancel">Cancel</button>
            <button id="btnClose"  class="modal-btn cancel">Close</button>
        `;

        document.getElementById('btnUpdate').onclick = async function ()
        {
            const params = [];
            columns.forEach((col, i) =>
            {
                if (i === 0) return;
                if (readonlyCols.includes(col)) return;
                params.push(document.getElementById(`edit-field-${i}`).value);
            });
            params.push(primaryId);

            const affected = await runUpdate(`update_${currentTable}`, params);

            if (affected > 0)
                alert(`Updated ${affected} row(s) successfully.`);
            else
                alert('Update failed or no values were changed.');

            modal.style.display = 'none';
            runSelect(getActiveQueryName(), 'result-container');
        };

        // Cancel -> return to view mode (not close), so the user can still delete etc.
        document.getElementById('btnDelete').onclick = function () { showViewMode(); };
        document.getElementById('btnClose').onclick  = function () { modal.style.display = 'none'; };
    }

    // ---- RELATED RECORDS MODE ----
    async function showRelatedRecords(tableName, id)
    {
        modalTitle.innerText   = `Records List — ${tableName.toUpperCase()} ID: ${id}`;
        modalDetails.innerHTML = '<p style="color:#888;font-size:13px;padding:15px;">Loading...</p>';

        // Set up bounded sticky layout frame to avoid off-screen pushing
        const modalContent = document.querySelector('#viewModal .modal-content');
        modalContent.style.maxWidth  = '800px';
        modalContent.style.width     = '95%';
        modalContent.style.maxHeight = '85vh';
        modalContent.style.display   = 'flex';
        modalContent.style.flexDirection = 'column';

        modalDetails.style.overflowY = 'auto';
        modalDetails.style.flex      = '1';
        modalDetails.style.margin    = '0';
        modalDetails.style.padding   = '0 5px';

        btnsModal.innerHTML = `
            <button id="btnBack"  class="modal-btn warning">Back</button>
            <button id="btnClose" class="modal-btn cancel">Close</button>
        `;
        document.getElementById('btnBack').onclick  = function () { showViewMode(); };
        document.getElementById('btnClose').onclick = function ()
        {
            modalContent.style.maxWidth  = '450px';
            modalContent.style.maxHeight = '';
            modal.style.display          = 'none';
        };

        try
        {
            // Fetch both datasets concurrently
            const [resItems, resPay] = await Promise.all([
                fetch(`api/select.php?query=list_by_order&id=${encodeURIComponent(id)}`),
                fetch(`api/select.php?query=payment_by_order&id=${encodeURIComponent(id)}`)
            ]);

            const jsonItems = await resItems.json();
            const jsonPay   = await resPay.json();

            const itemsData   = jsonItems.data || [];
            const paymentData = jsonPay.data || [];

            renderRelatedScreen(itemsData, paymentData, id);
        }
        catch (err)
        {
            modalDetails.innerHTML = `<p style="color:#c0392b;font-size:13px;padding:15px;">Fetch failed: ${escapeHtml(err.message)}</p>`;
        }
    }

    // High-density screen renderer that evaluates math for payment states
    function renderRelatedScreen(itemsData, paymentData, orderId)
    {
        let html = '';
        
        // 1. Compute Totals 
        const totalOrderCost = itemsData.reduce((sum, item) => sum + parseFloat(item.Total_Price || 0), 0);
        const totalPaid      = paymentData.reduce((sum, p) => sum + parseFloat(p.Pay_Amount || 0), 0);
        const hasPayment     = paymentData.length > 0;

        // 2. Determine Smart Financial Status Badge
        let statusBadge = '';
        if (totalPaid === 0) {
            statusBadge = `<span style="background:#fee2e2; color:#b91c1c; padding:2px 8px; border-radius:12px; font-weight:600; font-size:11px;">Unpaid</span>`;
        } else if (totalPaid < totalOrderCost) {
            statusBadge = `<span style="background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:12px; font-weight:600; font-size:11px;">Partially Paid</span>`;
        } else {
            statusBadge = `<span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:12px; font-weight:600; font-size:11px;">Fully Paid</span>`;
        }

        // --- SECTION A: COMPACT PAYMENT DASHBOARD ---
        html += `
        <div style="margin: 10px 0 15px 0; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 15px;">
            <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin: 0;">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #1e293b; margin: 0;">
                    <i class="fa-solid fa-credit-card" style="color:#64748b;"></i>
                    <strong>Payment:</strong> ${statusBadge}
                </div>`;

        if (hasPayment) {
            const pay = paymentData[0];
            html += `
                <span style="font-size:12.5px; color:#475569; margin: 0;"><strong>Ref:</strong> #${escapeHtml(String(pay.Pay_ID))}</span>
                <span style="font-size:12.5px; color:#475569; margin: 0;"><strong>Method:</strong> ${escapeHtml(String(pay.Pay_Method))}</span>
                <span style="font-size:12.5px; color:#475569; margin: 0;"><strong>Paid:</strong> <strong style="color:#1e293b;">₱${Number(totalPaid).toFixed(2)}</strong></span>`;
        }

        html += `
            </div>
            <div>
                ${hasPayment 
                    ? `<button id="btnEditPayment" style="height:26px; padding:0 10px; background:#fff; border:1px solid #cbd5e1; border-radius:6px; font-size:11.5px; color:#334155; font-weight:500; cursor:pointer; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-pen" style="font-size:10px;"></i> Edit</button>`
                    : `<button id="btnAddPayment" style="height:26px; padding:0 10px; background:#16a34a; border:none; border-radius:6px; font-size:11.5px; color:#fff; font-weight:500; cursor:pointer; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-plus"></i> Record Payment</button>`
                }
            </div>
        </div>`;

        // --- SECTION B: ITEMS BREAKDOWN TABLE ---
        html += `
        <div style="display:flex; align-items:center; margin-bottom:6px; padding:0 2px;">
            <h4 style="margin:0; font-size:13px; color:#334155; font-weight:600;"><i class="fa-solid fa-box" style="color:#64748b; margin-right:4px;"></i> Order Items Breakdown</h4>
        </div>`;
        
        if (itemsData.length === 0) {
            html += '<p style="color:#64748b; font-size:12.5px; padding:20px; text-align:center; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px;">No dynamic items attached to this order.</p>';
        } else {
            const cols = Object.keys(itemsData[0]);
            html += '<div style="overflow-x:auto; border:1px solid #e2e8f0; border-radius:6px 6px 0 0; background:#fff;"><table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left; min-width:600px;">';
            html += '<thead><tr style="background:#f1f5f9; border-bottom:1px solid #e2e8f0;">';
            cols.forEach(col => {
                html += `<th style="padding:8px 12px; color:#475569; font-weight:600; text-transform:capitalize;">${escapeHtml(col.replace('_',' '))}</th>`;
            });
            html += '<th style="padding:8px 12px; color:#475569; font-weight:600; text-align:center;">Options</th>';
            html += '</tr></thead><tbody>';

            itemsData.forEach((detailRow, ri) => {
                const borderStyle = ri === itemsData.length - 1 ? '' : 'border-bottom: 1px solid #f1f5f9;';
                const rowDataB64 = btoa(unescape(encodeURIComponent(JSON.stringify(detailRow))));
                html += `<tr>`;
                cols.forEach(col => {
                    let val = String(detailRow[col] ?? '');
                    if(col.toLowerCase().includes('price') || col.toLowerCase().includes('total')) {
                        val = '₱' + Number(val).toFixed(2);
                    }
                    html += `<td style="padding:8px 12px; color:#334155; ${borderStyle}">${escapeHtml(val)}</td>`;
                });
                html += `<td style="padding:8px 12px; text-align:center; ${borderStyle}">
                    <button onclick="handleRelatedEdit('${rowDataB64}', ${orderId})" style="height:22px; padding:0 8px; background:#fff; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; color:#475569; cursor:pointer;">Modify</button>
                </td></tr>`;
            });
            html += '</tbody></table></div>';

            // --- NEW FEATURE: TOTAL ORDER COST FOOTER DASHBAR ---
            html += `
            <div style="display:flex; justify-content:flex-end; padding:10px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 6px 6px; font-size:13px; margin-bottom:15px;">
                <div style="text-align:right;">
                    <span style="color:#64748b; font-weight:500; margin-right:8px;">Total Order Cost:</span>
                    <strong style="font-size:15px; color:#0f172a; font-family:monospace;">₱${totalOrderCost.toFixed(2)}</strong>
                </div>
            </div>`;
        }

        modalDetails.innerHTML = html;

        // Interactive bindings for payment adjustments
        if (hasPayment) {
            document.getElementById('btnEditPayment').onclick = function () {
                showPaymentForm(paymentData[0], orderId, true);
            };
        } else {
            document.getElementById('btnAddPayment').onclick = function () {
                showPaymentForm({ Order_ID: orderId }, orderId, false);
            };
        }
    }

    // High density payment input form sub-state
    function showPaymentForm(paymentRow, orderId, isEdit)
    {
        modalTitle.innerText = isEdit ? `Modify Payment (Order #${orderId})` : `Record Payment (Order #${orderId})`;

        modalDetails.innerHTML = `
            <div class="update-form" style="padding:5px 2px;">
                <div class="form-field" style="margin-bottom:12px;">
                    <label style="font-size:12px; font-weight:500; color:#475569; margin-bottom:4px; display:block;">Payment Method</label>
                    <input id="pay-method" type="text" value="${escapeHtml(paymentRow.Pay_Method ?? '')}" placeholder="e.g., Cash, GCash, Bank Transfer" style="width:100%; height:32px; padding:0 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;">
                </div>
                <div class="form-field" style="margin-bottom:5px;">
                    <label style="font-size:12px; font-weight:500; color:#475569; margin-bottom:4px; display:block;">Amount Remitted (₱)</label>
                    <input id="pay-amount" type="number" step="any" min="0" value="${escapeHtml(String(paymentRow.Pay_Amount ?? ''))}" placeholder="0.00" style="width:100%; height:32px; padding:0 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;">
                </div>
            </div>`;

        btnsModal.innerHTML = `
            <button id="btnPayConfirm" class="modal-btn warning">Save Record</button>
            <button id="btnPayCancel"  class="modal-btn cancel">Cancel</button>
        `;

        document.getElementById('btnPayCancel').onclick = function () {
            showRelatedRecords('orders', orderId);
        };

        document.getElementById('btnPayConfirm').onclick = async function ()
        {
            const method = document.getElementById('pay-method').value.trim();
            const amount = document.getElementById('pay-amount').value.trim();

            if (!method || !amount) {
                alert('Please complete all form entries.');
                return;
            }

            let affected = 0;
            if (isEdit) {
                affected = await runUpdate('update_payment', [orderId, method, parseFloat(amount), paymentRow.Pay_ID]);
            } else {
                const result = await runInsert('insert_payment', [orderId, method, parseFloat(amount)]);
                affected = result && result.affected_rows > 0 ? result.affected_rows : 0;
            }

            if (affected > 0) alert('Payment ledger successfully adjusted.');
            showRelatedRecords('orders', orderId);
            runSelect(getActiveQueryName(), 'result-container');
        };
    }
    
    // Handles writing the input form for payment additions/mutations
    function showPaymentForm(paymentRow, orderId, isEdit)
    {
        modalTitle.innerText = isEdit ? `Modify Payment (Order ID: ${orderId})` : `Add Payment Row (Order ID: ${orderId})`;

        modalDetails.innerHTML = `
            <div class="update-form">
                <div class="form-field">
                    <label for="pay-method">Payment Method</label>
                    <input id="pay-method" type="text" value="${escapeHtml(paymentRow.Pay_Method ?? '')}" placeholder="e.g., Cash, GCash, Bank Transfer">
                </div>
                <div class="form-field">
                    <label for="pay-amount">Amount Handled</label>
                    <input id="pay-amount" type="number" step="any" min="0" value="${escapeHtml(String(paymentRow.Pay_Amount ?? ''))}" placeholder="0.00">
                </div>
            </div>`;

        btnsModal.innerHTML = `
            <button id="btnPayConfirm" class="modal-btn warning">Confirm Details</button>
            <button id="btnPayCancel"  class="modal-btn cancel">Cancel</button>
        `;

        document.getElementById('btnPayCancel').onclick = function () {
            showRelatedRecords('orders', orderId);
        };

        document.getElementById('btnPayConfirm').onclick = async function ()
        {
            const method = document.getElementById('pay-method').value.trim();
            const amount = document.getElementById('pay-amount').value.trim();

            if (!method || !amount) {
                alert('All payment inputs are required.');
                return;
            }

            let affected = 0;
            if (isEdit) {
                // update_payment signature requirements: Order_ID, Pay_Method, Pay_Amount, WHERE Pay_ID
                const params = [orderId, method, parseFloat(amount), paymentRow.Pay_ID];
                affected = await runUpdate('update_payment', params);
            } else {
                // insert_payment signature requirements: Order_ID, Pay_Method, Pay_Amount
                const params = [orderId, method, parseFloat(amount)];
                const result = await runInsert('insert_payment', params);
                affected = result && result.affected_rows > 0 ? result.affected_rows : 0;
            }

            if (affected > 0) {
                alert(isEdit ? 'Payment values modified successfully.' : 'Payment row created successfully.');
            } else {
                alert('Save failed or no operational modifications were processed.');
            }

            // Sync and refresh everything
            showRelatedRecords('orders', orderId);
            runSelect(getActiveQueryName(), 'result-container');
        };
    }

    // Builds the related records table with an Edit button on each row.
    // Separated from showRelatedRecords() so it can be called again after a successful update.
    function renderRelatedTable(data, orderId)
    {
        const cols = Object.keys(data[0]);

        let tableHtml = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;">';

        // Header — columns + an Options column for the Edit button
        tableHtml += '<thead><tr>';
        cols.forEach(col =>
        {
            tableHtml += `<th style="padding:6px 10px;background:#38414e;color:#fff;text-align:left;">${escapeHtml(col)}</th>`;
        });
        tableHtml += '<th style="padding:6px 10px;background:#38414e;color:#fff;text-align:left;">Options</th>';
        tableHtml += '</tr></thead><tbody>';

        // Body — one row per order detail, with an Edit button carrying the row data
        data.forEach((detailRow, ri) =>
        {
            const bg         = ri % 2 === 0 ? '#fff' : '#f8fafc';
            const rowDataB64 = btoa(unescape(encodeURIComponent(JSON.stringify(detailRow))));

            tableHtml += `<tr style="background:${bg}">`;
            cols.forEach(col =>
            {
                tableHtml += `<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;">${escapeHtml(String(detailRow[col] ?? ''))}</td>`;
            });
            tableHtml += `<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;">
                <button
                    onclick="handleRelatedEdit('${rowDataB64}', ${orderId})"
                    style="height:26px;padding:0 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-size:11.5px;color:#475569;cursor:pointer;">
                    Edit
                </button>
            </td>`;
            tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table></div>';
        modalDetails.innerHTML = tableHtml;
    }

    // ---- RELATED RECORDS EDIT MODE ----
    // Called by the Edit button on a related record row.
    // detailRowB64 carries the full row data; orderId is used to refresh the list on save.
    function showRelatedEditMode(detailRow, orderId)
    {
        const detailCols  = Object.keys(detailRow);
        const detailPK    = detailRow[detailCols[0]]; // OrDet_ID — first column from list_by_order

        modalTitle.innerText = `Edit Order Detail (ID: ${detailPK})`;

        let formHtml = '<div class="update-form">';
        detailCols.forEach((col, i) =>
        {
            const currentVal = escapeHtml(String(detailRow[col] ?? ''));
            const isPK       = (i === 0);
            const isReadonly = isPK || RELATED_READONLY_COLS.includes(col);

            formHtml += `
                <div class="form-field">
                    <label for="rel-field-${i}">
                        ${escapeHtml(col)}${isPK ? ' <span class="pk-label">(ID — read only)</span>' : ''}
                        ${(!isPK && isReadonly) ? ' <span class="pk-label">(read only)</span>' : ''}
                    </label>
                    <input
                        id="rel-field-${i}"
                        type="text"
                        value="${currentVal}"
                        ${isReadonly ? 'readonly' : ''}
                    >
                </div>`;
        });
        formHtml += '</div>';
        modalDetails.innerHTML = formHtml;

        btnsModal.innerHTML = `
            <button id="btnRelConfirm" class="modal-btn warning">Confirm Update</button>
            <button id="btnRelCancel" class="modal-btn cancel">Cancel</button>
            <button id="btnClose"     class="modal-btn cancel">Close</button>
        `;

        document.getElementById('btnRelConfirm').onclick = async function ()
        {
            const params = [];
            detailCols.forEach((col, i) =>
            {
                if (i === 0) return;                          
                if (RELATED_READONLY_COLS.includes(col)) return; 
                params.push(document.getElementById(`rel-field-${i}`).value);
            });
            params.push(detailPK); 

            const affected = await runUpdate('update_orderdetail', params);

            if (affected > 0) alert('Order detail updated successfully.');
            
            // Clean routing directly back to our layout engine
            showRelatedRecords('orders', orderId);
        };

        document.getElementById('btnRelCancel').onclick = function ()
        {
            showRelatedRecords('orders', orderId);
        };

        document.getElementById('btnClose').onclick = function ()
        {
            document.querySelector('#viewModal .modal-content').style.maxWidth = '450px';
            modal.style.display = 'none';
        };
    }

    // Exposed as a global so the inline onclick on the Edit button can reach it.
    // Decodes the row data and delegates to showRelatedEditMode().
    window.handleRelatedEdit = function (rowDataB64, orderId)
    {
        const detailRow = JSON.parse(decodeURIComponent(escape(atob(rowDataB64))));
        showRelatedEditMode(detailRow, orderId);
    };
}


// ==== ADD / INSERT MODAL ================================

/**
 * Opens the shared viewModal in ADD mode with a blank form
 * for the currently active table.
 */
function showAddModal()
{
    const activeBtn    = document.querySelector('.tab-btn.active');
    const currentTable = activeBtn ? activeBtn.dataset.query : 'customer';
    const fields       = TABLE_INSERT_FIELDS[currentTable];

    if (!fields)
    {
        alert(`No insert form defined for table: ${currentTable}`);
        return;
    }

    const modal        = document.getElementById('viewModal');
    const modalTitle   = document.getElementById('modalTitle');
    const modalDetails = document.getElementById('modalDetails');
    const btnsModal    = document.querySelector('.modal-buttons');

    modalTitle.innerText = `Add New ${currentTable.toUpperCase()} Record`;

    let formHtml = '<div class="update-form">';
    fields.forEach((field, i) =>
    {
        formHtml += `
            <div class="form-field">
                <label for="add-field-${i}">${escapeHtml(field.label)}</label>
                <input
                    id="add-field-${i}"
                    type="${field.type}"
                    placeholder="${escapeHtml(field.label)}"
                    ${field.type === 'number' ? 'min="0" step="any"' : ''}
                >
            </div>`;
    });
    formHtml += '</div>';

    modalDetails.style.display = 'block';
    modalDetails.innerHTML     = formHtml;

    // Redraw buttons for add mode — consistent with the same pattern used in ViewOptions.
    btnsModal.innerHTML = `
        <button id="btnUpdate" class="modal-btn confirm-add">Confirm Add</button>
        <button id="btnDelete" class="modal-btn cancel">Cancel</button>
        <button id="btnClose"  class="modal-btn cancel">Close</button>
    `;

    modal.style.display = 'flex';

    document.getElementById('btnUpdate').onclick = async function ()
    {
        const params = fields.map((field, i) =>
        {
            const input = document.getElementById(`add-field-${i}`);
            return input ? input.value.trim() : '';
        });

        const emptyField = fields.find((_, i) => params[i] === '');
        if (emptyField)
        {
            alert(`Please fill in: ${emptyField.label}`);
            return;
        }

        const result = await runInsert(`insert_${currentTable}`, params);

        if (result && result.affected_rows > 0)
        {
            alert(`Record added successfully (ID: ${result.insert_id}).`);
            modal.style.display = 'none';
            runSelect(getActiveQueryName(), 'result-container');
        }
        else
        {
            alert('Insert failed. Please check your values and try again.');
        }
    };

    document.getElementById('btnDelete').onclick = function () { modal.style.display = 'none'; };
    document.getElementById('btnClose').onclick  = function () { modal.style.display = 'none'; };
}
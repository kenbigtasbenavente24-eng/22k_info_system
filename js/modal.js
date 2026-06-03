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
const RELATED_READONLY_COLS = ['Prod_Name', 'Total_Price'];

// -------------------------------------------------------
// Field definitions for the Add modal.
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
    purchase: [
        { label: 'Purchase Date',  key: 'Pur_Date',      type: 'date'   },
        { label: 'Supplier ID',    key: 'Supply_ID',     type: 'number' },
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

function ViewOptions(rowDataB64)
{
    const row       = JSON.parse(decodeURIComponent(escape(atob(rowDataB64))));
    const columns   = Object.keys(row);
    const primaryId = row[columns[0]];

    const activeBtn    = document.querySelector('.tab-btn.active');
    const currentTable = activeBtn ? activeBtn.dataset.query : 'record';

    const modal        = document.getElementById('viewModal');
    const modalTitle   = document.getElementById('modalTitle');
    const modalDetails = document.getElementById('modalDetails');
    const subActions   = document.getElementById('modalSubActions');
    const btnsModal    = document.querySelector('.modal-buttons');

    const hasRelated = TABLES_WITH_RELATED.includes(currentTable);

    showViewMode();

    // ---- VIEW MODE ----
    async function showViewMode()
    {
        modalTitle.innerText = `Manage ${currentTable.toUpperCase()} (ID: ${primaryId})`;

        let formHtml = '<div style="display: flex; flex-direction: column; gap: 10px; padding: 6px 0; font-size: 14.5px; color: #1e293b; font-family: system-ui, sans-serif;">';
        columns.forEach(col =>
        {
            formHtml += `
                <div style="line-height: 1.5; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                    <strong style="color: #475569;">${escapeHtml(col)}:</strong> 
                    <span style="color: #0f172a; margin-left: 4px;">${escapeHtml(String(row[col] ?? ''))}</span>
                </div>`;
        });
        
        // Placeholder container for asynchronous totals and payment extensions
        formHtml += `<div id="dynamicModalExtensions"></div>`;
        formHtml += '</div>';

        modalDetails.style.display = 'block';
        modalDetails.innerHTML     = formHtml;
        modal.style.display        = 'flex';

        document.querySelector('#viewModal .modal-content').style.maxWidth = '450px';

        if (hasRelated)
        {
            subActions.innerHTML = `
                <button id="btnViewRelated" class="modal-btn info" style="width: 100%; margin: 0; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 6px; height: 38px; font-weight: 600;">
                    <i class="fa-solid fa-list-ol"></i> View Related Records
                </button>
            `;
            subActions.style.display = 'block';
            document.getElementById('btnViewRelated').onclick = function () {
                showRelatedRecords(currentTable, primaryId);
            };
        }
        else
        {
            subActions.innerHTML = '';
            subActions.style.display = 'none';
        }

        btnsModal.innerHTML = `
            <button id="btnUpdate" class="modal-btn warning">Update Record</button>
            <button id="btnDelete" class="modal-btn danger">Delete Record</button>
            <button id="btnClose"  class="modal-btn cancel">Close</button>
        `;

        document.getElementById('btnUpdate').onclick = function () { showEditMode(); };
        document.getElementById('btnDelete').onclick = function ()
        {
            modal.style.display = 'none';
            subActions.style.display = 'none';
            handleDelete(currentTable, primaryId);
        };
        document.getElementById('btnClose').onclick = function () { 
            modal.style.display = 'none'; 
            subActions.style.display = 'none';
        };

        // Asynchronously compile totals and lookup active payment information
        await loadModalExtensions();
    }

    // ---- EXTENSION MANAGER: TOTAL AMOUNT & PAYMENTS ----
    async function loadModalExtensions()
    {
        const extContainer = document.getElementById('dynamicModalExtensions');
        if (!extContainer) return;

        let extensionsHtml = '';

        // 1. Calculate & Append Total Breakdown Amounts
        if (currentTable === 'orders' || currentTable === 'purchase')
        {
            const queryName = currentTable === 'orders' ? 'list_by_order' : 'list_by_purchase';
            try
            {
                const res = await fetch(`api/select.php?query=${queryName}&id=${encodeURIComponent(primaryId)}`);
                const json = await res.json();
                
                let totalAmount = 0;
                if (json.data && json.data.length > 0)
                {
                    json.data.forEach(item => {
                        const qty = parseFloat(item.OrDet_Quantity || item.PurDet_Quantity || item.Quantity || 0);
                        const price = parseFloat(item.OrDet_UnitPrice || item.PurDet_UnitPrice || item.UnitPrice || item.Prod_Price || 0);
                        const lineTotal = item.Total_Price ? parseFloat(item.Total_Price) : (qty * price);
                        totalAmount += lineTotal;
                    });
                }
                
                extensionsHtml += `
                    <div style="line-height: 1.5; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <strong style="color: #1e3a8a;"><i class="fa-solid fa-calculator" style="margin-right:4px;"></i> Total Amount:</strong> 
                        <span style="color: #1e3a8a; font-weight: 700; font-size: 15px;">₱${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                `;
            }
            catch (e) { console.error("Error calculating total amount:", e); }
        }

        // 2. Fetch, Bind, and Handle Payment Sub-forms
        if (currentTable === 'orders')
        {
            try
            {
                const res = await fetch(`api/select.php?query=payment_by_order&id=${encodeURIComponent(primaryId)}`);
                const json = await res.json();

                const payment = (json.data && json.data.length > 0) ? json.data[0] : null;

                // Grab the total amount already computed above so we can compare
                // Parse it back from the rendered HTML, or re-derive from the items fetch
                let totalAmount = 0;
                const totalAmountRes  = await fetch(`api/select.php?query=list_by_order&id=${encodeURIComponent(primaryId)}`);
                const totalAmountJson = await totalAmountRes.json();
                if (totalAmountJson.data && totalAmountJson.data.length > 0)
                {
                    totalAmountJson.data.forEach(item => {
                    const lineTotal = item.Total_Price ? parseFloat(item.Total_Price) : 0;
                    totalAmount += lineTotal;
                    });
                }

                extensionsHtml += `
                    <div style="margin-top: 12px; padding: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-family: system-ui, sans-serif;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="color: #166534; font-size: 13.5px;">
                                <i class="fa-solid fa-credit-card"></i> Payment Information
                            </strong>
                    `;

                if (payment)
                {
                    const amountPaid   = parseFloat(payment.Pay_Amount);
                    const isFullyPaid  = amountPaid >= totalAmount && totalAmount > 0;
                    const balance      = totalAmount - amountPaid;

                    const statusColor  = isFullyPaid ? '#166534' : '#92400e';
                    const statusBg     = isFullyPaid ? '#dcfce7' : '#fef3c7';
                    const statusBorder = isFullyPaid ? '#86efac' : '#fcd34d';
                    const statusIcon   = isFullyPaid ? 'fa-circle-check' : 'fa-clock';
                    const statusLabel  = isFullyPaid ? 'Fully Paid' : 'Partially Paid / Pending';

                    extensionsHtml += `
                        <button id="btnTriggerPaymentEdit"
                            style="height:24px; padding:0 10px; background:#e2e8f0; border:1px solid #cbd5e1;
                                border-radius:4px; font-size:11.5px; color:#475569; cursor:pointer; font-weight:500;">
                            <i class="fa-solid fa-pen-to-square"></i> Update
                        </button>
                        </div>

                        <!-- Status Badge -->
                        <div style="display:inline-flex; align-items:center; gap:5px; padding:3px 10px;
                                background:${statusBg}; border:1px solid ${statusBorder};
                                border-radius:999px; font-size:11.5px; font-weight:600;
                                color:${statusColor}; margin-bottom:8px;">
                            <i class="fa-solid ${statusIcon}"></i> ${statusLabel}
                        </div>

                        <!-- Payment Details -->
                        <div style="font-size:13px; color:#14532d; line-height:1.8;">
                        <div style="display:flex; justify-content:space-between;">
                                <span><strong>Payment ID:</strong></span>
                            <span>${escapeHtml(String(payment.Pay_ID))}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span><strong>Method:</strong></span>
                            <span>${escapeHtml(payment.Pay_Method)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span><strong>Amount Paid:</strong></span>
                            <span style="font-weight:700;">
                                ₱${amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span><strong>Order Total:</strong></span>
                            <span>₱${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        </div>
                        `;

                    if (!isFullyPaid)
                    {
                        extensionsHtml += `
                            <div style="display:flex; justify-content:space-between; color:#b45309; margin-top:2px;
                                border-top:1px dashed #fcd34d; padding-top:4px;">
                                <span><strong>Remaining Balance:</strong></span>
                                <span style="font-weight:700;">
                                    ₱${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        `;
                    }

                        extensionsHtml += `</div>`;
                    }
                    else
                    {
                        extensionsHtml += `
                            <button id="btnTriggerPaymentAdd"
                                style="height:24px; padding:0 10px; background:#16a34a; border:none;
                                    border-radius:4px; font-size:11.5px; color:#fff; cursor:pointer; font-weight:500;">
                                <i class="fa-solid fa-plus"></i> Add Payment
                            </button>
                        </div>
                        <div style="font-size:13px; color:#166534; font-style:italic;">
                            No payment recorded for this order yet.
                        </div>
                        `;
                    }

                extensionsHtml += `
                    <div id="inlinePaymentForm" style="display:none; margin-top:10px;
                        padding-top:10px; border-top:1px dashed #bbf7d0;"></div>
                     </div>
                    `;

                extContainer.innerHTML = extensionsHtml;

                if (payment) {
                    document.getElementById('btnTriggerPaymentEdit').onclick = function () {
                        openInlinePaymentForm(true, payment);
                };
                } else {
                    document.getElementById('btnTriggerPaymentAdd').onclick = function () {
                        openInlinePaymentForm(false, null);
                        };
                    }
                }
                catch (e)
                {
                    console.error("Error fetching payment details:", e);
                    extContainer.innerHTML = extensionsHtml;
                }
            }
        else
        {
            extContainer.innerHTML = extensionsHtml;
        }
    }

    // ---- INLINE PAYMENT HANDLER ACTION FORM ----
    function openInlinePaymentForm(isEdit, paymentObj)
    {
        const formDiv = document.getElementById('inlinePaymentForm');
        if (!formDiv) return;

        const currentMethod = isEdit ? paymentObj.Pay_Method : '';
        const currentAmount = isEdit ? paymentObj.Pay_Amount : '';

        formDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div>
                    <label style="display:block; font-size:11.5px; color:#14532d; font-weight:600; margin-bottom:2px;">Payment Method</label>
                    <input type="text" id="inlinePayMethod" value="${escapeHtml(currentMethod)}" placeholder="e.g., Cash, GCash, Bank Transfer" style="width:100%; height:30px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; box-sizing:border-box;">
                </div>
                <div>
                    <label style="display:block; font-size:11.5px; color:#14532d; font-weight:600; margin-bottom:2px;">Amount Paid (₱)</label>
                    <input type="number" id="inlinePayAmount" value="${currentAmount}" step="0.01" min="0" placeholder="0.00" style="width:100%; height:30px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; box-sizing:border-box;">
                </div>
                <div style="display: flex; gap: 6px; justify-content: flex-end; margin-top: 4px;">
                    <button id="btnSaveInlinePayment" style="height:26px; padding:0 12px; background:#16a34a; border:none; border-radius:4px; color:#fff; font-size:11.5px; font-weight:600; cursor:pointer;">Save Payment</button>
                    <button id="btnCancelInlinePayment" style="height:26px; padding:0 12px; background:#cbd5e1; border:none; border-radius:4px; color:#334155; font-size:11.5px; cursor:pointer;">Cancel</button>
                </div>
            </div>
        `;

        formDiv.style.display = 'block';

        document.getElementById('btnCancelInlinePayment').onclick = function() {
            formDiv.style.display = 'none';
            formDiv.innerHTML = '';
        };

        document.getElementById('btnSaveInlinePayment').onclick = async function() {
            const method = document.getElementById('inlinePayMethod').value.trim();
            const amount = document.getElementById('inlinePayAmount').value.trim();

            if (!method || !amount) {
                alert("Please complete both input fields.");
                return;
            }

            if (isEdit) {
                const affected = await runUpdate('update_payment', [method, amount, paymentObj.Pay_ID]);
                if (affected > 0) alert("Payment updated successfully.");
                else alert("Payment layout processed successfully.");
            } else {
                const result = await runInsert('insert_payment', [primaryId, method, amount]);
                if (result && result.affected_rows > 0) alert("Payment saved successfully!");
                else alert("Failed to save payment.");
            }

            modal.style.display = 'none';
            subActions.style.display = 'none';
            runSelect(getActiveQueryName(), 'result-container');
        };
    }

    // ---- EDIT MODE ----
    function showEditMode()
    {
        const readonlyCols = TABLE_READONLY_COLS[currentTable] || [];
        modalTitle.innerText = `Edit ${currentTable.toUpperCase()} (ID: ${primaryId})`;

        subActions.innerHTML = '';
        subActions.style.display = 'none';

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

        document.getElementById('btnDelete').onclick = function () { showViewMode(); };
        document.getElementById('btnClose').onclick  = function () { modal.style.display = 'none'; };
    }

    // ---- RELATED RECORDS MODE ----
    async function showRelatedRecords(tableName, id)
    {
        modalTitle.innerText   = `Records List — ${tableName.toUpperCase()} ID: ${id}`;
        modalDetails.innerHTML = '<p style="color:#888;font-size:13px;">Loading...</p>';

        subActions.innerHTML = '';
        subActions.style.display = 'none';

        document.querySelector('#viewModal .modal-content').style.maxWidth = '800px';

        btnsModal.innerHTML = `
            <button id="btnBack"  class="modal-btn warning">Back</button>
            <button id="btnClose" class="modal-btn cancel">Close</button>
        `;
        document.getElementById('btnBack').onclick  = function () { showViewMode(); };
        document.getElementById('btnClose').onclick = function ()
        {
            document.querySelector('#viewModal .modal-content').style.maxWidth = '450px';
            modal.style.display = 'none';
        };

        try
        {
            const queryName = tableName === 'orders' ? 'list_by_order' : 'list_by_purchase';
            const res  = await fetch(`api/select.php?query=${queryName}&id=${encodeURIComponent(id)}`);
            const json = await res.json();

            if (json.error || !json.data || json.data.length === 0)
            {
                modalDetails.innerHTML = '<p style="color:#888;font-size:13px;">No item line breakdowns recorded.</p>';
                return;
            }

            renderRelatedTable(json.data, id);
        }
        catch (err)
        {
            modalDetails.innerHTML = `<p style="color:#c0392b;font-size:13px;">Fetch failed: ${escapeHtml(err.message)}</p>`;
        }
    }

    function renderRelatedTable(data, orderId)
    {
        const cols = Object.keys(data[0]);
        let tableHtml = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;">';

        tableHtml += '<thead><tr>';
        cols.forEach(col => {
            tableHtml += `<th style="padding:6px 10px;background:#38414e;color:#fff;text-align:left;">${escapeHtml(col)}</th>`;
        });
        tableHtml += '<th style="padding:6px 10px;background:#38414e;color:#fff;text-align:left;">Options</th>';
        tableHtml += '</tr></thead><tbody>';

        data.forEach((detailRow, ri) =>
        {
            const bg         = ri % 2 === 0 ? '#fff' : '#f8fafc';
            const rowDataB64 = btoa(unescape(encodeURIComponent(JSON.stringify(detailRow))));

            tableHtml += `<tr style="background:${bg}">`;
            cols.forEach(col => {
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

    function showRelatedEditMode(detailRow, orderId)
    {
        const detailCols  = Object.keys(detailRow);
        const detailPK    = detailRow[detailCols[0]];

        modalTitle.innerText = `Edit Breakdown Record Line (ID: ${detailPK})`;

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

            const childUpdateKey = currentTable === 'orders' ? 'update_orderdetail' : 'update_purchasedetail';
            const affected = await runUpdate(childUpdateKey, params);

            if (affected > 0) alert('Breakdown line item updated successfully.');
            else alert('Update failed or no values were changed.');

            showRelatedRecords(currentTable, orderId);
        };

        document.getElementById('btnRelCancel').onclick = function () {
            showRelatedRecords(currentTable, orderId);
        };

        document.getElementById('btnClose').onclick = function ()
        {
            document.querySelector('#viewModal .modal-content').style.maxWidth = '450px';
            modal.style.display = 'none';
        };
    }

    window.handleRelatedEdit = function (rowDataB64, orderId)
    {
        const detailRow = JSON.parse(decodeURIComponent(escape(atob(rowDataB64))));
        showRelatedEditMode(detailRow, orderId);
    };
}


// ==== ADD / INSERT MODAL ================================

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
    const subActions   = document.getElementById('modalSubActions');
    const btnsModal    = document.querySelector('.modal-buttons');

    const isTransactionTable = (currentTable === 'orders' || currentTable === 'purchase');

    modalTitle.innerText = `Add New ${currentTable.toUpperCase()} Record`;

    if (subActions) {
        subActions.innerHTML = '';
        subActions.style.display = 'none';
    }

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

    if (isTransactionTable)
    {
        const modalContent = document.querySelector('#viewModal .modal-content');
        modalContent.style.maxWidth = '700px';
        modalContent.style.width    = '95%';

        formHtml += `
            <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <h4 style="margin: 0; font-size: 13px; color: #334155; font-weight: 600;">
                        <i class="fa-solid fa-list-ol" style="margin-right: 4px; color: #64748b;"></i> Item Lines Breakdown
                    </h4>
                    <button type="button" id="btnAddItemLine" style="height: 26px; padding: 0 10px; background: #2563eb; border: none; border-radius: 6px; font-size: 11.5px; color: #fff; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-plus"></i> Add Item Row
                    </button>
                </div>
                <div id="itemLinesContainer" style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; padding-right: 2px;"></div>
            </div>`;
    }

    modalDetails.style.display = 'block';
    modalDetails.innerHTML     = formHtml;

    btnsModal.innerHTML = `
        <button id="btnConfirmAdd" class="modal-btn confirm-add">Confirm Add</button>
        <button id="btnCancelAdd"  class="modal-btn cancel">Cancel</button>
    `;

    modal.style.display = 'flex';

    function generateLineRow()
    {
        const container = document.getElementById('itemLinesContainer');
        const rowId = 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        const targetIdLabel = currentTable === 'orders' ? 'DStock ID' : 'Product ID';

        const rowDiv = document.createElement('div');
        rowDiv.id = rowId;
        rowDiv.className = 'receipt-item-row';
        rowDiv.style = "display: flex; gap: 8px; align-items: center; background: #f8fafc; padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px;";
        
        rowDiv.innerHTML = `
            <div style="flex: 2;">
                <input type="number" class="line-target-id" placeholder="${targetIdLabel}" style="width:100%; height:30px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px;" required>
            </div>
            <div style="flex: 1.5;">
                <input type="number" class="line-qty" placeholder="Qty" min="1" style="width:100%; height:30px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px;" required>
            </div>
            <div style="flex: 2;">
                <input type="number" class="line-price" placeholder="Unit Price (₱)" step="0.01" min="0" style="width:100%; height:30px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px;" required>
            </div>
            <button type="button" class="btn-remove-line" style="height:30px; width:32px; background:#fee2e2; border:1px solid #fca5a5; border-radius:4px; color:#b91c1c; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <i class="fa-solid fa-trash-can" style="font-size:11px;"></i>
            </button>
        `;

        rowDiv.querySelector('.btn-remove-line').onclick = function() { rowDiv.remove(); };
        container.appendChild(rowDiv);
    }

    if (isTransactionTable)
    {
        generateLineRow();
        document.getElementById('btnAddItemLine').onclick = generateLineRow;
    }

    function closeModalAndReset()
    {
        document.querySelector('#viewModal .modal-content').style.maxWidth = '450px';
        modal.style.display = 'none';
    }

    document.getElementById('btnConfirmAdd').onclick = async function ()
    {
        const params = fields.map((field, i) => {
            const input = document.getElementById(`add-field-${i}`);
            return input ? input.value.trim() : '';
        });

        const emptyField = fields.find((_, i) => params[i] === '');
        if (emptyField)
        {
            alert(`Please fill in: ${emptyField.label}`);
            return;
        }

        let linesData = [];
        if (isTransactionTable)
        {
            const rowElements = document.querySelectorAll('.receipt-item-row');
            if (rowElements.length === 0)
            {
                alert('Transaction aborted: You must include at least 1 item breakdown line.');
                return;
            }

            let validationPassed = true;
            rowElements.forEach(row => {
                const targetId = row.querySelector('.line-target-id').value.trim();
                const qty      = row.querySelector('.line-qty').value.trim();
                const price    = row.querySelector('.line-price').value.trim();

                if (!targetId || !qty || !price) validationPassed = false;
                linesData.push({ targetId, qty, price });
            });

            if (!validationPassed) {
                alert('Please fill out all missing fields inside your item lines.');
                return;
            }
        }

        const result = await runInsert(`insert_${currentTable}`, params);

        if (result && result.affected_rows > 0)
        {
            const generatedParentId = result.insert_id;

            if (isTransactionTable)
            {
                const childQueryKey = currentTable === 'orders' ? 'insert_orderdetail' : 'insert_purchasedetail';
                for (const line of linesData) {
                    await runInsert(childQueryKey, [generatedParentId, line.targetId, line.qty, line.price]);
                }
            }

            alert(`Record and all item lines posted successfully! (Generated ID: ${generatedParentId}).`);
            closeModalAndReset();
            runSelect(getActiveQueryName(), 'result-container');
        }
        else
        {
            alert('Insert transaction failed. Please check backend compatibility validations.');
        }
    };

    document.getElementById('btnCancelAdd').onclick = closeModalAndReset;
}
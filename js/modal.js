// js/modal.js
// All modal behaviour: view, edit, add (insert), related records, and live-search.
// Depends on: utils.js, api.js, changelog.js

// -------------------------------------------------------
// JOIN columns shown in forms but excluded from UPDATE
// params — they are not real columns on the base table.
// -------------------------------------------------------
const TABLE_READONLY_COLS = {
    product:       ['Supplier_Name'],
    orders:        ['Cust_Name', 'Pay_ID'],
    deliverystock: ['Prod_Name', 'Prod_Price'],
};

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

const TABLES_WITH_RELATED = ['orders', 'purchase'];


// ================================================================
// SHARED MODAL HELPERS
// ================================================================

// Grabs all the shared modal DOM references in one call.
function getModalRefs()
{
    return {
        modal:        document.getElementById('viewModal'),
        modalTitle:   document.getElementById('modalTitle'),
        modalDetails: document.getElementById('modalDetails'),
        subActions:   document.getElementById('modalSubActions'),
        btnsModal:    document.querySelector('.modal-buttons'),
        modalContent: document.querySelector('#viewModal .modal-content'),
    };
}

// Resets modal to its default narrow width and hides it.
function closeModal()
{
    const { modal, modalContent, subActions } = getModalRefs();
    modalContent.style.maxWidth = '450px';
    modalContent.style.width    = '';
    modal.style.display         = 'none';
    if (subActions) { subActions.innerHTML = ''; subActions.style.display = 'none'; }
}

// Builds a read-only key/value field row for the view mode.
function buildViewField(label, value)
{
    return `
        <div style="line-height:1.5; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
            <strong style="color:#475569;">${escapeHtml(label)}:</strong>
            <span style="color:#0f172a; margin-left:4px;">${escapeHtml(String(value ?? ''))}</span>
        </div>`;
}

// Builds a labelled input row for edit/add forms.
function buildFormField(id, label, value, readonly = false, extraNote = '')
{
    return `
        <div class="form-field">
            <label for="${id}">${escapeHtml(label)}${extraNote}</label>
            <input id="${id}" type="text" value="${escapeHtml(String(value ?? ''))}"${readonly ? ' readonly' : ''}>
        </div>`;
}


// ================================================================
// VIEW / EDIT MODAL
// ================================================================

function ViewOptions(rowDataB64)
{
    const row       = JSON.parse(decodeURIComponent(escape(atob(rowDataB64))));
    const columns   = Object.keys(row);
    const primaryId = row[columns[0]];

    const activeBtn    = document.querySelector('.tab-btn.active');
    const currentTable = activeBtn ? activeBtn.dataset.query : 'record';
    const hasRelated   = TABLES_WITH_RELATED.includes(currentTable);

    const { modal, modalTitle, modalDetails, subActions, btnsModal, modalContent } = getModalRefs();

    showViewMode();

    // ---- VIEW MODE ----
    async function showViewMode()
    {
        modalTitle.innerText    = `Manage ${currentTable.toUpperCase()} (ID: ${primaryId})`;
        modalContent.style.maxWidth = '450px';

        let formHtml = '<div style="display:flex; flex-direction:column; gap:10px; padding:6px 0; font-size:14.5px; color:#1e293b; font-family:system-ui,sans-serif;">';
        columns.forEach(col => { formHtml += buildViewField(col, row[col]); });
        formHtml += '<div id="dynamicModalExtensions"></div></div>';

        modalDetails.style.display = 'block';
        modalDetails.innerHTML     = formHtml;
        modal.style.display        = 'flex';

        // Related records button
        if (hasRelated)
        {
            subActions.innerHTML = `
                <button id="btnViewRelated" class="modal-btn info"
                    style="width:100%; margin:0; box-sizing:border-box; display:flex;
                           align-items:center; justify-content:center; gap:6px; height:38px; font-weight:600;">
                    <i class="fa-solid fa-list-ol"></i> View Related Records
                </button>`;
            subActions.style.display = 'block';
            document.getElementById('btnViewRelated').onclick = () => showRelatedRecords(currentTable, primaryId);
        }
        else
        {
            subActions.innerHTML     = '';
            subActions.style.display = 'none';
        }

        btnsModal.innerHTML = `
            <button id="btnUpdate" class="modal-btn warning">Update Record</button>
            <button id="btnDelete" class="modal-btn danger">Delete Record</button>
            <button id="btnClose"  class="modal-btn cancel">Close</button>
        `;
        document.getElementById('btnUpdate').onclick = () => showEditMode();
        document.getElementById('btnDelete').onclick = () => { closeModal(); handleDelete(currentTable, primaryId); };
        document.getElementById('btnClose').onclick  = () => closeModal();

        await loadModalExtensions();
    }


    // ---- PAYMENT / TOTAL EXTENSIONS ----
    async function loadModalExtensions()
    {
        const extContainer = document.getElementById('dynamicModalExtensions');
        if (!extContainer) return;

        let html = '';

        // 1. Total amount row (orders + purchases)
        if (currentTable === 'orders' || currentTable === 'purchase')
        {
            const queryName = currentTable === 'orders' ? 'list_by_order' : 'list_by_purchase';
            try
            {
                const json = await fetch(`api/select.php?query=${queryName}&id=${encodeURIComponent(primaryId)}`).then(r => r.json());
                let total  = 0;
                (json.data || []).forEach(item => {
                    total += item.Total_Price
                        ? parseFloat(item.Total_Price)
                        : parseFloat(item.OrDet_Quantity || item.PurDet_Quantity || 0)
                          * parseFloat(item.OrDet_UnitPrice || item.PurDet_UnitPrice || item.Prod_Price || 0);
                });
                html += buildTotalRow(total);
            }
            catch (e) { console.error('Error calculating total:', e); }
        }

        // 2. Payment info (orders only)
        if (currentTable === 'orders')
        {
            try
            {
                const [payJson, itemJson] = await Promise.all([
                    fetch(`api/select.php?query=payment_by_order&id=${encodeURIComponent(primaryId)}`).then(r => r.json()),
                    fetch(`api/select.php?query=list_by_order&id=${encodeURIComponent(primaryId)}`).then(r => r.json()),
                ]);

                const payment = payJson.data?.[0] ?? null;
                let total     = 0;
                (itemJson.data || []).forEach(item => { total += item.Total_Price ? parseFloat(item.Total_Price) : 0; });

                html += buildPaymentBlock(payment, total);
                extContainer.innerHTML = html;

                const editBtn = document.getElementById('btnTriggerPaymentEdit');
                const addBtn  = document.getElementById('btnTriggerPaymentAdd');
                if (editBtn) editBtn.onclick = () => openInlinePaymentForm(true,  payment);
                if (addBtn)  addBtn.onclick  = () => openInlinePaymentForm(false, null);
            }
            catch (e) { console.error('Error fetching payment:', e); extContainer.innerHTML = html; }
        }
        else
        {
            extContainer.innerHTML = html;
        }
    }

    // Builds the blue "Total Amount" summary row.
    function buildTotalRow(total)
    {
        const formatted = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `
            <div style="display:flex; justify-content:space-between; align-items:center;
                        background:#f8fafc; padding:8px; border-radius:6px;
                        border:1px solid #e2e8f0; margin-top:4px;">
                <strong style="color:#1e3a8a;"><i class="fa-solid fa-calculator" style="margin-right:4px;"></i> Total Amount:</strong>
                <span style="color:#1e3a8a; font-weight:700; font-size:15px;">₱${formatted}</span>
            </div>`;
    }

    // Builds the green payment information card.
    function buildPaymentBlock(payment, total)
    {
        let inner = '';

        if (payment)
        {
            const paid        = parseFloat(payment.Pay_Amount);
            const fullyPaid   = paid >= total && total > 0;
            const balance     = total - paid;
            const badge       = fullyPaid
                ? { bg: '#dcfce7', border: '#86efac', color: '#166534', icon: 'fa-circle-check', label: 'Fully Paid' }
                : { bg: '#fef3c7', border: '#fcd34d', color: '#92400e', icon: 'fa-clock',        label: 'Partially Paid / Pending' };
            const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            inner = `
                <button id="btnTriggerPaymentEdit"
                    style="height:24px; padding:0 10px; background:#e2e8f0; border:1px solid #cbd5e1;
                           border-radius:4px; font-size:11.5px; color:#475569; cursor:pointer; font-weight:500;">
                    <i class="fa-solid fa-pen-to-square"></i> Update
                </button>
                </div>
                <div style="display:inline-flex; align-items:center; gap:5px; padding:3px 10px;
                            background:${badge.bg}; border:1px solid ${badge.border}; border-radius:999px;
                            font-size:11.5px; font-weight:600; color:${badge.color}; margin-bottom:8px;">
                    <i class="fa-solid ${badge.icon}"></i> ${badge.label}
                </div>
                <div style="font-size:13px; color:#14532d; line-height:1.8;">
                    ${payRow('Payment ID', escapeHtml(String(payment.Pay_ID)))}
                    ${payRow('Method',     escapeHtml(payment.Pay_Method))}
                    ${payRow('Amount Paid', `<span style="font-weight:700;">₱${fmt(paid)}</span>`)}
                    ${payRow('Order Total', `₱${fmt(total)}`)}
                    ${!fullyPaid ? `
                        <div style="display:flex; justify-content:space-between; color:#b45309;
                                    margin-top:2px; border-top:1px dashed #fcd34d; padding-top:4px;">
                            <span><strong>Remaining Balance:</strong></span>
                            <span style="font-weight:700;">₱${fmt(balance)}</span>
                        </div>` : ''}
                </div>`;
        }
        else
        {
            inner = `
                <button id="btnTriggerPaymentAdd"
                    style="height:24px; padding:0 10px; background:#16a34a; border:none;
                           border-radius:4px; font-size:11.5px; color:#fff; cursor:pointer; font-weight:500;">
                    <i class="fa-solid fa-plus"></i> Add Payment
                </button>
                </div>
                <div style="font-size:13px; color:#166534; font-style:italic;">
                    No payment recorded for this order yet.
                </div>`;
        }

        return `
            <div style="margin-top:12px; padding:10px; background:#f0fdf4;
                        border:1px solid #bbf7d0; border-radius:6px; font-family:system-ui,sans-serif;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <strong style="color:#166534; font-size:13.5px;">
                        <i class="fa-solid fa-credit-card"></i> Payment Information
                    </strong>
                    ${inner}
                <div id="inlinePaymentForm"
                     style="display:none; margin-top:10px; padding-top:10px; border-top:1px dashed #bbf7d0;">
                </div>
            </div>`;
    }

    // Small helper for a payment detail row.
    function payRow(label, valueHtml)
    {
        return `<div style="display:flex; justify-content:space-between;">
                    <span><strong>${label}:</strong></span><span>${valueHtml}</span>
                </div>`;
    }


    // ---- INLINE PAYMENT FORM ----
    function openInlinePaymentForm(isEdit, paymentObj)
    {
        const formDiv = document.getElementById('inlinePaymentForm');
        if (!formDiv) return;

        formDiv.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:8px;">
                <div>
                    <label style="display:block; font-size:11.5px; color:#14532d; font-weight:600; margin-bottom:2px;">Payment Method</label>
                    <input type="text" id="inlinePayMethod" value="${escapeHtml(isEdit ? paymentObj.Pay_Method : '')}"
                        placeholder="e.g., Cash, GCash, Bank Transfer"
                        style="width:100%; height:30px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; box-sizing:border-box;">
                </div>
                <div>
                    <label style="display:block; font-size:11.5px; color:#14532d; font-weight:600; margin-bottom:2px;">Amount Paid (₱)</label>
                    <input type="number" id="inlinePayAmount" value="${isEdit ? paymentObj.Pay_Amount : ''}"
                        step="0.01" min="0" placeholder="0.00"
                        style="width:100%; height:30px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; box-sizing:border-box;">
                </div>
                <div style="display:flex; gap:6px; justify-content:flex-end; margin-top:4px;">
                    <button id="btnSaveInlinePayment"
                        style="height:26px; padding:0 12px; background:#16a34a; border:none; border-radius:4px; color:#fff; font-size:11.5px; font-weight:600; cursor:pointer;">
                        Save Payment
                    </button>
                    <button id="btnCancelInlinePayment"
                        style="height:26px; padding:0 12px; background:#cbd5e1; border:none; border-radius:4px; color:#334155; font-size:11.5px; cursor:pointer;">
                        Cancel
                    </button>
                </div>
            </div>`;
        formDiv.style.display = 'block';

        document.getElementById('btnCancelInlinePayment').onclick = () => {
            formDiv.style.display = 'none';
            formDiv.innerHTML     = '';
        };

        document.getElementById('btnSaveInlinePayment').onclick = async () =>
        {
            const method = document.getElementById('inlinePayMethod').value.trim();
            const amount = document.getElementById('inlinePayAmount').value.trim();
            if (!method || !amount) { alert('Please complete both fields.'); return; }

            if (isEdit)
            {
                const affected = await runUpdate('update_payment', [method, amount, paymentObj.Pay_ID]);
                if (affected > 0) {
                    await writeLog('payment', paymentObj.Pay_ID, `Payment updated for Order ID ${primaryId}`);
                    alert('Payment updated successfully.');
                } else {
                    alert('Payment update processed.');
                }
            }
            else
            {
                const result = await runInsert('insert_payment', [primaryId, method, amount]);
                if (result?.affected_rows > 0) {
                    await writeLog('payment', result.insert_id, `Payment added to Order ID ${primaryId}`);
                    alert('Payment saved successfully!');
                } else {
                    alert('Failed to save payment.');
                }
            }

            closeModal();
            runSelect(getActiveQueryName(), 'result-container');
        };
    }


    // ---- EDIT MODE ----
    function showEditMode()
    {
        const readonlyCols = TABLE_READONLY_COLS[currentTable] || [];
        modalTitle.innerText     = `Edit ${currentTable.toUpperCase()} (ID: ${primaryId})`;
        subActions.innerHTML     = '';
        subActions.style.display = 'none';

        let formHtml = '<div class="update-form">';
        columns.forEach((col, i) =>
        {
            const isPK       = (i === 0);
            const isReadonly = isPK || readonlyCols.includes(col);
            const note       = isPK ? ' <span class="pk-label">(ID — read only)</span>'
                             : isReadonly ? ' <span class="pk-label">(read only)</span>' : '';
            formHtml += buildFormField(`edit-field-${i}`, col, row[col], isReadonly, note);
        });
        formHtml += '</div>';
        modalDetails.innerHTML = formHtml;

        btnsModal.innerHTML = `
            <button id="btnUpdate" class="modal-btn warning">Confirm Update</button>
            <button id="btnCancel" class="modal-btn cancel">Cancel</button>
            <button id="btnClose"  class="modal-btn cancel">Close</button>
        `;
        document.getElementById('btnCancel').onclick = () => showViewMode();
        document.getElementById('btnClose').onclick  = () => closeModal();

        document.getElementById('btnUpdate').onclick = async () =>
        {
            const params = [];
            columns.forEach((col, i) => {
                if (i === 0 || readonlyCols.includes(col)) return;
                params.push(document.getElementById(`edit-field-${i}`).value);
            });
            params.push(primaryId);

            const affected = await runUpdate(`update_${currentTable}`, params);
            if (affected > 0) {
                await writeLog(currentTable, primaryId, `Record updated in ${currentTable}`);
                alert(`Updated ${affected} row(s) successfully.`);
            } else {
                alert('Update failed or no values were changed.');
            }

            closeModal();
            runSelect(getActiveQueryName(), 'result-container');
        };
    }


    // ---- RELATED RECORDS MODE ----
    async function showRelatedRecords(tableName, id)
    {
        modalTitle.innerText         = `Records List — ${tableName.toUpperCase()} ID: ${id}`;
        modalDetails.innerHTML       = '<p style="color:#888; font-size:13px;">Loading...</p>';
        subActions.innerHTML         = '';
        subActions.style.display     = 'none';
        modalContent.style.maxWidth  = '800px';

        btnsModal.innerHTML = `
            <button id="btnBack"  class="modal-btn warning">Back</button>
            <button id="btnClose" class="modal-btn cancel">Close</button>
        `;
        document.getElementById('btnBack').onclick  = () => showViewMode();
        document.getElementById('btnClose').onclick = () => closeModal();

        try
        {
            const queryName = tableName === 'orders' ? 'list_by_order' : 'list_by_purchase';
            const json      = await fetch(`api/select.php?query=${queryName}&id=${encodeURIComponent(id)}`).then(r => r.json());

            if (json.error || !json.data?.length)
            {
                modalDetails.innerHTML = '<p style="color:#888; font-size:13px;">No item line breakdowns recorded.</p>';
                return;
            }
            renderRelatedTable(json.data, id);
        }
        catch (err)
        {
            modalDetails.innerHTML = `<p style="color:#c0392b; font-size:13px;">Fetch failed: ${escapeHtml(err.message)}</p>`;
        }
    }

    function renderRelatedTable(data, orderId)
    {
        const cols = Object.keys(data[0]);

        const headerCells = cols.map(c =>
            `<th style="padding:6px 10px; background:#38414e; color:#fff; text-align:left;">${escapeHtml(c)}</th>`
        ).join('');

        const bodyRows = data.map((detailRow, ri) =>
        {
            const bg         = ri % 2 === 0 ? '#fff' : '#f8fafc';
            const rowDataB64 = btoa(unescape(encodeURIComponent(JSON.stringify(detailRow))));
            const cells      = cols.map(c =>
                `<td style="padding:6px 10px; border-bottom:1px solid #f1f5f9;">${escapeHtml(String(detailRow[c] ?? ''))}</td>`
            ).join('');

            return `<tr style="background:${bg}">
                        ${cells}
                        <td style="padding:6px 10px; border-bottom:1px solid #f1f5f9;">
                            <button onclick="handleRelatedEdit('${rowDataB64}', ${orderId})"
                                style="height:26px; padding:0 10px; background:#f1f5f9; border:1px solid #e2e8f0;
                                       border-radius:6px; font-size:11.5px; color:#475569; cursor:pointer;">
                                Edit
                            </button>
                        </td>
                    </tr>`;
        }).join('');

        modalDetails.innerHTML = `
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead><tr>${headerCells}<th style="padding:6px 10px; background:#38414e; color:#fff; text-align:left;">Options</th></tr></thead>
                    <tbody>${bodyRows}</tbody>
                </table>
            </div>`;
    }

    function showRelatedEditMode(detailRow, orderId)
    {
        const detailCols = Object.keys(detailRow);
        const detailPK   = detailRow[detailCols[0]];

        modalTitle.innerText = `Edit Breakdown Record Line (ID: ${detailPK})`;

        let formHtml = '<div class="update-form">';
        detailCols.forEach((col, i) => {
            const isPK       = (i === 0);
            const isReadonly = isPK || RELATED_READONLY_COLS.includes(col);
            const note       = isPK ? ' <span class="pk-label">(ID — read only)</span>'
                             : isReadonly ? ' <span class="pk-label">(read only)</span>' : '';
            formHtml += buildFormField(`rel-field-${i}`, col, detailRow[col], isReadonly, note);
        });
        formHtml += '</div>';
        modalDetails.innerHTML = formHtml;

        btnsModal.innerHTML = `
            <button id="btnRelConfirm" class="modal-btn warning">Confirm Update</button>
            <button id="btnRelCancel"  class="modal-btn cancel">Cancel</button>
            <button id="btnClose"      class="modal-btn cancel">Close</button>
        `;
        document.getElementById('btnRelCancel').onclick = () => showRelatedRecords(currentTable, orderId);
        document.getElementById('btnClose').onclick     = () => closeModal();

        document.getElementById('btnRelConfirm').onclick = async () =>
        {
            const params = [];
            detailCols.forEach((col, i) => {
                if (i === 0 || RELATED_READONLY_COLS.includes(col)) return;
                params.push(document.getElementById(`rel-field-${i}`).value);
            });
            params.push(detailPK);

            const key      = currentTable === 'orders' ? 'update_orderdetail' : 'update_purchasedetail';
            const affected = await runUpdate(key, params);
            alert(affected > 0 ? 'Breakdown line updated successfully.' : 'Update failed or no values changed.');
            showRelatedRecords(currentTable, orderId);
        };
    }

    window.handleRelatedEdit = function (rowDataB64, orderId)
    {
        const detailRow = JSON.parse(decodeURIComponent(escape(atob(rowDataB64))));
        showRelatedEditMode(detailRow, orderId);
    };
}


// ================================================================
// LIVE-SEARCH HELPERS
// ================================================================

// Builds a labelled live-search field HTML snippet.
// Call wireLiveSearch() after injecting it into the DOM.
function makeLiveSearchField(inputId, dropId, hiddenId, labelText, placeholder)
{
    return `
        <div class="form-field">
            <label>${escapeHtml(labelText)}</label>
            <div class="ls-wrapper">
                <input id="${inputId}" type="text" placeholder="${escapeHtml(placeholder)}" autocomplete="off"
                    style="width:100%; height:36px; padding:0 10px; border:1px solid #cbd5e1;
                           border-radius:6px; font-size:13px; box-sizing:border-box;">
                <div class="ls-dropdown" id="${dropId}" style="display:none;"></div>
                <input type="hidden" id="${hiddenId}">
            </div>
        </div>`;
}

// Wires live-search behaviour onto existing DOM elements.
// The dropdown is portal-appended to <body> to escape overflow:hidden ancestors.
function wireLiveSearch({ inputId, hiddenId, searchQuery, onSelect })
{
    const input  = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    if (!input || !hidden) { console.warn('wireLiveSearch: elements not found', { inputId, hiddenId }); return; }

    // Portal dropdown
    const drop    = document.createElement('div');
    drop.id       = `portal-drop-${inputId}`;
    drop.style.cssText = `
        position:fixed; z-index:99999; background:#fff;
        border:1px solid #cbd5e1; border-top:none;
        border-radius:0 0 6px 6px; max-height:200px; overflow-y:auto;
        box-shadow:0 4px 16px rgba(0,0,0,.12); display:none; min-width:200px;`;
    document.body.appendChild(drop);

    const position = () => {
        const r       = input.getBoundingClientRect();
        drop.style.top   = `${r.bottom}px`;
        drop.style.left  = `${r.left}px`;
        drop.style.width = `${r.width}px`;
    };

    // Auto-remove portal when input leaves the DOM
    const observer = new MutationObserver(() => {
        if (!document.body.contains(input)) { drop.remove(); observer.disconnect(); }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    let debounce;
    input.addEventListener('input', function ()
    {
        hidden.value            = '';
        input.style.borderColor = '#cbd5e1';
        clearTimeout(debounce);

        const term = this.value.trim();
        if (!term) { drop.innerHTML = ''; drop.style.display = 'none'; return; }

        debounce = setTimeout(async () =>
        {
            try
            {
                const json = await fetch(`api/search.php?query=${searchQuery}&term=${encodeURIComponent(term)}`).then(r => r.json());
                drop.innerHTML = '';

                if (!json.data?.length)
                {
                    drop.innerHTML     = '<div style="padding:8px 12px; font-size:12px; color:#94a3b8; font-style:italic;">No results found</div>';
                    position();
                    drop.style.display = 'block';
                    return;
                }

                json.data.forEach(item =>
                {
                    const opt         = document.createElement('div');
                    opt.textContent   = item.label;
                    opt.style.cssText = 'padding:8px 12px; font-size:12.5px; color:#334155; cursor:pointer; border-bottom:1px solid #f1f5f9;';
                    opt.addEventListener('mouseover', () => { opt.style.background = '#f0f9ff'; opt.style.color = '#0369a1'; });
                    opt.addEventListener('mouseout',  () => { opt.style.background = '';        opt.style.color = '#334155'; });
                    opt.addEventListener('mousedown', e => {
                        e.preventDefault();
                        input.value             = item.label;
                        hidden.value            = item.id;
                        input.style.borderColor = '#22c55e';
                        drop.style.display      = 'none';
                        drop.innerHTML          = '';
                        if (onSelect) onSelect(item);
                    });
                    drop.appendChild(opt);
                });

                position();
                drop.style.display = 'block';
            }
            catch (err) { console.error('Live search error:', err); }
        }, 220);
    });

    input.addEventListener('blur',  () => { setTimeout(() => { drop.style.display = 'none'; }, 180); });
    input.addEventListener('focus', () => { if (drop.children.length) { position(); drop.style.display = 'block'; } });
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
}


// ================================================================
// ADD / INSERT MODAL
// ================================================================

function showAddModal()
{
    const activeBtn    = document.querySelector('.tab-btn.active');
    const currentTable = activeBtn ? activeBtn.dataset.query : 'customer';
    const fields       = TABLE_INSERT_FIELDS[currentTable];
    if (!fields) { alert(`No insert form defined for table: ${currentTable}`); return; }

    const { modal, modalTitle, modalDetails, subActions, btnsModal, modalContent } = getModalRefs();
    const isTransaction = (currentTable === 'orders' || currentTable === 'purchase');

    modalTitle.innerText         = `Add New ${currentTable.toUpperCase()} Record`;
    subActions.innerHTML         = '';
    subActions.style.display     = 'none';
    modalContent.style.maxWidth  = isTransaction ? '700px' : '450px';
    modalContent.style.width     = isTransaction ? '95%'   : '';

    // ---- Main fields ----
    let formHtml = '<div class="update-form">';
    fields.forEach((field, i) =>
    {
        if (currentTable === 'orders'   && field.key === 'Cust_ID')
            return void (formHtml += makeLiveSearchField('ls-input-cust', 'ls-drop-cust', 'hidden-cust-id', 'Customer Name', 'Type to search customer...'));
        if (currentTable === 'purchase' && field.key === 'Supply_ID')
            return void (formHtml += makeLiveSearchField('ls-input-supp', 'ls-drop-supp', 'hidden-supp-id', 'Supplier Name', 'Type to search supplier...'));

        formHtml += `
            <div class="form-field">
                <label for="add-field-${i}">${escapeHtml(field.label)}</label>
                <input id="add-field-${i}" type="${field.type}" placeholder="${escapeHtml(field.label)}"
                    ${field.type === 'number' ? 'min="0" step="any"' : ''}>
            </div>`;
    });
    formHtml += '</div>';

    // ---- Item lines section (transactions only) ----
    if (isTransaction)
    {
        formHtml += `
            <div style="margin-top:20px; border-top:1px solid #e2e8f0; padding-top:15px;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                    <h4 style="margin:0; font-size:13px; color:#334155; font-weight:600;">
                        <i class="fa-solid fa-list-ol" style="margin-right:4px; color:#64748b;"></i> Item Lines Breakdown
                    </h4>
                    <button type="button" id="btnAddItemLine"
                        style="height:26px; padding:0 10px; background:#2563eb; border:none; border-radius:6px;
                               font-size:11.5px; color:#fff; font-weight:500; cursor:pointer;
                               display:inline-flex; align-items:center; gap:4px;">
                        <i class="fa-solid fa-plus"></i> Add Item Row
                    </button>
                </div>
                <div id="itemLinesContainer"
                     style="display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto; padding-right:2px;">
                </div>
            </div>`;
    }

    modalDetails.style.display = 'block';
    modalDetails.innerHTML     = formHtml;
    modal.style.display        = 'flex';

    // Wire main live-searches after DOM is ready
    if (currentTable === 'orders')
        wireLiveSearch({ inputId: 'ls-input-cust', hiddenId: 'hidden-cust-id', searchQuery: 'customer' });
    if (currentTable === 'purchase')
        wireLiveSearch({ inputId: 'ls-input-supp', hiddenId: 'hidden-supp-id', searchQuery: 'supplier' });

    btnsModal.innerHTML = `
        <button id="btnConfirmAdd" class="modal-btn confirm-add">Confirm Add</button>
        <button id="btnCancelAdd"  class="modal-btn cancel">Cancel</button>
    `;

    // ---- Item-line row generator ----
    let lineCounter = 0;
    function generateLineRow()
    {
        const isOrders    = currentTable === 'orders';
        const searchQuery = isOrders ? 'dstock' : 'product';
        const n           = ++lineCounter;
        const lsId        = `line_name_${n}`;
        const hiddenId    = `line_hidden_id_${n}`;
        const priceId     = `line_price_${n}`;
        const qtyId       = `line_qty_${n}`;

        const rowDiv      = document.createElement('div');
        rowDiv.className  = 'receipt-item-row';
        rowDiv.style.cssText = 'display:flex; gap:8px; align-items:flex-start; background:#f8fafc; padding:8px; border:1px solid #e2e8f0; border-radius:6px;';

        const priceAttrs = isOrders
            ? 'readonly style="width:100%; height:30px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; box-sizing:border-box; background:#f1f5f9; color:#64748b;"'
            : 'style="width:100%; height:30px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; box-sizing:border-box;"';

        rowDiv.innerHTML = `
            <div style="flex:2.5; position:relative;">
                <input id="ls-input-${lsId}" type="text"
                    placeholder="${isOrders ? 'Search Product (DStock)' : 'Search Product'}"
                    autocomplete="off"
                    style="width:100%; height:30px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; box-sizing:border-box;">
                <input type="hidden" id="${hiddenId}">
            </div>
            <div style="flex:1;">
                <input id="${qtyId}" type="number" placeholder="Qty" min="1"
                    style="width:100%; height:30px; padding:0 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; box-sizing:border-box;">
            </div>
            <div style="flex:1.5;">
                <input id="${priceId}" type="number" placeholder="Unit Price (₱)" step="0.01" min="0" ${priceAttrs}>
            </div>
            <button type="button" class="btn-remove-line"
                style="height:30px; width:32px; flex-shrink:0; background:#fee2e2; border:1px solid #fca5a5;
                       border-radius:4px; color:#b91c1c; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <i class="fa-solid fa-trash-can" style="font-size:11px;"></i>
            </button>`;

        rowDiv.querySelector('.btn-remove-line').onclick = () => rowDiv.remove();
        document.getElementById('itemLinesContainer').appendChild(rowDiv);

        wireLiveSearch({
            inputId:     `ls-input-${lsId}`,
            hiddenId,
            searchQuery,
            onSelect: item => {
                if (isOrders && item.price != null)
                {
                    const el = document.getElementById(priceId);
                    if (el) { el.value = parseFloat(item.price).toFixed(2); el.style.borderColor = '#22c55e'; }
                }
            },
        });
    }

    if (isTransaction)
    {
        generateLineRow();
        document.getElementById('btnAddItemLine').onclick = generateLineRow;
    }

    // ---- Close / reset ----
    const closeAndReset = () => {
        modalContent.style.maxWidth = '450px';
        modalContent.style.width    = '';
        modal.style.display         = 'none';
    };
    document.getElementById('btnCancelAdd').onclick = closeAndReset;

    // ---- Confirm Add ----
    document.getElementById('btnConfirmAdd').onclick = async () =>
    {
        // Collect params — substitute hidden IDs for live-search fields
        const params = fields.map((field, i) => {
            if (currentTable === 'orders'   && field.key === 'Cust_ID')   return document.getElementById('hidden-cust-id').value.trim();
            if (currentTable === 'purchase' && field.key === 'Supply_ID') return document.getElementById('hidden-supp-id').value.trim();
            return document.getElementById(`add-field-${i}`)?.value.trim() ?? '';
        });

        // Validate live-search selections
        if (currentTable === 'orders'   && !document.getElementById('hidden-cust-id').value)
            { alert('Please select a valid Customer from the dropdown.'); return; }
        if (currentTable === 'purchase' && !document.getElementById('hidden-supp-id').value)
            { alert('Please select a valid Supplier from the dropdown.'); return; }

        // Validate regular fields
        const emptyField = fields.find((f, i) => {
            if (currentTable === 'orders'   && f.key === 'Cust_ID')   return false;
            if (currentTable === 'purchase' && f.key === 'Supply_ID') return false;
            return !params[i];
        });
        if (emptyField) { alert(`Please fill in: ${emptyField.label}`); return; }

        // Collect and validate item lines
        let linesData = [];
        if (isTransaction)
        {
            const rows = [...document.querySelectorAll('.receipt-item-row')];
            if (!rows.length) { alert('You must include at least 1 item breakdown line.'); return; }

            let valid = true;
            rows.forEach(row => {
                const targetId = row.querySelector('input[type="hidden"]')?.value.trim() ?? '';
                const qty      = row.querySelector('input[placeholder="Qty"]')?.value.trim()           ?? '';
                const price    = row.querySelector('input[placeholder="Unit Price (₱)"]')?.value.trim() ?? '';
                if (!targetId) { valid = false; alert('Please select a product from the dropdown for all item lines.'); }
                if (!qty || !price) valid = false;
                linesData.push({ targetId, qty, price });
            });
            if (!valid) { alert('Please fill out all fields in your item lines.'); return; }
        }

        const result = await runInsert(`insert_${currentTable}`, params);

        if (result?.affected_rows > 0)
        {
            const newId    = result.insert_id;
            await writeLog(currentTable, newId, `New ${currentTable} record added`);

            if (isTransaction)
            {
                const childKey = currentTable === 'orders' ? 'insert_orderdetail' : 'insert_purchasedetail';
                for (const line of linesData)
                    await runInsert(childKey, [newId, line.targetId, line.qty, line.price]);
            }

            alert(`Record posted successfully! (Generated ID: ${newId}).`);
        }
        else
        {
            alert('Insert failed. Please check your inputs.');
        }

        closeAndReset();
        runSelect(getActiveQueryName(), 'result-container');
    };
}
// js/modal.js
// All modal behaviour: view, edit, and add (insert) modes.
// Depends on: utils.js, api.js

// -------------------------------------------------------
// Columns that come from JOINs — shown in the edit form
// but excluded from UPDATE params since they're not real
// columns on the base table.
// -------------------------------------------------------
const TABLE_READONLY_COLS = {
    product: ['Supplier_Name'],   // comes from JOIN supplier
    orders:  ['Cust_Name'],       // comes from JOIN customer
};

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
    const btnUpdate    = document.getElementById('btnUpdate');
    const btnDelete    = document.getElementById('btnDelete');
    const btnClose     = document.getElementById('btnClose');

    showViewMode();

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

        btnUpdate.textContent   = 'Update Record';
        btnUpdate.className     = 'modal-btn warning';
        btnDelete.textContent   = 'Delete Record';
        btnDelete.className     = 'modal-btn danger';
        btnDelete.style.display = '';

        modal.style.display = 'flex';

        btnUpdate.onclick = function () { showEditMode(); };
        btnDelete.onclick = function ()
        {
            modal.style.display = 'none';
            handleDelete(currentTable, primaryId);
        };
        btnClose.onclick = function () { modal.style.display = 'none'; };
    }

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

        btnUpdate.textContent = 'Confirm Update';
        btnUpdate.className   = 'modal-btn warning';
        btnDelete.textContent = 'Cancel';
        btnDelete.className   = 'modal-btn cancel';

        btnUpdate.onclick = async function ()
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

        btnDelete.onclick = function () { showViewMode(); };
        btnClose.onclick  = function () { modal.style.display = 'none'; };
    }
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
    const btnUpdate    = document.getElementById('btnUpdate');
    const btnDelete    = document.getElementById('btnDelete');
    const btnClose     = document.getElementById('btnClose');

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

    btnUpdate.textContent   = 'Confirm Add';
    btnUpdate.className     = 'modal-btn confirm-add';
    btnDelete.textContent   = 'Cancel';
    btnDelete.className     = 'modal-btn cancel';
    btnDelete.style.display = '';

    modal.style.display = 'flex';

    btnUpdate.onclick = async function ()
    {
        const params = fields.map((field, i) =>
        {
            const input = document.getElementById(`add-field-${i}`);
            return input ? input.value.trim() : '';
        });

        const emptyField = fields.find((field, i) => params[i] === '');
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

    btnDelete.onclick = function () { modal.style.display = 'none'; };
    btnClose.onclick  = function () { modal.style.display = 'none'; };
}

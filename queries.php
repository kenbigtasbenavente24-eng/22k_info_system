<?php
// -------------------------------------------------------
// queries.php — Central registry for ALL your SQL queries
// Place this file in: htdocs/myapp/queries.php
// -------------------------------------------------------
// This is the ONLY file you need to edit when adding or
// changing queries. The API endpoints read from here.
//
// For DELETE and UPDATE, use ? as value placeholders.
// The matching $PARAM_TYPES entry tells PHP the data types:
//   's' = string,  'i' = integer,  'd' = double/float
// List one character per ? in the same order.
// -------------------------------------------------------


// ==== SELECT ============================================
// No parameters needed — just write the full query.
// Key = the name you pass as ?query= in your JS fetch call.

$SELECT_QUERIES = [

    'customer' =>
        "SELECT *
        FROM customer",

    'product' =>
        "SELECT p.Prod_ID, p.Prod_Name, p.Prod_Stock, p.Prod_Price, s.Supply_ID as Supplier_ID, s.Supply_Name as Supplier_Name
        FROM product p
        JOIN supplier s ON s.Supply_ID = p.Supply_ID",

    'supplier' =>
        "SELECT * FROM supplier",

    'orders'   =>
        "SELECT o.Order_ID, o.Order_Date, o.Cust_ID, c.Cust_Name
        FROM orders o
        JOIN customer c ON c.Cust_ID = o.Cust_ID",

    'payment'  =>
        "SELECT * FROM payment",

    'deliverystock' =>
        "SELECT * FROM deliverystock",
];

// ==== DELETE ============================================
// Use ? for values that come from the user/frontend.

$DELETE_QUERIES = [

    'customer' => [
        'sql'    => "DELETE FROM customer WHERE Cust_ID = ?",
        'types'  => 'i',   // one integer param
    ],

    'product' => [
        'sql'    => "DELETE FROM product WHERE Prod_ID = ?",
        'types'  => 'i',   // one integer param
    ],

    'supplier' => [
        'sql'    => "DELETE FROM supplier WHERE Supply_ID = ?",
        'types'  => 'i',   // one integer param
    ],
];

// ==== UPDATE ============================================
// List SET column params first, then the WHERE param(s) last.

$UPDATE_QUERIES = [

    'update_item_name' => [
        'sql'   => "UPDATE placeholder_table SET name = ? WHERE id = ?",
        'types' => 'si',  // string, then integer
    ],

    // 'update_status' => [
    //     'sql'   => "UPDATE my_table SET status = ? WHERE id = ?",
    //     'types' => 'si',
    // ],

];
?>

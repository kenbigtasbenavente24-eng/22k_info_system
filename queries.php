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
        "SELECT p.Prod_ID, p.Prod_Name, p.Prod_Stock, p.Prod_Price, 
        s.Supply_ID AS Supplier_ID, 
        s.Supply_Name AS Supplier_Name
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

    
     // ==== REPORT ================================
 
    //Customer Order History Report
    //Shows each customer, their orders, payment_reference and amount
    'report_customer_order_history' =>
        "SELECT
            c.Cust_Name AS Customer,
            c.Cust_PhoneNum AS Phone,
            o.Order_ID AS Order_ID,
            o.Order_Date AS Order_Date,
            p.Pay_Amount AS Amount,
            p.Pay_ID AS Payment_Ref
         FROM customer c
         JOIN orders o   ON o.Cust_ID  = c.Cust_ID
         LEFT JOIN payment p ON p.Order_ID = o.Order_ID
         ORDER BY c.Cust_Name, o.Order_Date",
 
    // Order Item Breakdown Report
    // Shows each order with the product details and supplier
    'report_order_item_breakdown' =>
        "SELECT
            o.Order_ID AS Order_ID,
            o.Order_Date AS Order_Date,
            c.Cust_Name  AS Customer,
            p.Prod_Name  AS Product,
            p.Prod_Price AS Unit_Price,
            s.Supply_Name AS Supplier
         FROM orders o
         JOIN customer c  ON c.Cust_ID  = o.Cust_ID
         JOIN orderdetails od ON od.Order_ID = o.Order_ID
         JOIN deliverystock ds ON ds.DStock_ID = od.DStock_ID
         JOIN product p ON p.Prod_ID = ds.Prod_ID
         JOIN supplier s ON s.Supply_ID = p.Supply_ID
         ORDER BY o.Order_Date DESC",
 
    // Supplier Product Catalog Report
    // Shows all suppliers and their products with stock levels
    'report_supplier_product_catalog' =>
        "SELECT
            s.Supply_Name AS Supplier,
            CONCAT(s.Supply_City, ', ', s.Supply_State) AS Supplier_Address,
            p.Prod_ID AS Product_ID,
            p.Prod_Name AS Product,
            p.Prod_Price AS Price,
            p.Prod_Stock AS Stock
         FROM supplier s
         JOIN product p ON p.Supply_ID = s.Supply_ID
         ORDER BY s.Supply_Name, p.Prod_Name",
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

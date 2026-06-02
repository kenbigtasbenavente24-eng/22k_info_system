<?php
// queries.php

$SELECT_QUERIES = [

    'customer' =>
        "SELECT *
        FROM customer",

    'product' =>
        "SELECT p.Prod_ID, p.Prod_Name, p.Prod_Stock, p.Prod_Price, 
        p.Supply_ID AS Supplier_ID, 
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

    // Keys must be delete_<tableName> to match the JS
    'delete_customer' => [
        'sql'   => "DELETE FROM customer WHERE Cust_ID = ?",
        'types' => 'i',
    ],

    'delete_product' => [
        'sql'   => "DELETE FROM product WHERE Prod_ID = ?",
        'types' => 'i',
    ],

    'delete_supplier' => [
        'sql'   => "DELETE FROM supplier WHERE Supply_ID = ?",
        'types' => 'i',
    ],

    'delete_orders' => [
        'sql'   => "DELETE FROM orders WHERE Order_ID = ?",
        'types' => 'i',
    ],

    'delete_payment' => [
        'sql'   => "DELETE FROM payment WHERE Payment_ID = ?",
        'types' => 'i',
    ],

    'delete_deliverystock' => [
        'sql'   => "DELETE FROM deliverystock WHERE DStock_ID = ?",
        'types' => 'i',
    ],

];

$UPDATE_QUERIES = [
    'update_customer' => [
        'sql'   => "UPDATE customer
                    SET Cust_Name = ?, Cust_Address = ?, Cust_PhoneNum = ?
                    WHERE Cust_ID = ?",
        'types' => 'sssi',
    ],
    'update_product' => [
        'sql'   => "UPDATE product
                    SET Prod_Name = ?, Prod_Stock = ?, Prod_Price = ?, Supply_ID = ?
                    WHERE Prod_ID = ?",
        'types' => 'ssssi',
    ],
    'update_supplier' => [
        'sql'   => "UPDATE supplier
                    SET Supply_Name = ?, Supply_PhoneNum = ?, Supply_City = ?, Supply_State = ?, Supply_ZipCode = ?
                    WHERE Supply_ID = ?",
        'types' => 'sssssi',
    ],
    'update_orders' => [
        'sql'   => "UPDATE orders
                    SET Order_Date = ?, Cust_ID = ?
                    WHERE Order_ID = ?",
        'types' => 'ssi',
    ],
    'update_payment' => [
        'sql'   => "UPDATE payment
                    SET Order_ID = ?, Pay_Method = ?, Pay_Amount = ?
                    WHERE Pay_ID = ?",
        'types' => 'isdi',
    ],
    'update_deliverystock' => [
        'sql'   => "UPDATE deliverystock
                    SET Prod_ID = ?, DStock_Date = ?, DStock_Stock = ?
                    WHERE DStock_ID = ?",
        'types' => 'isii',
    ],
];
?>
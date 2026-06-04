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
        "SELECT o.Order_ID, o.Order_Date, o.Cust_ID, c.Cust_Name, p.Pay_ID
        FROM orders o
        JOIN customer c ON c.Cust_ID = o.Cust_ID
        LEFT JOIN payment p ON p.Order_ID = o.Order_ID
        ORDER BY o.Order_Date DESC",

    'deliverystock' =>
        "SELECT ds.DStock_ID, ds.DStock_Date, ds.DStock_Stock, ds.Prod_ID, p.Prod_Name, p.Prod_Price
        FROM deliverystock ds
        JOIN product p ON p.Prod_ID = ds.Prod_ID",

    'purchase' =>
        "SELECT pu.Pur_ID, pu.Pur_Date, pu.Supply_ID, s.Supply_Name
        FROM purchase pu
        JOIN supplier s ON s.Supply_ID = pu.Supply_ID
        JOIN purchasedetails pd ON pd.Pur_ID = pu.Pur_ID
        JOIN product p ON p.Prod_ID = pd.Prod_ID
        ORDER BY pu.Pur_Date DESC",
    
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

    // ==== ORDER / PURCHASE LIST ================================

    'list_by_order' => [
        'sql'   => "SELECT od.OrDet_ID, pr.Prod_Name, od.OrDet_Quantity, od.OrDet_UnitPrice,
                    (od.OrDet_Quantity * od.OrDet_UnitPrice) AS Total_Price
                    FROM orders o
                    JOIN orderdetails od ON od.Order_ID = o.Order_ID
                    JOIN deliverystock ds ON ds.DStock_ID = od.DStock_ID
                    JOIN product pr ON pr.Prod_ID = ds.Prod_ID
                    WHERE o.Order_ID = ?",
        'types' => 'i',
    ],

    'payment_by_order' => [
        'sql'   => "SELECT * FROM payment WHERE Order_ID = ?",
        'types' => 'i',
    ],

    'list_by_purchase' => [
        'sql'   => "SELECT pd.PurDet_ID, pr.Prod_Name, pd.Pur_Quantity, pd.Pur_UnitPrice,
                    (pd.Pur_Quantity * pd.Pur_UnitPrice) AS Total_Price
                    FROM purchase pu
                    JOIN purchasedetails pd ON pd.Pur_ID = pu.Pur_ID
                    JOIN product pr ON pr.Prod_ID = pd.Prod_ID
                    WHERE pu.Pur_ID = ?",
        'types' => 'i',
    ],
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
    'delete_deliverystock' => [
        'sql'   => "DELETE FROM deliverystock WHERE DStock_ID = ?",
        'types' => 'i',
    ],
    'delete_purchase' => [
        'sql'   => "DELETE FROM purchase WHERE Pur_ID = ?",
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
    'update_payment' => [
        'sql'   => "UPDATE payment
                    SET Pay_Method = ?, Pay_Amount = ?
                    WHERE Pay_ID = ?",
        'types' => 'sdi',
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
    'update_deliverystock' => [
        'sql'   => "UPDATE deliverystock
                    SET DStock_Date = ?, DStock_Stock = ?, Prod_ID = ?
                    WHERE DStock_ID = ?",
        'types' => 'siii',
    ],
    'update_orderdetail' => [
        'sql'   => "UPDATE orderdetails
                    SET OrDet_Quantity = ?, OrDet_UnitPrice = ?
                    WHERE OrDet_ID = ?",
        'types' => 'idi',
    ],
    'update_purchasedetail' => [
        'sql'   => "UPDATE purchasedetails
                    SET Pur_Quantity = ?, Pur_UnitPrice = ?
                    WHERE PurDet_ID = ?",
        'types' => 'idi',
    ],
];

$INSERT_QUERIES = [

    'insert_customer' => [
        'sql'   => "INSERT INTO customer (Cust_Name, Cust_Address, Cust_PhoneNum)
                    VALUES (?, ?, ?)",
        'types' => 'sss',
    ],
    'insert_product' => [
        'sql'   => "INSERT INTO product (Prod_Name, Prod_Stock, Prod_Price, Supply_ID)
                    VALUES (?, ?, ?, ?)",
        'types' => 'sddi',
    ],
    'insert_supplier' => [
        'sql'   => "INSERT INTO supplier (Supply_Name, Supply_PhoneNum, Supply_City, Supply_State, Supply_ZipCode)
                    VALUES (?, ?, ?, ?, ?)",
        'types' => 'sssss',
    ],
    'insert_orders' => [
        'sql'   => "INSERT INTO orders (Order_Date, Cust_ID)
                    VALUES (?, ?)",
        'types' => 'si',
    ],
    'insert_purchase' => [
        'sql'   => "INSERT INTO purchase (Pur_Date, Supply_ID)
                    VALUES (?, ?)",
        'types' => 'si',
    ],
    'insert_payment' => [
        'sql'   => "INSERT INTO payment (Order_ID, Pay_Method, Pay_Amount)
                    VALUES (?, ?, ?)",
        'types' => 'isd',
    ],
    'insert_orderdetail' => [
        'sql'   => "INSERT INTO orderdetails (Order_ID, DStock_ID, OrDet_Quantity, OrDet_UnitPrice)
                    VALUES (?, ?, ?, ?)",
        'types' => 'iiid',
    ],
    'insert_purchasedetail' => [
        'sql'   => "INSERT INTO purchasedetails (Pur_ID, Prod_ID, Pur_Quantity, Pur_UnitPrice)
                    VALUES (?, ?, ?, ?)",
        'types' => 'iiid',
    ],
];
?>
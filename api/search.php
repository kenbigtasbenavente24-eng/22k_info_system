<?php
// api/search.php
// Provides live-search lookups for the Add modal dropdowns.

header('Content-Type: application/json');
require_once '../db.php';
require_once '../queries.php';

$query  = $_GET['query']  ?? '';
$term   = '%' . trim($_GET['term'] ?? '') . '%';

$map = [
    'customer'     => ["SELECT Cust_ID AS id, Cust_Name AS label FROM customer WHERE Cust_Name LIKE ? LIMIT 10",     's'],
    'supplier'     => ["SELECT Supply_ID AS id, Supply_Name AS label FROM supplier WHERE Supply_Name LIKE ? LIMIT 10", 's'],
    'dstock'       => ["SELECT ds.DStock_ID AS id, p.Prod_Name AS label, p.Prod_Price AS price
                        FROM deliverystock ds
                        JOIN product p ON p.Prod_ID = ds.Prod_ID
                        WHERE p.Prod_Name LIKE ? LIMIT 10",  's'],
    'product'      => ["SELECT Prod_ID AS id, Prod_Name AS label FROM product WHERE Prod_Name LIKE ? LIMIT 10",       's'],
];

if (!isset($map[$query])) {
    echo json_encode(['data' => []]);
    exit;
}

[$sql, $types] = $map[$query];
$conn = get_connection();

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, $term);
$stmt->execute();
$result = $stmt->get_result();

$rows = [];
while ($row = $result->fetch_assoc()) $rows[] = $row;

echo json_encode(['data' => $rows]);
$stmt->close();
$conn->close();
?>
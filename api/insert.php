<?php
// api/insert.php
// Mirrors the structure of delete.php and update.php.
// Expects a JSON body: { "query": "insert_customer", "params": ["John", "123 St", "09171234567"] }

header('Content-Type: application/json');

require_once '../db.php';
require_once '../queries.php';

$conn = get_connection();

// --- Read and decode the request body ---
$body = json_decode(file_get_contents('php://input'), true);

if (!$body || !isset($body['query'], $body['params'])) {
    echo json_encode(['error' => 'Invalid request body. Expected: { query, params }.']);
    exit;
}

$queryName = $body['query'];
$params    = $body['params'];

// --- Look up the query in the INSERT map ---
if (!isset($INSERT_QUERIES[$queryName])) {
    echo json_encode(['error' => "Unknown insert query: '$queryName'."]);
    exit;
}

$queryDef = $INSERT_QUERIES[$queryName];
$sql      = $queryDef['sql'];
$types    = $queryDef['types'];

// --- Prepare and execute ---
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
    exit;
}

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();

if ($stmt->error) {
    echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
    exit;
}

// Return the new row's auto-increment ID alongside affected_rows
echo json_encode([
    'affected_rows' => $stmt->affected_rows,
    'insert_id'     => $stmt->insert_id,
]);

$stmt->close();
$conn->close();

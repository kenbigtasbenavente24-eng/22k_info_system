<?php
// api/select.php — Runs a named SELECT query

header('Content-Type: application/json');

require_once '../db.php';
require_once '../queries.php';

// Read the query name from the URL: ?query=your_query_name
$query_name = $_GET['query'] ?? '';

// Reject unknown query names (prevents arbitrary SQL being injected via this param)
if (!array_key_exists($query_name, $SELECT_QUERIES)) {
    http_response_code(400);
    echo json_encode(['error' => "Unknown SELECT query: '$query_name'"]);
    exit;
}

$queryDef = $SELECT_QUERIES[$query_name];
$conn = get_connection();

// Parameterized query (e.g. payment_by_order)
if (is_array($queryDef))
{
    $id   = $_GET['id'] ?? null;
    $stmt = $conn->prepare($queryDef['sql']);
    $stmt->bind_param($queryDef['types'], $id);
    $stmt->execute();
    $result = $stmt->get_result();
}
// Plain query (all other selects)
else
{
    $result = $conn->query($queryDef);
}

if (!$result) {
    http_response_code(500);
    echo json_encode(['error' => $conn->error]);
    $conn->close();
    exit;
}

// Collect all rows into an array and return as JSON
$rows = [];
while ($row = $result->fetch_assoc()) {
    $rows[] = $row;
}

echo json_encode(['data' => $rows]);
$conn->close();
?>

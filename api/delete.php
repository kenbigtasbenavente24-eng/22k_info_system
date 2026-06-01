<?php
// -------------------------------------------------------
// api/delete.php — Runs a named DELETE query
// Place this file in: htdocs/myapp/api/delete.php
//
// Usage (POST, JSON body):
//   fetch('api/delete.php', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ query: 'delete_item_by_id', params: [42] })
//   })
//
// Response (JSON):
//   { "affected_rows": 1 }
//   { "error": "message" }   ← on failure
// -------------------------------------------------------
header('Content-Type: application/json');

require_once '../db.php';
require_once '../queries.php';

// Read and decode the JSON body sent by the browser
$body = json_decode(file_get_contents('php://input'), true);

$query_name = $body['query']  ?? '';
$params     = $body['params'] ?? [];   // array of values matching the ? placeholders

if (!array_key_exists($query_name, $DELETE_QUERIES)) {
    http_response_code(400);
    echo json_encode(['error' => "Unknown DELETE query: '$query_name'"]);
    exit;
}

$entry = $DELETE_QUERIES[$query_name];
$conn  = get_connection();
$stmt  = $conn->prepare($entry['sql']);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
    $conn->close();
    exit;
}

// Bind parameters dynamically using the type string from queries.php (e.g. 'i', 'si', 'ss')
if (!empty($params))
{
    $refs = [$entry['types']];
    foreach ($params as &$p)
    {
        $refs[] = &$p;
    }
    call_user_func_array([$stmt, 'bind_param'], $refs);
}

if (!$stmt->execute())
{
    http_response_code(500);
    echo json_encode(['error' => 'Execution failed: ' . $stmt->error]);
    $stmt->close();
    $conn->close();
    exit;
}

echo json_encode(['affected_rows' => $stmt->affected_rows]);

$stmt->close();
$conn->close();
?>
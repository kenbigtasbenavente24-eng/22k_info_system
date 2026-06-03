<?php
// api/update.php — Runs a named UPDATE query with parameters from the request body

ini_set('display_errors', 0);
error_reporting(E_ALL);
ob_start();

header('Content-Type: application/json');

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../queries.php';

$body       = json_decode(file_get_contents('php://input'), true);
$query_name = $body['query']  ?? '';
$params     = $body['params'] ?? [];

if (!array_key_exists($query_name, $UPDATE_QUERIES)) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['error' => "Unknown UPDATE query: '$query_name'"]);
    exit;
}

$entry = $UPDATE_QUERIES[$query_name];
$conn  = get_connection();
$stmt  = $conn->prepare($entry['sql']);

if (!$stmt) {
    ob_end_clean();
    echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
    $conn->close();
    exit;
}

try {
    $params = array_values($params);
    $stmt->bind_param($entry['types'], ...$params);
    $stmt->execute();

    ob_end_clean();
    echo json_encode(['affected_rows' => $stmt->affected_rows]);

} catch (\Throwable $e) {
    ob_end_clean();
    echo json_encode([
        'error'          => $e->getMessage(),
        'query'          => $query_name,
        'received_params'=> $params,
        'expected_types' => $entry['types'],
        'param_count'    => count($params),
        'type_count'     => strlen($entry['types']),
    ]);
} finally {
    $stmt->close();
    $conn->close();
}
?>
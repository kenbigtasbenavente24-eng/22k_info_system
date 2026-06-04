<?php
// api/changelog.php
// GET  ?action=fetch              → returns all changelog rows, newest first
// POST {table, record_id, action} → inserts a new log entry

header('Content-Type: application/json');
require_once '../db.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = get_connection();

// ---- READ ----
if ($method === 'GET' && ($_GET['action'] ?? '') === 'fetch')
{
    $result = $conn->query(
        "SELECT Log_ID, DATE_FORMAT(Log_Date, '%Y-%m-%d %H:%i:%s') AS Log_Date,
                Log_Table, Log_RecordID, Log_Action
         FROM changelog
         ORDER BY Log_Date DESC"
    );

    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    echo json_encode(['data' => $rows]);
    $conn->close();
    exit;
}

// ---- WRITE ----
if ($method === 'POST')
{
    $body      = json_decode(file_get_contents('php://input'), true);
    $table     = trim($body['table']     ?? '');
    $recordId  = intval($body['record_id'] ?? 0);
    $action    = trim($body['action']    ?? '');

    if (!$table || !$recordId || !$action)
    {
        echo json_encode(['error' => 'Missing required fields.']);
        exit;
    }

    $stmt = $conn->prepare(
        "INSERT INTO changelog (Log_Table, Log_RecordID, Log_Action) VALUES (?, ?, ?)"
    );
    $stmt->bind_param('sis', $table, $recordId, $action);
    $stmt->execute();

    echo json_encode(['success' => true, 'log_id' => $conn->insert_id]);
    $stmt->close();
    $conn->close();
    exit;
}

echo json_encode(['error' => 'Invalid request.']);
?>
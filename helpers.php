<?php
declare(strict_types=1);

function json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function json_out(mixed $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $code): void
{
    json_out(['message' => $message], $code);
}

function uuid_v4(): string
{
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function request_path(): string
{
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $p = parse_url($uri, PHP_URL_PATH);
    if (!is_string($p) || $p === '') {
        return '/';
    }
    return rtrim($p, '/') ?: '/';
}

function dt_iso(?string $s): ?string
{
    if ($s === null || $s === '') {
        return null;
    }
    $t = strtotime($s);
    if ($t === false) {
        return $s;
    }
    return date('c', $t);
}

function coral_row(array $r): array
{
    return [
        'id' => $r['id'],
        'name' => $r['name'],
        'image' => $r['image'],
        'description' => $r['description'],
        'price' => (int) $r['price'],
        'stock' => (int) $r['stock'],
    ];
}

function adoption_row(array $r): array
{
    return [
        'id' => $r['id'],
        'userId' => $r['user_id'],
        'coralId' => $r['coral_id'],
        'coralName' => $r['coral_name'],
        'coralImage' => $r['coral_image'],
        'amount' => (int) $r['amount'],
        'price' => (int) $r['price'],
        'adoptedAt' => dt_iso($r['adopted_at']),
    ];
}

function donation_row(array $r): array
{
    return [
        'id' => $r['id'],
        'userId' => $r['user_id'],
        'amount' => (int) $r['amount'],
        'donorName' => $r['donor_name'],
        'donorEmail' => $r['donor_email'],
        'donatedAt' => dt_iso($r['donated_at']),
    ];
}

function work_row(array $r, ?int $volunteerCount = null): array
{
    $row = [
        'id' => $r['id'],
        'title' => $r['title'],
        'description' => $r['description'],
        'location' => $r['location'],
        'scheduledFor' => dt_iso($r['scheduled_for']),
        'endDate' => $r['end_date'] ? dt_iso($r['end_date']) : null,
        'hours' => (int) $r['hours'],
        'status' => $r['status'],
        'category' => $r['category'],
        'maxVolunteers' => $r['max_volunteers'] !== null ? (int) $r['max_volunteers'] : null,
    ];
    if ($volunteerCount !== null) {
        $row['volunteerCount'] = $volunteerCount;
    }
    return $row;
}

function signup_row(array $r): array
{
    return [
        'id' => $r['id'],
        'userId' => $r['user_id'],
        'workId' => $r['work_id'],
        'signedUpAt' => dt_iso($r['signed_up_at']),
    ];
}

function user_session_id(): ?string
{
    $id = $_SESSION['user_id'] ?? null;
    return is_string($id) && $id !== '' ? $id : null;
}

function require_auth(): string
{
    $id = user_session_id();
    if ($id === null) {
        json_error('Not authenticated', 401);
    }
    return $id;
}

function require_admin(PDO $pdo): array
{
    $userId = require_auth();
    $st = $pdo->prepare('SELECT id, username, is_admin FROM users WHERE id = ?');
    $st->execute([$userId]);
    $u = $st->fetch();
    if (!$u || !(int) $u['is_admin']) {
        json_error('Admin access required', 403);
    }
    return $u;
}

function sync_volunteer_work_states(PDO $pdo): void
{
    $pdo->exec(
        "UPDATE volunteer_works SET status = 'completed'
         WHERE status NOT IN ('completed','cancelled')
         AND COALESCE(end_date, scheduled_for) < NOW()",
    );

    $pdo->exec(
        "UPDATE volunteer_works w
         INNER JOIN (
           SELECT work_id, COUNT(*) AS c FROM volunteer_signups GROUP BY work_id
         ) s ON s.work_id = w.id
         SET w.status = 'closed'
         WHERE w.status = 'open' AND w.max_volunteers IS NOT NULL AND s.c >= w.max_volunteers",
    );
}

function get_signup_counts(PDO $pdo): array
{
    $st = $pdo->query('SELECT work_id, COUNT(*) AS c FROM volunteer_signups GROUP BY work_id');
    $out = [];
    foreach ($st->fetchAll() as $row) {
        $out[$row['work_id']] = (int) $row['c'];
    }
    return $out;
}

function volunteer_work_sort_rank(string $status): int
{
    return match ($status) {
        'open' => 0,
        'ongoing' => 1,
        'closed' => 2,
        'completed' => 3,
        default => 4,
    };
}

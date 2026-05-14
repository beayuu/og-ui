<?php
declare(strict_types=1);

const EXPENSE_CATEGORIES = [
    ['id' => 'restoration', 'label' => 'Coral Restoration', 'percent' => 45, 'color' => '#21bcee'],
    ['id' => 'cleanup', 'label' => 'Reef Cleanup', 'percent' => 25, 'color' => '#116bf8'],
    ['id' => 'education', 'label' => 'Marine Education', 'percent' => 15, 'color' => '#7c3aed'],
    ['id' => 'equipment', 'label' => 'Equipment & Boats', 'percent' => 10, 'color' => '#f59e0b'],
    ['id' => 'operations', 'label' => 'Operations', 'percent' => 5, 'color' => '#94a3b8'],
];

const VOLUNTEER_STATUSES = ['open', 'closed', 'completed', 'ongoing', 'cancelled'];
const VOLUNTEER_CATEGORIES = ['cleanup', 'replanting', 'survey', 'outreach', 'other'];

function run_api(): void
{
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = request_path();

    if ($path === '/api/auth/signup' && $method === 'POST') {
        handle_signup($pdo);
    }
    if ($path === '/api/auth/login' && $method === 'POST') {
        handle_login($pdo);
    }
    if ($path === '/api/auth/logout' && $method === 'POST') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        json_out(['ok' => true]);
    }
    if ($path === '/api/auth/me' && $method === 'GET') {
        handle_me($pdo);
    }

    if ($path === '/api/corals' && $method === 'GET') {
        $st = $pdo->query('SELECT * FROM corals ORDER BY name ASC');
        json_out(array_map('coral_row', $st->fetchAll()));
    }

    if ($path === '/api/adoptions' && $method === 'GET') {
        $uid = require_auth();
        $st = $pdo->prepare('SELECT * FROM adoptions WHERE user_id = ? ORDER BY adopted_at DESC');
        $st->execute([$uid]);
        json_out(array_map('adoption_row', $st->fetchAll()));
    }
    if ($path === '/api/adoptions' && $method === 'POST') {
        handle_create_adoption($pdo);
    }
    if (preg_match('#^/api/adoptions/([^/]+)$#', $path, $m) && $method === 'DELETE') {
        $uid = require_auth();
        $st = $pdo->prepare('SELECT id FROM adoptions WHERE id = ? AND user_id = ?');
        $st->execute([$m[1], $uid]);
        if (!$st->fetch()) {
            json_error('Adoption not found', 404);
        }
        $pdo->prepare('DELETE FROM adoptions WHERE id = ? AND user_id = ?')->execute([$m[1], $uid]);
        json_out(['ok' => true]);
    }

    if ($path === '/api/donations' && $method === 'GET') {
        $uid = require_auth();
        $st = $pdo->prepare('SELECT * FROM donations WHERE user_id = ? ORDER BY donated_at DESC');
        $st->execute([$uid]);
        json_out(array_map('donation_row', $st->fetchAll()));
    }
    if ($path === '/api/donations' && $method === 'POST') {
        handle_create_donation($pdo);
    }

    if ($path === '/api/volunteer-works' && $method === 'GET') {
        sync_volunteer_work_states($pdo);
        $counts = get_signup_counts($pdo);
        $st = $pdo->query('SELECT * FROM volunteer_works');
        $rows = $st->fetchAll();
        usort($rows, function ($a, $b) use ($counts) {
            $sa = volunteer_work_sort_rank($a['status']);
            $sb = volunteer_work_sort_rank($b['status']);
            if ($sa !== $sb) {
                return $sa <=> $sb;
            }
            return strtotime($a['scheduled_for']) <=> strtotime($b['scheduled_for']);
        });
        $out = [];
        foreach ($rows as $r) {
            $out[] = work_row($r, $counts[$r['id']] ?? 0);
        }
        json_out($out);
    }
    if (preg_match('#^/api/volunteer-works/([^/]+)/signup$#', $path, $m) && $method === 'POST') {
        handle_volunteer_signup($pdo, $m[1]);
    }
    if (preg_match('#^/api/volunteer-works/([^/]+)/signup$#', $path, $m) && $method === 'DELETE') {
        handle_volunteer_signup_delete($pdo, $m[1]);
    }

    if ($path === '/api/volunteer-signups' && $method === 'GET') {
        $uid = require_auth();
        sync_volunteer_work_states($pdo);
        $st = $pdo->prepare('SELECT * FROM volunteer_signups WHERE user_id = ? ORDER BY signed_up_at DESC');
        $st->execute([$uid]);
        $signups = $st->fetchAll();
        $out = [];
        foreach ($signups as $s) {
            $wst = $pdo->prepare('SELECT * FROM volunteer_works WHERE id = ?');
            $wst->execute([$s['work_id']]);
            $w = $wst->fetch();
            if (!$w) {
                continue;
            }
            $out[] = array_merge(signup_row($s), ['work' => work_row($w)]);
        }
        json_out($out);
    }

    if ($path === '/api/expense-breakdown' && $method === 'GET') {
        $adTotal = (int) $pdo->query(
            'SELECT COALESCE(SUM(amount * price), 0) FROM adoptions',
        )->fetchColumn();
        $donTotal = (int) $pdo->query(
            'SELECT COALESCE(SUM(amount), 0) FROM donations',
        )->fetchColumn();
        $total = $adTotal + $donTotal;
        $cats = [];
        foreach (EXPENSE_CATEGORIES as $c) {
            $cats[] = [
                'id' => $c['id'],
                'label' => $c['label'],
                'percent' => $c['percent'],
                'color' => $c['color'],
                'amount' => (int) round($total * $c['percent'] / 100),
            ];
        }
        json_out(['totalRaised' => $total, 'categories' => $cats]);
    }

    // --- Admin ---
    if ($path === '/api/admin/corals' && $method === 'POST') {
        require_admin($pdo);
        $b = json_input();
        $err = validate_coral_input($b, false);
        if ($err) {
            json_error($err, 400);
        }
        $id = uuid_v4();
        $st = $pdo->prepare(
            'INSERT INTO corals (id, name, image, description, price, stock) VALUES (?,?,?,?,?,?)',
        );
        $st->execute([
            $id,
            trim((string) $b['name']),
            trim((string) $b['image']),
            trim((string) ($b['description'] ?? '')),
            (int) $b['price'],
            (int) $b['stock'],
        ]);
        $st2 = $pdo->prepare('SELECT * FROM corals WHERE id = ?');
        $st2->execute([$id]);
        json_out(coral_row($st2->fetch()), 201);
    }
    if (preg_match('#^/api/admin/corals/([^/]+)$#', $path, $m) && $method === 'PATCH') {
        require_admin($pdo);
        $b = json_input();
        $err = validate_coral_input($b, true);
        if ($err) {
            json_error($err, 400);
        }
        $st = $pdo->prepare('SELECT * FROM corals WHERE id = ?');
        $st->execute([$m[1]]);
        $row = $st->fetch();
        if (!$row) {
            json_error('Coral not found', 404);
        }
        $name = array_key_exists('name', $b) ? trim((string) $b['name']) : $row['name'];
        $image = array_key_exists('image', $b) ? trim((string) $b['image']) : $row['image'];
        $desc = array_key_exists('description', $b) ? trim((string) $b['description']) : $row['description'];
        $price = array_key_exists('price', $b) ? (int) $b['price'] : (int) $row['price'];
        $stock = array_key_exists('stock', $b) ? (int) $b['stock'] : (int) $row['stock'];
        $pdo->prepare('UPDATE corals SET name=?, image=?, description=?, price=?, stock=? WHERE id=?')
            ->execute([$name, $image, $desc, $price, $stock, $m[1]]);
        $st->execute([$m[1]]);
        json_out(coral_row($st->fetch()));
    }
    if (preg_match('#^/api/admin/corals/([^/]+)$#', $path, $m) && $method === 'DELETE') {
        require_admin($pdo);
        $st = $pdo->prepare('DELETE FROM corals WHERE id = ?');
        $st->execute([$m[1]]);
        if ($st->rowCount() === 0) {
            json_error('Coral not found', 404);
        }
        json_out(['ok' => true]);
    }

    if ($path === '/api/admin/volunteer-works' && $method === 'POST') {
        require_admin($pdo);
        $b = json_input();
        $err = volunteer_work_from_body($b, null);
        if (is_string($err)) {
            json_error($err, 400);
        }
        /** @var array $row */
        $row = $err;
        $id = uuid_v4();
        $st = $pdo->prepare(
            'INSERT INTO volunteer_works (id, title, description, location, scheduled_for, end_date, hours, status, category, max_volunteers)
             VALUES (?,?,?,?,?,?,?,?,?,?)',
        );
        $st->execute([
            $id,
            $row['title'],
            $row['description'],
            $row['location'],
            $row['scheduled_for'],
            $row['end_date'],
            $row['hours'],
            $row['status'],
            $row['category'],
            $row['max_volunteers'],
        ]);
        $st2 = $pdo->prepare('SELECT * FROM volunteer_works WHERE id = ?');
        $st2->execute([$id]);
        json_out(work_row($st2->fetch()), 201);
    }
    if (preg_match('#^/api/admin/volunteer-works/([^/]+)$#', $path, $m) && $method === 'PATCH') {
        require_admin($pdo);
        $b = json_input();
        $st = $pdo->prepare('SELECT * FROM volunteer_works WHERE id = ?');
        $st->execute([$m[1]]);
        $existing = $st->fetch();
        if (!$existing) {
            json_error('Volunteer work not found', 404);
        }
        $merged = volunteer_work_from_body($b, $existing);
        if (is_string($merged)) {
            json_error($merged, 400);
        }
        $pdo->prepare(
            'UPDATE volunteer_works SET title=?, description=?, location=?, scheduled_for=?, end_date=?, hours=?, status=?, category=?, max_volunteers=? WHERE id=?',
        )->execute([
            $merged['title'],
            $merged['description'],
            $merged['location'],
            $merged['scheduled_for'],
            $merged['end_date'],
            $merged['hours'],
            $merged['status'],
            $merged['category'],
            $merged['max_volunteers'],
            $m[1],
        ]);
        $st->execute([$m[1]]);
        json_out(work_row($st->fetch()));
    }
    if (preg_match('#^/api/admin/volunteer-works/([^/]+)$#', $path, $m) && $method === 'DELETE') {
        require_admin($pdo);
        $pdo->prepare('DELETE FROM volunteer_signups WHERE work_id = ?')->execute([$m[1]]);
        $st = $pdo->prepare('DELETE FROM volunteer_works WHERE id = ?');
        $st->execute([$m[1]]);
        if ($st->rowCount() === 0) {
            json_error('Volunteer work not found', 404);
        }
        json_out(['ok' => true]);
    }

    if ($path === '/api/admin/adoptions' && $method === 'GET') {
        require_admin($pdo);
        $st = $pdo->query('SELECT * FROM adoptions ORDER BY adopted_at DESC');
        $rows = $st->fetchAll();
        $users = $pdo->query('SELECT id, username FROM users')->fetchAll();
        $byId = [];
        foreach ($users as $u) {
            $byId[$u['id']] = $u['username'];
        }
        $out = [];
        foreach ($rows as $r) {
            $a = adoption_row($r);
            $a['username'] = $byId[$r['user_id']] ?? 'Unknown';
            $out[] = $a;
        }
        json_out($out);
    }
    if ($path === '/api/admin/donations' && $method === 'GET') {
        require_admin($pdo);
        $st = $pdo->query('SELECT * FROM donations ORDER BY donated_at DESC');
        $rows = $st->fetchAll();
        $users = $pdo->query('SELECT id, username FROM users')->fetchAll();
        $byId = [];
        foreach ($users as $u) {
            $byId[$u['id']] = $u['username'];
        }
        $out = [];
        foreach ($rows as $r) {
            $d = donation_row($r);
            $d['username'] = $byId[$r['user_id']] ?? 'Unknown';
            $out[] = $d;
        }
        json_out($out);
    }
    if ($path === '/api/admin/users' && $method === 'GET') {
        require_admin($pdo);
        $users = $pdo->query('SELECT id, username, is_admin FROM users ORDER BY username ASC')->fetchAll();
        $out = [];
        foreach ($users as $u) {
            $c1 = $pdo->prepare('SELECT COUNT(*) FROM adoptions WHERE user_id = ?');
            $c1->execute([$u['id']]);
            $c2 = $pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM donations WHERE user_id = ?');
            $c2->execute([$u['id']]);
            $c3 = $pdo->prepare('SELECT COUNT(*) FROM volunteer_signups WHERE user_id = ?');
            $c3->execute([$u['id']]);
            $out[] = [
                'id' => $u['id'],
                'username' => $u['username'],
                'isAdmin' => (bool) $u['is_admin'],
                'adoptionCount' => (int) $c1->fetchColumn(),
                'donationTotal' => (int) $c2->fetchColumn(),
                'volunteerShifts' => (int) $c3->fetchColumn(),
            ];
        }
        json_out($out);
    }
    if ($path === '/api/admin/volunteer-signups' && $method === 'GET') {
        require_admin($pdo);
        $st = $pdo->query('SELECT * FROM volunteer_signups');
        $signups = $st->fetchAll();
        $works = $pdo->query('SELECT * FROM volunteer_works')->fetchAll();
        $wBy = [];
        foreach ($works as $w) {
            $wBy[$w['id']] = $w;
        }
        $users = $pdo->query('SELECT id, username FROM users')->fetchAll();
        $uBy = [];
        foreach ($users as $u) {
            $uBy[$u['id']] = $u['username'];
        }
        $out = [];
        foreach ($signups as $s) {
            $w = $wBy[$s['work_id']] ?? null;
            $out[] = array_merge(signup_row($s), [
                'username' => $uBy[$s['user_id']] ?? 'Unknown',
                'workTitle' => $w ? $w['title'] : 'Unknown',
            ]);
        }
        json_out($out);
    }

    json_error('Not found', 404);
}

function handle_me(PDO $pdo): void
{
    $uid = user_session_id();
    if ($uid === null) {
        json_error('Not authenticated', 401);
    }
    $st = $pdo->prepare('SELECT id, username, is_admin FROM users WHERE id = ?');
    $st->execute([$uid]);
    $u = $st->fetch();
    if (!$u) {
        json_error('Not authenticated', 401);
    }
    json_out([
        'id' => $u['id'],
        'username' => $u['username'],
        'isAdmin' => (bool) $u['is_admin'],
    ]);
}

function handle_signup(PDO $pdo): void
{
    $b = json_input();
    $user = trim((string) ($b['username'] ?? ''));
    $pass = (string) ($b['password'] ?? '');
    if (strlen($user) < 3) {
        json_error('Username must be at least 3 characters', 400);
    }
    if (strlen($pass) < 6) {
        json_error('Password must be at least 6 characters', 400);
    }
    $st = $pdo->prepare('SELECT id FROM users WHERE username = ?');
    $st->execute([$user]);
    if ($st->fetch()) {
        json_error('Username is already taken', 409);
    }
    $count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $isFirst = $count === 0;
    $id = uuid_v4();
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $pdo->prepare('INSERT INTO users (id, username, password, is_admin) VALUES (?,?,?,?)')
        ->execute([$id, $user, $hash, $isFirst ? 1 : 0]);
    $_SESSION['user_id'] = $id;
    json_out(['id' => $id, 'username' => $user, 'isAdmin' => $isFirst], 201);
}

function handle_login(PDO $pdo): void
{
    $b = json_input();
    $user = trim((string) ($b['username'] ?? ''));
    $pass = (string) ($b['password'] ?? '');
    if (strlen($user) < 3 || strlen($pass) < 6) {
        json_error('Invalid username or password', 401);
    }
    $st = $pdo->prepare('SELECT * FROM users WHERE username = ?');
    $st->execute([$user]);
    $row = $st->fetch();
    if (!$row || !password_verify($pass, $row['password'])) {
        json_error('Invalid username or password', 401);
    }
    $_SESSION['user_id'] = $row['id'];
    json_out([
        'id' => $row['id'],
        'username' => $row['username'],
        'isAdmin' => (bool) $row['is_admin'],
    ]);
}

function handle_create_adoption(PDO $pdo): void
{
    $uid = require_auth();
    $b = json_input();
    $coralId = trim((string) ($b['coralId'] ?? ''));
    $amount = (int) ($b['amount'] ?? 0);
    if ($coralId === '') {
        json_error('Pick a coral', 400);
    }
    if ($amount < 1) {
        json_error('Amount must be positive', 400);
    }
    $pdo->beginTransaction();
    try {
        $st = $pdo->prepare('SELECT * FROM corals WHERE id = ? FOR UPDATE');
        $st->execute([$coralId]);
        $c = $st->fetch();
        if (!$c) {
            $pdo->rollBack();
            json_error('Coral not found', 404);
        }
        if ((int) $c['stock'] < $amount) {
            $pdo->rollBack();
            json_error('Not enough stock available for that amount', 400);
        }
        $newStock = (int) $c['stock'] - $amount;
        $pdo->prepare('UPDATE corals SET stock = ? WHERE id = ?')->execute([$newStock, $coralId]);
        $aid = uuid_v4();
        $pdo->prepare(
            'INSERT INTO adoptions (id, user_id, coral_id, coral_name, coral_image, amount, price) VALUES (?,?,?,?,?,?,?)',
        )->execute([
            $aid,
            $uid,
            $c['id'],
            $c['name'],
            $c['image'],
            $amount,
            (int) $c['price'],
        ]);
        $pdo->commit();
        $st2 = $pdo->prepare('SELECT * FROM adoptions WHERE id = ?');
        $st2->execute([$aid]);
        json_out(adoption_row($st2->fetch()), 201);
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handle_create_donation(PDO $pdo): void
{
    $uid = require_auth();
    $b = json_input();
    $amount = (int) ($b['amount'] ?? 0);
    if ($amount < 1) {
        json_error('Minimum donation is $1', 400);
    }
    if ($amount > 100000) {
        json_error('Maximum donation is $100,000', 400);
    }
    $name = isset($b['donorName']) ? trim((string) $b['donorName']) : null;
    $email = isset($b['donorEmail']) ? trim((string) $b['donorEmail']) : null;
    if ($email === '') {
        $email = null;
    }
    if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Invalid email address', 400);
    }
    $id = uuid_v4();
    $pdo->prepare(
        'INSERT INTO donations (id, user_id, amount, donor_name, donor_email) VALUES (?,?,?,?,?)',
    )->execute([$id, $uid, $amount, $name ?: null, $email]);
    $st = $pdo->prepare('SELECT * FROM donations WHERE id = ?');
    $st->execute([$id]);
    json_out(donation_row($st->fetch()), 201);
}

function handle_volunteer_signup(PDO $pdo, string $workId): void
{
    $uid = require_auth();
    sync_volunteer_work_states($pdo);
    $wst = $pdo->prepare('SELECT * FROM volunteer_works WHERE id = ?');
    $wst->execute([$workId]);
    $work = $wst->fetch();
    if (!$work) {
        json_error('Work not found', 404);
    }
    if ($work['status'] !== 'open') {
        json_error('This opportunity is no longer open for sign-ups', 400);
    }
    $ex = $pdo->prepare('SELECT * FROM volunteer_signups WHERE user_id = ? AND work_id = ?');
    $ex->execute([$uid, $workId]);
    if ($row = $ex->fetch()) {
        json_out(signup_row($row), 201);
    }
    $cst = $pdo->prepare('SELECT COUNT(*) FROM volunteer_signups WHERE work_id = ?');
    $cst->execute([$workId]);
    $count = (int) $cst->fetchColumn();
    if ($work['max_volunteers'] !== null && $count >= (int) $work['max_volunteers']) {
        json_error('This opportunity is full', 400);
    }
    $id = uuid_v4();
    $pdo->prepare('INSERT INTO volunteer_signups (id, user_id, work_id) VALUES (?,?,?)')
        ->execute([$id, $uid, $workId]);
    $cst->execute([$workId]);
    $newCount = (int) $cst->fetchColumn();
    if (
        $work['max_volunteers'] !== null
        && $newCount >= (int) $work['max_volunteers']
        && $work['status'] === 'open'
    ) {
        $pdo->prepare("UPDATE volunteer_works SET status = 'closed' WHERE id = ?")->execute([$workId]);
    }
    $st = $pdo->prepare('SELECT * FROM volunteer_signups WHERE id = ?');
    $st->execute([$id]);
    json_out(signup_row($st->fetch()), 201);
}

function handle_volunteer_signup_delete(PDO $pdo, string $workId): void
{
    $uid = require_auth();
    $st = $pdo->prepare('SELECT id FROM volunteer_signups WHERE user_id = ? AND work_id = ?');
    $st->execute([$uid, $workId]);
    $row = $st->fetch();
    if (!$row) {
        json_error('Signup not found', 404);
    }
    $pdo->prepare('DELETE FROM volunteer_signups WHERE id = ?')->execute([$row['id']]);
    $wst = $pdo->prepare('SELECT * FROM volunteer_works WHERE id = ?');
    $wst->execute([$workId]);
    $work = $wst->fetch();
    if ($work && $work['status'] === 'closed' && $work['max_volunteers'] !== null) {
        $cst = $pdo->prepare('SELECT COUNT(*) FROM volunteer_signups WHERE work_id = ?');
        $cst->execute([$workId]);
        if ((int) $cst->fetchColumn() < (int) $work['max_volunteers']) {
            $pdo->prepare("UPDATE volunteer_works SET status = 'open' WHERE id = ?")->execute([$workId]);
        }
    }
    json_out(['ok' => true]);
}

function validate_coral_input(array $b, bool $partial): ?string
{
    if (!$partial) {
        foreach (['name', 'image', 'price', 'stock'] as $k) {
            if (!array_key_exists($k, $b)) {
                return 'Invalid input';
            }
        }
    }
    if (array_key_exists('name', $b) && trim((string) $b['name']) === '') {
        return 'Name is required';
    }
    if (array_key_exists('image', $b) && trim((string) $b['image']) === '') {
        return 'Image URL is required';
    }
    if (array_key_exists('price', $b) && ((int) $b['price'] < 1)) {
        return 'Price must be positive';
    }
    if (array_key_exists('stock', $b) && ((int) $b['stock'] < 0)) {
        return 'Stock cannot be negative';
    }
    return null;
}

/**
 * Build volunteer work row from JSON body; merge with $existing for PATCH.
 *
 * @param array|null $existing DB row or null for create
 * @return array|string
 */
function volunteer_work_from_body(array $b, ?array $existing)
{
    $isCreate = $existing === null;
    $title = array_key_exists('title', $b)
        ? trim((string) $b['title'])
        : (string) ($existing['title'] ?? '');
    $desc = array_key_exists('description', $b)
        ? trim((string) $b['description'])
        : (string) ($existing['description'] ?? '');
    $loc = array_key_exists('location', $b)
        ? trim((string) $b['location'])
        : (string) ($existing['location'] ?? '');
    if ($isCreate) {
        if ($title === '') {
            return 'Title is required';
        }
        if ($desc === '') {
            return 'Description is required';
        }
        if ($loc === '') {
            return 'Location is required';
        }
    } elseif ($title === '' || $desc === '' || $loc === '') {
        return 'Invalid input';
    }

    if ($isCreate && !array_key_exists('hours', $b)) {
        return 'Invalid input';
    }
    $hours = array_key_exists('hours', $b)
        ? (int) $b['hours']
        : (int) ($existing['hours'] ?? 0);
    if ($hours < 1) {
        return 'Hours must be positive';
    }

    $schedRaw = array_key_exists('scheduledFor', $b)
        ? $b['scheduledFor']
        : ($existing !== null ? $existing['scheduled_for'] : null);
    if ($isCreate && ($schedRaw === null || $schedRaw === '')) {
        return 'Invalid input';
    }
    if ($schedRaw === null || $schedRaw === '') {
        return 'Invalid input';
    }
    $t = strtotime((string) $schedRaw);
    if ($t === false) {
        return 'Invalid input';
    }
    $schedSql = date('Y-m-d H:i:s', $t);

    $endSql = $existing !== null ? $existing['end_date'] : null;
    if (array_key_exists('endDate', $b)) {
        $er = $b['endDate'];
        if ($er === null || $er === '') {
            $endSql = null;
        } else {
            $t2 = strtotime((string) $er);
            $endSql = $t2 === false ? null : date('Y-m-d H:i:s', $t2);
        }
    }

    $status = array_key_exists('status', $b)
        ? (string) $b['status']
        : (string) ($existing['status'] ?? 'open');
    if (!in_array($status, VOLUNTEER_STATUSES, true)) {
        return 'Invalid input';
    }

    $cat = array_key_exists('category', $b)
        ? (string) $b['category']
        : (string) ($existing['category'] ?? 'other');
    if (!in_array($cat, VOLUNTEER_CATEGORIES, true)) {
        return 'Invalid input';
    }

    $maxSql = $existing !== null ? $existing['max_volunteers'] : null;
    if (array_key_exists('maxVolunteers', $b)) {
        $mv = $b['maxVolunteers'];
        if ($mv === null || $mv === '') {
            $maxSql = null;
        } else {
            $maxSql = (int) $mv;
            if ($maxSql < 1) {
                return 'Invalid input';
            }
        }
    }

    return [
        'title' => $title,
        'description' => $desc,
        'location' => $loc,
        'scheduled_for' => $schedSql,
        'end_date' => $endSql,
        'hours' => $hours,
        'status' => $status,
        'category' => $cat,
        'max_volunteers' => $maxSql,
    ];
}

const API = 'http://localhost:5238/api';

// ── Users ──
export async function getUsers() {
    const res = await fetch(`${API}/User`);
    if (!res.ok) throw new Error('Eroare la obținerea utilizatorilor');
    return res.json();
}

export async function createUser(data) {
    const res = await fetch(`${API}/User`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Eroare la crearea contului');
    }
    return res.json();
}

export async function getUserById(userId) {
    const res = await fetch(`${API}/User/${userId}`);
    if (!res.ok) throw new Error('Eroare la obținerea profilului');
    return res.json();
}

export async function updateUserProfile(userId, data) {
    const res = await fetch(`${API}/User/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Eroare la actualizarea profilului');
    }
    return res.json();
}

export async function changeUserPassword(userId, data) {
    const res = await fetch(`${API}/User/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Eroare la schimbarea parolei');
    }
    return res.json();
}

// ── Groups ──
export async function getGroups() {
    const res = await fetch(`${API}/Group`);
    if (!res.ok) throw new Error('Eroare la obținerea grupurilor');
    return res.json();
}

export async function createGroup(data) {
    const res = await fetch(`${API}/Group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Eroare la crearea grupului');
    return res.json();
}

// ── Expenses ──
export async function getExpenses() {
    const res = await fetch(`${API}/Expense`);
    if (!res.ok) throw new Error('Eroare la obținerea cheltuielilor');
    return res.json();
}

export async function addExpense(data) {
    const res = await fetch(`${API}/Expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Eroare la adăugarea cheltuielii');
    return res.json();
}

// ── Debts ──
export async function getDebts() {
    const res = await fetch(`${API}/Debt`);
    if (!res.ok) throw new Error('Eroare la obținerea datoriilor');
    return res.json();
}

export async function createDebt(data) {
    const res = await fetch(`${API}/Debt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Eroare la crearea datoriei');
    return res.json();
}

// ── Friends ──
export async function getFriends() {
    const res = await fetch(`${API}/Friends`);
    if (!res.ok) throw new Error('Eroare la obținerea prietenilor');
    return res.json();
}

export async function addFriend(data) {
    const res = await fetch(`${API}/Friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Eroare la adăugarea prietenului');
    return res.json();
}

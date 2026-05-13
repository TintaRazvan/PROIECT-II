const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:7252/api';

async function parseResponseError(res, fallbackMessage) {
    let message = fallbackMessage;
    try {
        const text = await res.text();
        if (text) {
            try {
                const payload = JSON.parse(text);
                message = payload?.message || payload?.title || text;
            } catch {
                message = text;
            }
        }
    } catch {
        // keep fallback
    }
    throw new Error(message);
}

async function request(path, options = {}, fallbackMessage = 'Eroare la apel API') {
    const res = await fetch(`${API}${path}`, options);
    if (!res.ok) {
        await parseResponseError(res, fallbackMessage);
    }
    if (res.status === 204) return null;
    return res.json();
}

// ── Users ──
export async function getUsers() {
    return request('/User', {}, 'Eroare la obținerea utilizatorilor');
}

export async function createUser(data) {
    return request('/User', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }, 'Eroare la crearea contului');
}

export async function loginUser(data) {
    return request('/User/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }, 'Eroare la autentificare');
}

export async function getUserById(userId) {
    return request(`/User/${userId}`, {}, 'Eroare la obținerea profilului');
}

export async function updateUserProfile(userId, data) {
    return request(`/User/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }, 'Eroare la actualizarea profilului');
}

export async function changeUserPassword(userId, data) {
    return request(`/User/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }, 'Eroare la schimbarea parolei');
}

// ── Groups ──
export async function getGroups() {
    return request('/Group', {}, 'Eroare la obținerea grupurilor');
}

export async function createGroup(data) {
    return request('/Group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }, 'Eroare la crearea grupului');
}

export async function deleteGroup(id) {
    return request(`/Group/${id}`, {
        method: 'DELETE',
    }, 'Eroare la ștergerea grupului');
}

export async function getGroupMembers(groupId) {
    return request(`/Group/${groupId}/members`, {}, 'Eroare la obținerea membrilor');
}

export async function addGroupMember(groupId, userId) {
    return request(`/Group/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
    }, 'Eroare la adăugarea membrului');
}

export async function removeGroupMember(groupId, userId) {
    return request(`/Group/${groupId}/members/${userId}`, {
        method: 'DELETE',
    }, 'Eroare la eliminarea membrului');
}

// ── Expenses ──
export async function getExpenses() {
    return request('/Expense', {}, 'Eroare la obținerea cheltuielilor');
}

export async function addExpense(data) {
    return request('/Expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }, 'Eroare la adăugarea cheltuielii');
}

// Înlocuiește vechea funcție scanReceipt cu aceasta:
export const scanReceipt = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    // Folosim variabila API deja definită în fișier (http://localhost:7252/api)
    const response = await fetch(`${API}/Ocr/scan`, { 
        method: 'POST',
        body: formData,
        // NU adăuga headers: { 'Content-Type': 'multipart/form-data' } !
        // Browserul trebuie să-și genereze singur 'boundary' pentru fișier.
    });

    if (!response.ok) {
        // Folosim helper-ul tău de erori pentru a vedea ce zice serverul
        await parseResponseError(response, 'Eroare la scanarea bonului');
    }
    return await response.json();
};

export async function addItemizedReceipt(data) {
    return request('/Expense/itemized-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }, 'Eroare la salvarea bonului itemizat');
}

export async function updateExpense(id, data) {
    return request(`/Expense/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }, 'Eroare la editarea cheltuielii');
}

export async function deleteExpense(id) {
    return request(`/Expense/${id}`, {
        method: 'DELETE',
    }, 'Eroare la ștergerea cheltuielii');
}

// ── Debts ──
export async function getDebts() {
    return request('/Debt', {}, 'Eroare la obținerea datoriilor');
}

export async function createDebt(data) {
    return request('/Debt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }, 'Eroare la crearea datoriei');
}

export async function deleteDebt(id) {
    return request(`/Debt/${id}`, {
        method: 'DELETE',
    }, 'Eroare la ștergerea datoriei');
}

export async function getDebtSummary(userId) {
    return request(`/Debt/summary/${userId}`, {}, 'Eroare la obținerea sumarului datoriilor');
}

// ── Friends ──
export async function getFriends() {
    return request('/Friends', {}, 'Eroare la obținerea prietenilor');
}

export async function getFriendsByUser(userId) {
    return request(`/Friends?userId=${userId}`, {}, 'Eroare la obținerea prietenilor utilizatorului');
}

export async function addFriend(data) {
    return request('/Friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }, 'Eroare la adăugarea prietenului');
}

export async function removeFriend(userId, friendId) {
    return request(`/Friends?userId=${userId}&friendId=${friendId}`, {
        method: 'DELETE',
    }, 'Eroare la ștergerea prietenului');
}

export async function getDebtHistory(userId) {
    return request(`/Debt/history/${userId}`, {}, 'Eroare la obținerea istoricului tranzacțiilor');
}

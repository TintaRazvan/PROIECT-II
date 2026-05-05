import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    getGroups, createGroup, getGroupMembers, addGroupMember, removeGroupMember,
    getExpenses, addExpense, deleteExpense,
    getDebts, createDebt, deleteDebt, getDebtSummary, getDebtHistory,
    getFriendsByUser, addFriend, removeFriend,
    getUsers,
} from '../api';
import './Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [groups, setGroups] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [debts, setDebts] = useState([]);
    const [friends, setFriends] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [debtSummary, setDebtSummary] = useState(null);
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [tab, setTab] = useState('expenses');
    const [apiOk, setApiOk] = useState(true);

    // Modals
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [showGroupForm, setShowGroupForm] = useState(false);
    const [showDebtForm, setShowDebtForm] = useState(false);
    const [showFriendForm, setShowFriendForm] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', groupId: 0 });
    const [groupForm, setGroupForm] = useState({ username: '' });
    const [debtForm, setDebtForm] = useState({ toUserId: '', amount: '', expenseId: 0 });
    const [friendForm, setFriendForm] = useState({ friendId: '' });

    // Group members
    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const [groupMembers, setGroupMembers] = useState({});
    const [addMemberUserId, setAddMemberUserId] = useState('');
    const [groupExpenseForm, setGroupExpenseForm] = useState({ description: '', amount: '' });

    useEffect(() => {
        const saved = localStorage.getItem('splitmate_user');
        if (saved) {
            setUser(JSON.parse(saved));
        }
        loadData(JSON.parse(saved || 'null'));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load debt summary when user becomes available
    useEffect(() => {
        if (user?.id) {
            loadDebtSummary(user.id);
        }
    }, [user]);

    async function loadData(currentUser = user) {
        try {
            const [g, e, d, u] = await Promise.all([
                getGroups(),
                getExpenses(),
                getDebts(),
                getUsers(),
            ]);
            const f = currentUser?.id ? await getFriendsByUser(currentUser.id) : [];
            const h = currentUser?.id ? await getDebtHistory(currentUser.id) : [];
            setGroups(g);
            setExpenses(e);
            setDebts(d);
            setFriends(f);
            setTransactionHistory(h);
            setAllUsers(u);
            setApiOk(true);
        } catch {
            setApiOk(false);
        }
    }

    async function loadDebtSummary(userId) {
        try {
            const summary = await getDebtSummary(userId);
            setDebtSummary(summary);
        } catch {
            // silently fail — summary is optional
        }
    }

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!expenseForm.description || !expenseForm.amount) return;
        try {
            await addExpense({
                id: 0,
                amount: parseFloat(expenseForm.amount),
                date: new Date().toISOString(),
                description: expenseForm.description,
                payerId: user?.id || 0,
                payer: null,
                groupId: parseInt(expenseForm.groupId) || 0,
                group: null,
            });
            setExpenseForm({ description: '', amount: '', groupId: 0 });
            setShowExpenseForm(false);
            loadData(user);
        } catch {
            alert('Eroare la adăugarea cheltuielii. Verifică API-ul.');
        }
    };

    const handleAddGroupExpense = async (groupId) => {
        if (!groupExpenseForm.description || !groupExpenseForm.amount) return;
        try {
            await addExpense({
                id: 0,
                amount: parseFloat(groupExpenseForm.amount),
                date: new Date().toISOString(),
                description: groupExpenseForm.description,
                payerId: user?.id || 0,
                payer: null,
                groupId: groupId,
                group: null,
            });
            setGroupExpenseForm({ description: '', amount: '' });
            loadData(user);
        } catch (err) {
            alert('Eroare la adăugarea cheltuielii în grup: ' + (err.message || 'Verifică API-ul.'));
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm('Sigur vrei să ștergi această cheltuială?')) return;
        try {
            await deleteExpense(id);
            loadData(user);
        } catch {
            alert('Eroare la ștergerea cheltuielii.');
        }
    };

    const handleAddGroup = async (e) => {
        e.preventDefault();
        if (!groupForm.username) return;
        try {
            await createGroup({
                id: 0,
                username: groupForm.username,
                members: [],
                expenses: [],
            });
            setGroupForm({ username: '' });
            setShowGroupForm(false);
            loadData(user);
        } catch {
            alert('Eroare la crearea grupului. Verifică API-ul.');
        }
    };

    const toggleGroupExpand = async (groupId) => {
        if (expandedGroupId === groupId) {
            setExpandedGroupId(null);
            return;
        }
        setExpandedGroupId(groupId);
        try {
            const members = await getGroupMembers(groupId);
            setGroupMembers((prev) => ({ ...prev, [groupId]: members }));
        } catch {
            setGroupMembers((prev) => ({ ...prev, [groupId]: [] }));
        }
    };

    const handleAddMember = async (groupId) => {
        if (!addMemberUserId) return;
        try {
            await addGroupMember(groupId, parseInt(addMemberUserId));
            setAddMemberUserId('');
            const members = await getGroupMembers(groupId);
            setGroupMembers((prev) => ({ ...prev, [groupId]: members }));
            loadData(user);
        } catch (err) {
            alert(err.message || 'Eroare la adăugarea membrului.');
        }
    };

    const handleRemoveMember = async (groupId, userId) => {
        if (!window.confirm('Sigur vrei să elimini acest membru?')) return;
        try {
            await removeGroupMember(groupId, userId);
            const members = await getGroupMembers(groupId);
            setGroupMembers((prev) => ({ ...prev, [groupId]: members }));
            loadData(user);
        } catch {
            alert('Eroare la eliminarea membrului.');
        }
    };

    const handleAddDebt = async (e) => {
        e.preventDefault();
        if (!debtForm.toUserId || !debtForm.amount) return;
        try {
            await createDebt({
                id: 0,
                amount: parseFloat(debtForm.amount),
                fromUserId: user?.id || 0,
                fromUser: null,
                toUserId: parseInt(debtForm.toUserId),
                toUser: null,
                expenseId: parseInt(debtForm.expenseId) || 0,
            });
            setDebtForm({ toUserId: '', amount: '', expenseId: 0 });
            setShowDebtForm(false);
            loadData(user);
            if (user?.id) loadDebtSummary(user.id);
        } catch {
            alert('Eroare la crearea datoriei. Verifică API-ul.');
        }
    };

    const handleDeleteDebt = async (id) => {
        if (!window.confirm('Sigur vrei să ștergi această datorie?')) return;
        try {
            await deleteDebt(id);
            loadData(user);
            if (user?.id) loadDebtSummary(user.id);
        } catch {
            alert('Eroare la ștergerea datoriei.');
        }
    };

    const handleAddFriend = async (e) => {
        e.preventDefault();
        if (!friendForm.friendId) return;
        try {
            await addFriend({
                userId: user?.id || 0,
                user: null,
                friendId: parseInt(friendForm.friendId),
                friend: null,
            });
            setFriendForm({ friendId: '' });
            setShowFriendForm(false);
            loadData(user);
        } catch {
            alert('Eroare la adăugarea prietenului. Verifică API-ul.');
        }
    };

    const handleRemoveFriend = async (friendId) => {
        if (!user?.id) return;
        if (!window.confirm('Sigur vrei să elimini acest prieten?')) return;
        try {
            await removeFriend(user.id, friendId);
            loadData(user);
        } catch {
            alert('Eroare la ștergerea prietenului.');
        }
    };

    const getUserName = (userId) => {
        const u = allUsers.find(u => u.id === userId);
        return u ? u.username : `User #${userId}`;
    };

    const getGroupName = (groupId) => {
        if (!groupId) return null;
        const g = groups.find(g => g.id === groupId);
        return g ? (g.groupName || g.username) : null;
    };

    const logout = () => {
        localStorage.removeItem('splitmate_user');
        navigate('/');
    };

    // Pie chart SVG for debt summary
    const renderPieChart = () => {
        if (!debtSummary || (debtSummary.totalToReceive === 0 && debtSummary.totalToPay === 0)) {
            return null;
        }
        const total = debtSummary.totalToReceive + debtSummary.totalToPay;
        const receiveAngle = (debtSummary.totalToReceive / total) * 360;
        const receiveRad = (receiveAngle * Math.PI) / 180;

        // SVG arc calculations
        const cx = 60, cy = 60, r = 50;
        const x1 = cx + r * Math.sin(receiveRad);
        const y1 = cy - r * Math.cos(receiveRad);
        const largeArc = receiveAngle > 180 ? 1 : 0;

        return (
            <svg width="120" height="120" viewBox="0 0 120 120" className="dash-pie">
                {/* Pay slice (full circle as background) */}
                <circle cx={cx} cy={cy} r={r} fill="#e8692a" />
                {/* Receive slice */}
                {debtSummary.totalToReceive > 0 && (
                    <path
                        d={`M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${largeArc},1 ${x1},${y1} Z`}
                        fill="#7dd4c8"
                    />
                )}
                {/* Inner circle */}
                <circle cx={cx} cy={cy} r="22" fill="var(--bg-secondary)" />
            </svg>
        );
    };

    return (
        <div className="dash">
            {/* Top bar */}
            <header className="dash-header">
                <Link to="/" className="dash-logo">
                    <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
                        <circle cx="50" cy="50" r="46" fill="#1a5c6b" stroke="#13444f" strokeWidth="4" />
                        <path d="M50 4 A46 46 0 0 1 96 50 L50 50 Z" fill="#7dd4c8" />
                        <path d="M96 50 A46 46 0 0 1 50 96 L50 50 Z" fill="#e8692a" />
                        <path d="M50 96 A46 46 0 0 1 4 50 L50 50 Z" fill="#f09a5e" />
                        <circle cx="50" cy="50" r="18" fill="#1a5c6b" />
                        <text x="50" y="57" textAnchor="middle" fill="#7dd4c8" fontSize="24" fontWeight="bold">$</text>
                    </svg>
                    <span>SplitMate</span>
                </Link>
                <div className="dash-user">
                    {user && <span className="dash-username">{user.username}</span>}
                    <Link to="/my-account" className="dash-logout">My Account</Link>
                    <button onClick={logout} className="dash-logout">Ieși</button>
                </div>
            </header>

            <main className="dash-main">
                {!apiOk && (
                    <div className="dash-warning">
                        API-ul nu răspunde. Pornește backend-ul pe <code>localhost:7252</code>.
                    </div>
                )}

                {/* Debt Summary Card */}
                {debtSummary && (debtSummary.totalToReceive > 0 || debtSummary.totalToPay > 0) && (
                    <div className="dash-summary">
                        <div className="dash-summary-info">
                            <h3>Sumar financiar</h3>
                            <div className="dash-summary-rows">
                                <div className="dash-summary-row">
                                    <span className="dash-summary-dot dash-summary-dot--receive"></span>
                                    <span>De primit</span>
                                    <strong className="dash-summary-val dash-summary-val--receive">
                                        +{debtSummary.totalToReceive} RON
                                    </strong>
                                </div>
                                <div className="dash-summary-row">
                                    <span className="dash-summary-dot dash-summary-dot--pay"></span>
                                    <span>De plătit</span>
                                    <strong className="dash-summary-val dash-summary-val--pay">
                                        -{debtSummary.totalToPay} RON
                                    </strong>
                                </div>
                                <div className="dash-summary-row dash-summary-row--balance">
                                    <span>Balanță</span>
                                    <strong className={`dash-summary-val ${debtSummary.balance >= 0 ? 'dash-summary-val--receive' : 'dash-summary-val--pay'}`}>
                                        {debtSummary.balance >= 0 ? '+' : ''}{debtSummary.balance} RON
                                    </strong>
                                </div>
                            </div>
                        </div>
                        <div className="dash-summary-chart">
                            {renderPieChart()}
                        </div>
                    </div>
                )}

                {/* Stats row */}
                <div className="dash-stats">
                    <div className="dash-stat">
                        <span className="dash-stat-num">{groups.length}</span>
                        <span className="dash-stat-label">Grupuri</span>
                    </div>
                    <div className="dash-stat">
                        <span className="dash-stat-num">{expenses.length}</span>
                        <span className="dash-stat-label">Cheltuieli</span>
                    </div>
                    <div className="dash-stat">
                        <span className="dash-stat-num">{debts.length}</span>
                        <span className="dash-stat-label">Datorii</span>
                    </div>
                    <div className="dash-stat">
                        <span className="dash-stat-num">{friends.length}</span>
                        <span className="dash-stat-label">Prieteni</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="dash-actions">
                    <button onClick={() => setShowExpenseForm(true)} className="dash-action-btn dash-action-btn--primary">
                        + Cheltuială nouă
                    </button>
                    <button onClick={() => setShowGroupForm(true)} className="dash-action-btn">
                        + Grup nou
                    </button>
                    <button onClick={() => setShowDebtForm(true)} className="dash-action-btn">
                        + Datorie nouă
                    </button>
                    <button onClick={() => setShowFriendForm(true)} className="dash-action-btn">
                        + Adaugă prieten
                    </button>
                </div>

                {/* Expense form */}
                {showExpenseForm && (
                    <form onSubmit={handleAddExpense} className="dash-form">
                        <h3>Adaugă cheltuială</h3>
                        <input
                            type="text"
                            placeholder="Descriere (ex: Pizza)"
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                        />
                        <input
                            type="number"
                            placeholder="Sumă (RON)"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        />
                        <select
                            className="dash-form-select"
                            value={expenseForm.groupId}
                            onChange={(e) => setExpenseForm({ ...expenseForm, groupId: e.target.value })}
                        >
                            <option value={0}>— Fără grup (cheltuială personală) —</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>{g.groupName || g.username}</option>
                            ))}
                        </select>
                        <div className="dash-form-btns">
                            <button type="submit" className="dash-action-btn dash-action-btn--primary">Adaugă</button>
                            <button type="button" onClick={() => setShowExpenseForm(false)} className="dash-action-btn">Anulează</button>
                        </div>
                    </form>
                )}

                {/* Group form */}
                {showGroupForm && (
                    <form onSubmit={handleAddGroup} className="dash-form">
                        <h3>Creează grup</h3>
                        <input
                            type="text"
                            placeholder="Numele grupului (ex: Chirie apartament)"
                            value={groupForm.username}
                            onChange={(e) => setGroupForm({ ...groupForm, username: e.target.value })}
                        />
                        <div className="dash-form-btns">
                            <button type="submit" className="dash-action-btn dash-action-btn--primary">Creează</button>
                            <button type="button" onClick={() => setShowGroupForm(false)} className="dash-action-btn">Anulează</button>
                        </div>
                    </form>
                )}

                {/* Debt form */}
                {showDebtForm && (
                    <form onSubmit={handleAddDebt} className="dash-form">
                        <h3>Adaugă datorie</h3>
                        <select
                            value={debtForm.toUserId}
                            onChange={(e) => setDebtForm({ ...debtForm, toUserId: e.target.value })}
                            className="dash-form-select"
                        >
                            <option value="">— Selectează utilizatorul —</option>
                            {allUsers
                                .filter(u => u.id !== user?.id)
                                .map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                ))}
                        </select>
                        <input
                            type="number"
                            placeholder="Sumă (RON)"
                            value={debtForm.amount}
                            onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })}
                        />
                        <div className="dash-form-btns">
                            <button type="submit" className="dash-action-btn dash-action-btn--primary">Adaugă</button>
                            <button type="button" onClick={() => setShowDebtForm(false)} className="dash-action-btn">Anulează</button>
                        </div>
                    </form>
                )}

                {/* Friend form */}
                {showFriendForm && (
                    <form onSubmit={handleAddFriend} className="dash-form">
                        <h3>Adaugă prieten</h3>
                        <select
                            value={friendForm.friendId}
                            onChange={(e) => setFriendForm({ ...friendForm, friendId: e.target.value })}
                            className="dash-form-select"
                        >
                            <option value="">— Selectează utilizatorul —</option>
                            {allUsers
                                .filter(u => u.id !== user?.id)
                                .map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                ))}
                        </select>
                        <div className="dash-form-btns">
                            <button type="submit" className="dash-action-btn dash-action-btn--primary">Adaugă</button>
                            <button type="button" onClick={() => setShowFriendForm(false)} className="dash-action-btn">Anulează</button>
                        </div>
                    </form>
                )}

                {/* Tabs */}
                <div className="dash-tabs">
                    <button
                        className={`dash-tab ${tab === 'expenses' ? 'dash-tab--active' : ''}`}
                        onClick={() => setTab('expenses')}
                    >
                        Cheltuieli
                    </button>
                    <button
                        className={`dash-tab ${tab === 'groups' ? 'dash-tab--active' : ''}`}
                        onClick={() => setTab('groups')}
                    >
                        Grupuri
                    </button>
                    <button
                        className={`dash-tab ${tab === 'debts' ? 'dash-tab--active' : ''}`}
                        onClick={() => setTab('debts')}
                    >
                        Datorii
                    </button>
                    <button
                        className={`dash-tab ${tab === 'friends' ? 'dash-tab--active' : ''}`}
                        onClick={() => setTab('friends')}
                    >
                        Prieteni
                    </button>
                    <button
                        className={`dash-tab ${tab === 'history' ? 'dash-tab--active' : ''}`}
                        onClick={() => setTab('history')}
                    >
                        Istoric
                    </button>
                </div>

                {/* Tab content */}
                <div className="dash-content">
                    {tab === 'expenses' && (
                        expenses.length === 0
                            ? <p className="dash-empty">Nicio cheltuială încă. Adaugă una!</p>
                            : <div className="dash-list">
                                {expenses.map((exp) => (
                                    <div className="dash-list-item" key={exp.id}>
                                        <div>
                                            <span className="dash-list-title">{exp.description}</span>
                                            <span className="dash-list-date">
                                                {new Date(exp.date).toLocaleDateString('ro-RO')}
                                                {getGroupName(exp.groupId) && (
                                                    <span className="dash-list-group-tag"> · {getGroupName(exp.groupId)}</span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="dash-list-right">
                                            <span className="dash-list-amount">{exp.amount} RON</span>
                                            <button
                                                className="dash-delete-btn"
                                                onClick={() => handleDeleteExpense(exp.id)}
                                                title="Șterge cheltuiala"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                    )}

                    {tab === 'groups' && (
                        groups.length === 0
                            ? <p className="dash-empty">Niciun grup. Creează unul!</p>
                            : <div className="dash-list">
                                {groups.map((g) => (
                                    <div className={`dash-group-card ${expandedGroupId === g.id ? 'dash-group-card--open' : ''}`} key={g.id}>
                                        <div className="dash-list-item dash-group-header" onClick={() => toggleGroupExpand(g.id)}>
                                            <div>
                                                <span className="dash-list-title">{g.username || g.groupName}</span>
                                                <span className="dash-list-date">
                                                    {groupMembers[g.id]?.length || 0} membri
                                                </span>
                                            </div>
                                            <span className={`dash-group-arrow ${expandedGroupId === g.id ? 'dash-group-arrow--open' : ''}`}>▸</span>
                                        </div>

                                        {expandedGroupId === g.id && (
                                            <div className="dash-group-body">
                                                {/* Members list */}
                                                {(groupMembers[g.id] || []).length === 0 ? (
                                                    <p className="dash-group-empty">Niciun membru. Adaugă pe cineva!</p>
                                                ) : (
                                                    <div className="dash-group-members">
                                                        {(groupMembers[g.id] || []).map((m) => (
                                                            <div className="dash-group-member" key={m.id}>
                                                                <div className="dash-friend-avatar">{m.username?.[0]?.toUpperCase() || '?'}</div>
                                                                <div className="dash-group-member-info">
                                                                    <span className="dash-group-member-name">{m.username}</span>
                                                                    <span className="dash-group-member-email">{m.email}</span>
                                                                </div>
                                                                <button
                                                                    className="dash-delete-btn"
                                                                    onClick={() => handleRemoveMember(g.id, m.id)}
                                                                    title="Elimină din grup"
                                                                >✕</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Add member form */}
                                                <div className="dash-group-add">
                                                    <select
                                                        className="dash-form-select"
                                                        value={addMemberUserId}
                                                        onChange={(e) => setAddMemberUserId(e.target.value)}
                                                    >
                                                        <option value="">— Alege utilizator —</option>
                                                        {allUsers
                                                            .filter((u) => !(groupMembers[g.id] || []).some((m) => m.id === u.id))
                                                            .map((u) => (
                                                                <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                                            ))}
                                                    </select>
                                                    <button
                                                        className="dash-action-btn dash-action-btn--primary dash-group-add-btn"
                                                        onClick={() => handleAddMember(g.id)}
                                                        disabled={!addMemberUserId}
                                                    >+ Adaugă</button>
                                                </div>

                                                {/* Group expenses */}
                                                <div className="dash-group-section">
                                                    <h4 className="dash-group-section-title">💰 Cheltuieli din grup</h4>
                                                    {expenses.filter(exp => exp.groupId === g.id).length === 0 ? (
                                                        <p className="dash-group-empty">Nicio cheltuială în acest grup.</p>
                                                    ) : (
                                                        <div className="dash-group-expenses">
                                                            {expenses.filter(exp => exp.groupId === g.id).map(exp => (
                                                                <div className="dash-group-expense" key={exp.id}>
                                                                    <div className="dash-group-expense-info">
                                                                        <span className="dash-group-member-name">{exp.description}</span>
                                                                        <span className="dash-group-member-email">
                                                                            {new Date(exp.date).toLocaleDateString('ro-RO')} · {getUserName(exp.payerId || 0)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="dash-list-right">
                                                                        <span className="dash-list-amount">{exp.amount} RON</span>
                                                                        <button
                                                                            className="dash-delete-btn"
                                                                            onClick={() => handleDeleteExpense(exp.id)}
                                                                            title="Șterge cheltuiala"
                                                                        >✕</button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <div className="dash-group-expense-total">
                                                                Total: {expenses.filter(exp => exp.groupId === g.id).reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)} RON
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Inline add expense to group */}
                                                    <div className="dash-group-add-expense">
                                                        <input
                                                            type="text"
                                                            placeholder="Descriere cheltuială"
                                                            value={groupExpenseForm.description}
                                                            onChange={(e) => setGroupExpenseForm({ ...groupExpenseForm, description: e.target.value })}
                                                        />
                                                        <input
                                                            type="number"
                                                            placeholder="Sumă"
                                                            value={groupExpenseForm.amount}
                                                            onChange={(e) => setGroupExpenseForm({ ...groupExpenseForm, amount: e.target.value })}
                                                        />
                                                        <button
                                                            className="dash-action-btn dash-action-btn--primary dash-group-add-btn"
                                                            onClick={() => handleAddGroupExpense(g.id)}
                                                            disabled={!groupExpenseForm.description || !groupExpenseForm.amount}
                                                        >+ Adaugă</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                    )}

                    {tab === 'debts' && (
                        debts.length === 0
                            ? <p className="dash-empty">Nicio datorie. Ești la zero!</p>
                            : <div className="dash-list">
                                {debts.map((d) => (
                                    <div className="dash-list-item" key={d.id}>
                                        <div>
                                            <span className="dash-list-title">
                                                {getUserName(d.fromUserId)} → {getUserName(d.toUserId)}
                                            </span>
                                            <span className="dash-list-date">
                                                {d.fromUserId === user?.id ? 'Tu datorezi' : 'Ți se datorează'}
                                            </span>
                                        </div>
                                        <div className="dash-list-right">
                                            <span className={`dash-list-amount ${d.fromUserId === user?.id ? 'dash-list-amount--negative' : ''}`}>
                                                {d.fromUserId === user?.id ? '-' : '+'}{d.amount} RON
                                            </span>
                                            <button
                                                className="dash-delete-btn"
                                                onClick={() => handleDeleteDebt(d.id)}
                                                title="Șterge datoria"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                    )}

                    {tab === 'friends' && (
                        friends.length === 0
                            ? <p className="dash-empty">Niciun prieten adăugat. Adaugă unul!</p>
                            : <div className="dash-list">
                                {friends.map((f, i) => (
                                    <div className="dash-list-item" key={i}>
                                        <div className="dash-friend-info">
                                            <span className="dash-friend-avatar">
                                                {getUserName(f.friendId).charAt(0).toUpperCase()}
                                            </span>
                                            <div>
                                                <span className="dash-list-title">{getUserName(f.friendId)}</span>
                                                <span className="dash-list-date">
                                                    Prieten al lui {getUserName(f.userId)}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            className="dash-delete-btn"
                                            onClick={() => handleRemoveFriend(f.friendId)}
                                            title="Elimină prieten"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                    )}

                    {tab === 'history' && (
                        transactionHistory.length === 0
                            ? <p className="dash-empty">Nu există tranzacții încă.</p>
                            : <div className="dash-list">
                                {transactionHistory.map((item) => (
                                    <div className="dash-list-item" key={item.id}>
                                        <div>
                                            <span className="dash-list-title">
                                                {item.fromUsername} → {item.toUsername}
                                            </span>
                                            <span className="dash-list-date">
                                                {item.transactionDate
                                                    ? new Date(item.transactionDate).toLocaleDateString('ro-RO')
                                                    : 'Fără dată'}
                                                {' · '}
                                                {item.expenseDescription}
                                            </span>
                                        </div>
                                        <div className="dash-list-right">
                                            <span className={`dash-list-amount ${item.direction === 'outgoing' ? 'dash-list-amount--negative' : ''}`}>
                                                {item.direction === 'outgoing' ? '-' : '+'}{item.amount} RON
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getGroups, createGroup, getExpenses, addExpense, getDebts } from '../api';
import './Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [groups, setGroups] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [debts, setDebts] = useState([]);
    const [tab, setTab] = useState('expenses');
    const [apiOk, setApiOk] = useState(true);

    // Modals
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [showGroupForm, setShowGroupForm] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', groupId: 0 });
    const [groupForm, setGroupForm] = useState({ username: '' });

    useEffect(() => {
        const saved = localStorage.getItem('splitmate_user');
        if (saved) {
            setUser(JSON.parse(saved));
        }
        loadData();
    }, []);

    async function loadData() {
        try {
            const [g, e, d] = await Promise.all([getGroups(), getExpenses(), getDebts()]);
            setGroups(g);
            setExpenses(e);
            setDebts(d);
            setApiOk(true);
        } catch {
            setApiOk(false);
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
            loadData();
        } catch {
            alert('Eroare la adăugarea cheltuielii. Verifică API-ul.');
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
            loadData();
        } catch {
            alert('Eroare la crearea grupului. Verifică API-ul.');
        }
    };

    const logout = () => {
        localStorage.removeItem('splitmate_user');
        navigate('/');
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
                    <button onClick={logout} className="dash-logout">Ieși</button>
                </div>
            </header>

            <main className="dash-main">
                {!apiOk && (
                    <div className="dash-warning">
                        API-ul nu răspunde. Pornește backend-ul pe <code>localhost:5238</code>.
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
                </div>

                {/* Actions */}
                <div className="dash-actions">
                    <button onClick={() => setShowExpenseForm(true)} className="dash-action-btn dash-action-btn--primary">
                        + Cheltuială nouă
                    </button>
                    <button onClick={() => setShowGroupForm(true)} className="dash-action-btn">
                        + Grup nou
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
                </div>

                {/* Tab content */}
                <div className="dash-content">
                    {tab === 'expenses' && (
                        expenses.length === 0
                            ? <p className="dash-empty">Nicio cheltuială încă. Adaugă una!</p>
                            : <div className="dash-list">
                                {expenses.map((exp, i) => (
                                    <div className="dash-list-item" key={i}>
                                        <div>
                                            <span className="dash-list-title">{exp.description}</span>
                                            <span className="dash-list-date">
                                                {new Date(exp.date).toLocaleDateString('ro-RO')}
                                            </span>
                                        </div>
                                        <span className="dash-list-amount">{exp.amount} RON</span>
                                    </div>
                                ))}
                            </div>
                    )}

                    {tab === 'groups' && (
                        groups.length === 0
                            ? <p className="dash-empty">Niciun grup. Creează unul!</p>
                            : <div className="dash-list">
                                {groups.map((g, i) => (
                                    <div className="dash-list-item" key={i}>
                                        <div>
                                            <span className="dash-list-title">{g.username}</span>
                                            <span className="dash-list-date">
                                                {g.members?.length || 0} membri · {g.expenses?.length || 0} cheltuieli
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                    )}

                    {tab === 'debts' && (
                        debts.length === 0
                            ? <p className="dash-empty">Nicio datorie. Ești la zero!</p>
                            : <div className="dash-list">
                                {debts.map((d, i) => (
                                    <div className="dash-list-item" key={i}>
                                        <div>
                                            <span className="dash-list-title">
                                                User #{d.fromUserId} → User #{d.toUserId}
                                            </span>
                                        </div>
                                        <span className="dash-list-amount">{d.amount} RON</span>
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

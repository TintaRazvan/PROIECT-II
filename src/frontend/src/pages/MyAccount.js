import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    changeUserPassword,
    getDebts,
    getExpenses,
    getGroups,
    getUserById,
    updateUserProfile,
} from '../api';
import './MyAccount.css';

function MyAccount() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({ groups: 0, expenses: 0, debts: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [nameDraft, setNameDraft] = useState('');
    const [emailDraft, setEmailDraft] = useState('');
    const [passwordForm, setPasswordForm] = useState({ current: '', next: '' });
    const [message, setMessage] = useState('');
    const [currency, setCurrency] = useState('RON');
    const [emailUpdates, setEmailUpdates] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('splitmate_user');
        if (!saved) {
            navigate('/register');
            return;
        }

        let parsedUser = null;
        try {
            const parsed = JSON.parse(saved);
            parsedUser = parsed;
            setUser(parsed);
            setNameDraft(parsed.username || '');
            setEmailDraft(parsed.email || '');
        } catch {
            localStorage.removeItem('splitmate_user');
            navigate('/register');
            return;
        }

        const preferredCurrency = localStorage.getItem('splitmate_currency');
        const prefersUpdates = localStorage.getItem('splitmate_email_updates');
        if (preferredCurrency) setCurrency(preferredCurrency);
        if (prefersUpdates) setEmailUpdates(prefersUpdates === 'true');

        loadStats();
        loadProfile(parsedUser?.id);
    }, [navigate]);

    async function loadProfile(userId) {
        if (!userId) return;
        try {
            const profile = await getUserById(userId);
            setUser(profile);
            setNameDraft(profile.username || '');
            setEmailDraft(profile.email || '');
            localStorage.setItem('splitmate_user', JSON.stringify(profile));
        } catch {
            // Keep local user as fallback when API profile endpoint fails.
        }
    }

    async function loadStats() {
        setLoading(true);
        setError('');
        try {
            const [groups, expenses, debts] = await Promise.all([
                getGroups(),
                getExpenses(),
                getDebts(),
            ]);
            setStats({
                groups: groups.length,
                expenses: expenses.length,
                debts: debts.length,
            });
        } catch {
            setError('Nu am putut încărca statisticile contului.');
        } finally {
            setLoading(false);
        }
    }

    const completion = useMemo(() => {
        if (!user) return 0;
        let score = 40;
        if (user.username) score += 20;
        if (user.email) score += 20;
        if (stats.groups > 0) score += 10;
        if (stats.expenses > 0) score += 10;
        return Math.min(score, 100);
    }, [user, stats]);

    const saveProfile = async () => {
        if (!user) return;
        setError('');
        setMessage('');

        if (!nameDraft.trim() || !emailDraft.trim()) {
            setError('Numele și email-ul sunt obligatorii.');
            return;
        }

        try {
            const updated = await updateUserProfile(user.id, {
                username: nameDraft.trim(),
                email: emailDraft.trim(),
            });
            localStorage.setItem('splitmate_user', JSON.stringify(updated));
            setUser(updated);
            setMessage('Profilul a fost actualizat.');
        } catch (err) {
            setError(err.message || 'Nu s-a putut actualiza profilul.');
        }
    };

    const changePassword = async () => {
        if (!user) return;
        setError('');
        setMessage('');
        if (!passwordForm.current || !passwordForm.next) {
            setError('Completează parola curentă și parola nouă.');
            return;
        }
        if (passwordForm.next.length < 6) {
            setError('Parola nouă trebuie să aibă minim 6 caractere.');
            return;
        }
        try {
            await changeUserPassword(user.id, {
                currentPassword: passwordForm.current,
                newPassword: passwordForm.next,
            });
            setPasswordForm({ current: '', next: '' });
            setMessage('Parola a fost actualizată.');
        } catch (err) {
            setError(err.message || 'Nu s-a putut actualiza parola.');
        }
    };

    const savePreferences = () => {
        localStorage.setItem('splitmate_currency', currency);
        localStorage.setItem('splitmate_email_updates', String(emailUpdates));
        setMessage('Preferințele au fost salvate.');
    };

    const logoutEverywhere = () => {
        localStorage.removeItem('splitmate_user');
        navigate('/');
    };

    return (
        <div className="account">
            <header className="account-header">
                <div>
                    <h1>My Account</h1>
                    <p>Gestionează profilul, securitatea și preferințele tale.</p>
                </div>
                <div className="account-header-actions">
                    <Link to="/dashboard" className="account-btn account-btn--ghost">Dashboard</Link>
                    <button onClick={logoutEverywhere} className="account-btn">Ieși</button>
                </div>
            </header>

            <main className="account-main">
                {message && <div className="account-message">{message}</div>}
                {error && <div className="account-error">{error}</div>}

                <section className="account-card">
                    <h2>Profil</h2>
                    <label>
                        <span>Nume utilizator</span>
                        <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
                    </label>
                    <label>
                        <span>Email</span>
                        <input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} />
                    </label>
                    <button onClick={saveProfile} className="account-btn">Salvează profilul</button>
                </section>

                <section className="account-card">
                    <h2>Securitate</h2>
                    <label>
                        <span>Parola curentă</span>
                        <input
                            type="password"
                            value={passwordForm.current}
                            onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                        />
                    </label>
                    <label>
                        <span>Parola nouă</span>
                        <input
                            type="password"
                            value={passwordForm.next}
                            onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                        />
                    </label>
                    <button onClick={changePassword} className="account-btn">Schimbă parola</button>
                </section>

                <section className="account-card">
                    <h2>Preferințe</h2>
                    <label>
                        <span>Monedă implicită</span>
                        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                            <option value="RON">RON</option>
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                        </select>
                    </label>
                    <label className="account-switch">
                        <input
                            type="checkbox"
                            checked={emailUpdates}
                            onChange={(e) => setEmailUpdates(e.target.checked)}
                        />
                        <span>Primește update-uri pe email</span>
                    </label>
                    <button onClick={savePreferences} className="account-btn">Salvează preferințele</button>
                </section>

                <section className="account-card">
                    <h2>Status cont</h2>
                    {loading ? (
                        <p className="account-muted">Se încarcă statisticile...</p>
                    ) : (
                        <div className="account-stats">
                            <div><strong>{stats.groups}</strong><span>grupuri</span></div>
                            <div><strong>{stats.expenses}</strong><span>cheltuieli</span></div>
                            <div><strong>{stats.debts}</strong><span>datorii</span></div>
                        </div>
                    )}
                    <div className="account-progress">
                        <div style={{ width: `${completion}%` }} />
                    </div>
                    <p className="account-muted">Profil completat: {completion}%</p>
                </section>
            </main>
        </div>
    );
}

export default MyAccount;

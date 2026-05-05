import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api';
import './Login.css';

function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.email || !form.password) {
            setError('Completează toate câmpurile.');
            return;
        }

        setLoading(true);
        try {
            const user = await loginUser({
                email: form.email,
                password: form.password,
            });
            localStorage.setItem('splitmate_user', JSON.stringify(user));
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Nu s-a putut autentifica.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <Link to="/" className="login-back">← Înapoi</Link>
                <h1>Intră în cont</h1>
                <p className="login-sub">Bine ai revenit! Introdu datele tale.</p>

                <form onSubmit={handleSubmit} className="login-form">
                    <label>
                        <span>Email</span>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="ex: luca@email.com"
                            autoComplete="email"
                        />
                    </label>
                    <label>
                        <span>Parolă</span>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="parola ta"
                            autoComplete="current-password"
                        />
                    </label>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Se conectează...' : 'Conectează-te'}
                    </button>
                </form>

                <p className="login-register">
                    Nu ai cont? <Link to="/register">Creează unul</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;

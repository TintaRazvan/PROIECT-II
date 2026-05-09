import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api';
import './Login.css';

function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('splitmate_remember_me') === 'true');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.email.trim() || !form.password) {
            setError('Completează toate câmpurile.');
            return;
        }

        const email = form.email.trim();
        const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!simpleEmailRegex.test(email)) {
            setError('Email invalid.');
            return;
        }

        setLoading(true);
        try {
            const user = await loginUser({
                email,
                password: form.password,
            });
            localStorage.setItem('splitmate_user', JSON.stringify(user));
            localStorage.setItem('splitmate_remember_me', String(rememberMe));
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
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="parola ta"
                            autoComplete="current-password"
                        />
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                        />{' '}
                        Afișează parola
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />{' '}
                        Ține-mă minte pe acest device
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

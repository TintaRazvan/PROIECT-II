import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUser } from '../api';
import './Register.css';

function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.username || !form.email || !form.password) {
            setError('Completează toate câmpurile.');
            return;
        }

        setLoading(true);
        try {
            const user = await createUser({
                id: 0,
                username: form.username,
                email: form.email,
                password: form.password,
                groups: [],
            });
            // Salvăm user-ul în localStorage ca "sesiune" simplă
            localStorage.setItem('splitmate_user', JSON.stringify(user));
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Nu s-a putut crea contul.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-card">
                <Link to="/" className="register-back">← Înapoi</Link>
                <h1>Creează un cont</h1>
                <p className="register-sub">Gratuit. Durează 30 de secunde.</p>

                <form onSubmit={handleSubmit} className="register-form">
                    <label>
                        <span>Nume utilizator</span>
                        <input
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            placeholder="ex: luca"
                            autoComplete="username"
                        />
                    </label>
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
                            placeholder="minim 6 caractere"
                            autoComplete="new-password"
                        />
                    </label>

                    {error && <div className="register-error">{error}</div>}

                    <button type="submit" className="register-btn" disabled={loading}>
                        {loading ? 'Se creează...' : 'Creează cont'}
                    </button>
                </form>

                <p className="register-login">
                    Ai deja cont? <Link to="/dashboard">Intră în dashboard</Link>
                </p>
            </div>
        </div>
    );
}

export default Register;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyAccount from './pages/MyAccount';

// Protected Route wrapper — redirects to login if not authenticated
function ProtectedRoute({ children }) {
    const rawUser = localStorage.getItem('splitmate_user');
    if (!rawUser) {
        return <Navigate to="/login" replace />;
    }

    try {
        const parsedUser = JSON.parse(rawUser);
        if (!parsedUser?.id) {
            localStorage.removeItem('splitmate_user');
            return <Navigate to="/login" replace />;
        }
    } catch {
        localStorage.removeItem('splitmate_user');
        return <Navigate to="/login" replace />;
    }

    return children;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />
                <Route path="/my-account" element={
                    <ProtectedRoute>
                        <MyAccount />
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
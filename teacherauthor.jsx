import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';

export default function TeacherAuth({ mode }) { // mode is 'login' or 'signup'
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { signupTeacher, login } = useAuth();
    const navigate = useNavigate();

    const validateUsername = (name) => {
        // "no empty spaces, numbers and other special character" (Assuming just letters?)
        // User said: "shouldnt accept empty spaces,numbers and other special character"
        // This implies ONLY letters. 
        // "it can accept spaces in between names" -> This contradicts "no empty spaces".
        // Let's assume: Letters and spaces allowed. No numbers, no special chars.
        const regex = /^[a-zA-Z\s]+$/;
        return regex.test(name);
    };

    const validatePassword = (pass) => {
        // "no special characters space are not allowed only uppercase,lower case letters and numbers"
        const regex = /^[a-zA-Z0-9]+$/;
        return regex.test(pass);
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (mode === 'signup') {
            if (!validateUsername(username)) {
                return setError("Username can only contain letters and spaces.");
            }
            if (!validatePassword(password)) {
                return setError("Password must contain only letters and numbers (no special chars).");
            }
        }

        try {
            if (mode === 'signup') {
                // We aren't asking for email in the UI description, but Firebase Auth NEEDS email.
                // We can fake an email for the user based on username if they don't provide one, 
                // OR we just ask for it. Standard practice is to ask.
                // User request: "enter teacher login or signin module... user can login with their username and password"
                // I will hide the email requirement by generating one: `username@gradecalc.generated` 
                // BUT unique usernames are tricky in Firebase with just email.
                // Let's stick to standard Email/Password for the backend but maybe label 'Email' as 'Username' if we want to be tricky, 
                // but the user explicitly said "username". 
                // Implementation: I'll use a dummy email domain for the auth header if I only implement username input.
                const dummyEmail = `${username.replace(/\s/g, '').toLowerCase()}@gradecalc.local`;
                await signupTeacher(dummyEmail, password, username);
            } else {
                // Login
                // We need updates to AuthContext to support username login (searching email by username)
                // For now, I'll add an Email field to the UI to be safe and robust, 
                // or just ask user to enter Username and I try to construct the dummy email.
                const dummyEmail = `${username.replace(/\s/g, '').toLowerCase()}@gradecalc.local`;
                await login(dummyEmail, password);
            }
            navigate('/teacher/dashboard');
        } catch (err) {
            console.error(err);
            setError("Failed to " + mode + ". " + err.message);
        }
    }

    return (
        <div className="container">
            <Link to="/" style={{ color: 'var(--accent-primary)', marginBottom: '1rem', display: 'block' }}>&larr; Back to Home</Link>
            <div className="auth-box card fade-in">
                <h2 className="title" style={{ fontSize: '1.5rem', textAlign: 'center' }}>
                    Teacher {mode === 'login' ? 'Login' : 'Signup'}
                </h2>

                {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Using Username as the primary identifier as requested */}
                    <Input
                        label="Username (Name)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. John Doe"
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Letters and numbers only"
                        required
                    />

                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                        {mode === 'login' ? 'Enter Portal' : 'Create Account'}
                    </button>
                </form>

                <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <Link
                        to={mode === 'login' ? "/teacher/signup" : "/teacher/login"}
                        style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}
                    >
                        {mode === 'login' ? "Signup" : "Login"}
                    </Link>
                </p>
            </div>
        </div>
    );
}
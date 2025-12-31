import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function StudentAuth() {
    const [step, setStep] = useState(1); // 1: Enter ID, 2: Enter Password (Login or Set)
    const [studentID, setStudentID] = useState('');
    const [password, setPassword] = useState('');
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    // Helper validation
    const validatePassword = (pass) => /^[a-zA-Z0-9]+$/.test(pass);

    const handleIdSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Check if student exists in DB (added by teacher)
            const docRef = doc(db, "students", studentID);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.passwordSet) {
                    setIsFirstTime(false);
                } else {
                    setIsFirstTime(true);
                }
                setStep(2);
            } else {
                setError("Student ID not found. ask your teacher to add you.");
            }
        } catch (err) {
            console.error(err);
            setError("Error checking ID. " + err.message);
        }
    };

    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Input validation
        if (!validatePassword(password)) {
            return setError("Password must contain only letters and numbers.");
        }

        try {
            // Since we need to Auth with Firebase, we need an email. 
            // We'll construct one: ID@gradecalc.student
            const email = `${studentID}@gradecalc.student`;

            if (isFirstTime) {
                // Create Auth User
                // Note: In real world, we might need a secondary check or a temporary password from teacher to prevent ID spoofing. 
                // For this demo, we assume possession of ID allows account creation (per user simplistic flow).
                await createUserWithEmailAndPassword(auth, email, password);

                // Update Firestore to mark password as set
                await updateDoc(doc(db, "students", studentID), {
                    passwordSet: true,
                    email: email // optional
                });
            } else {
                // Login
                await signInWithEmailAndPassword(auth, email, password);
            }

            navigate('/student/dashboard');
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                // This happens if Auth user exists but Firestore said 'passwordSet: false' (inconsistent state)
                // Or if we are trying to create user again.
                // Try logging in if this happens?
                try {
                    await signInWithEmailAndPassword(auth, `${studentID}@gradecalc.student`, password);
                    navigate('/student/dashboard');
                } catch (loginErr) {
                    setError("Login failed: " + loginErr.message);
                }
            } else {
                setError("Authentication failed: " + err.message);
            }
        }
    };

    return (
        <div className="container">
            <Link to="/" style={{ color: 'var(--accent-primary)', marginBottom: '1rem', display: 'block' }}>&larr; Back to Home</Link>
            <div className="auth-box card fade-in">
                <h2 className="title" style={{ fontSize: '1.5rem', textAlign: 'center' }}>Student Login</h2>
                {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}

                {step === 1 && (
                    <form onSubmit={handleIdSubmit}>
                        <Input
                            label="Enter Student ID"
                            value={studentID}
                            onChange={e => setStudentID(e.target.value)}
                            placeholder="e.g. 12345"
                            required
                        />
                        <button className="btn btn-primary" style={{ width: '100%' }}>Next</button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleFinalSubmit}>
                        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                            {isFirstTime ? "Set your password (First time login)" : "Enter your password"}
                        </p>
                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" onClick={() => setStep(1)} className="btn btn-outline">Back</button>
                            <button className="btn btn-primary" style={{ flex: 1 }}>
                                {isFirstTime ? "Set Password & Login" : "Login"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
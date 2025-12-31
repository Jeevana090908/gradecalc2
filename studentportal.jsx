
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function StudentPortal() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState('dashboard'); // 'dashboard', 'performance', 'grades', 'failed'

    const [myStats, setMyStats] = useState(null);
    const [allStudents, setAllStudents] = useState([]);

    // Filters for View Grades
    const [filterBranch, setFilterBranch] = useState('All');
    const [filterSection, setFilterSection] = useState('All');

    useEffect(() => {
        if (currentUser?.uid) {
            // Real-time listener for my stats
            const unsub = onSnapshot(doc(db, "students", currentUser.uid), (doc) => {
                if (doc.exists()) setMyStats(doc.data());
            });
            return () => unsub();
        }
    }, [currentUser]);

    useEffect(() => {
        let unsubscribe = () => { };
        if (view === 'grades' || view === 'failed' || view === 'performance') {
            const q = collection(db, "students");
            unsubscribe = onSnapshot(q, (snap) => {
                let list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

                // Filter if needed (Except for Performance Rank view, which needs ALL to Calculate rank)
                if (view === 'grades' || view === 'failed') {
                    if (filterBranch !== 'All') list = list.filter(s => s.branch === filterBranch);
                    if (filterSection !== 'All') list = list.filter(s => s.section === filterSection);
                }

                // Calculate Rank for everyone
                // Sort by CGPA desc
                list.sort((a, b) => b.cgpa - a.cgpa);

                // Assign Rank
                const rankedList = list.map((s, i) => ({ ...s, rank: i + 1 }));
                setAllStudents(rankedList);
            });
        }
        return () => unsubscribe();
    }, [view, filterBranch, filterSection]);

    // Helper to get my rank from the full list
    const getMyRankInClass = () => {
        const me = allStudents.find(s => s.id === myStats?.id);
        return me ? me.rank : '-';
    };

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h1 className="title">Student Portal</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Hello, {myStats?.name || 'Student'}</span>
                    <button onClick={logout} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Logout</button>
                </div>
            </div>

            {view === 'dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                    <div className="card" onClick={() => setView('performance')} style={{ width: '100%', maxWidth: '600px', cursor: 'pointer', border: '1px solid var(--accent-primary)' }}>
                        <h2 style={{ color: 'var(--accent-primary)' }}>My Performance</h2>
                        <p style={{ marginTop: '0.5rem', color: '#ccc' }}>Check your status and rank in class</p>
                    </div>

                    <div className="card" onClick={() => setView('grades')} style={{ width: '100%', maxWidth: '600px', cursor: 'pointer', border: '1px solid var(--success)' }}>
                        <h2 style={{ color: 'var(--success)' }}>View Grades / Rankings</h2>
                        <p style={{ marginTop: '0.5rem', color: '#ccc' }}>See higher to lower rankers</p>
                    </div>

                    <div className="card" onClick={() => setView('failed')} style={{ width: '100%', maxWidth: '600px', cursor: 'pointer', border: '1px solid var(--danger)' }}>
                        <h2 style={{ color: 'var(--danger)' }}>See Failed Students</h2>
                    </div>
                </div>
            )}

            {view === 'performance' && (
                <div className="card fade-in">
                    <button onClick={() => setView('dashboard')} className="btn btn-outline" style={{ marginBottom: '1rem' }}>&larr; Back</button>
                    <h2 style={{ marginBottom: '1rem' }}>My Performance Status</h2>
                    {myStats ? (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>CGPA</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{myStats.cgpa}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Grade</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: myStats.grade === 'F' ? 'var(--danger)' : 'var(--success)' }}>{myStats.grade}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Class Rank</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>#{getMyRankInClass()}</div>
                                </div>
                            </div>

                            <h3>Class Leaderboard</h3>
                            <div className="table-container">
                                <table>
                                    <thead><tr><th>Rank</th><th>Name</th><th>CGPA</th></tr></thead>
                                    <tbody>
                                        {allStudents.map(s => (
                                            <tr key={s.id} style={s.id === myStats.id ? { backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid var(--accent-primary)' } : {}}>
                                                <td>#{s.rank}</td>
                                                <td>{s.name} {s.id === myStats.id && "(You)"}</td>
                                                <td>{s.cgpa}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : <p>Loading...</p>}
                </div>
            )}

            {(view === 'grades' || view === 'failed') && (
                <div className="card fade-in">
                    <button onClick={() => setView('dashboard')} className="btn btn-outline" style={{ marginBottom: '1rem' }}>&larr; Back</button>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                            <option value="All">All Branches</option>
                            {['CSE', 'CSD', 'CAI', 'AIDS', 'ECM', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL'].map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                        <select value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                            <option value="All">All Sections</option>
                            <option value="A">Section A</option>
                            <option value="B">Section B</option>
                        </select>
                    </div>

                    <h2 style={{ marginBottom: '1rem' }}>{view === 'failed' ? 'Failed Students' : 'Student Rankings'}</h2>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Name</th>
                                    <th>Branch</th>
                                    <th>Sec</th>
                                    <th>CGPA</th>
                                    <th>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allStudents
                                    .filter(s => view === 'failed' ? s.grade === 'F' : true)
                                    .map((s, idx) => (
                                        <tr key={s.uid}>
                                            <td>#{s.rank || idx + 1}</td>
                                            <td>{s.name}</td>
                                            <td>{s.branch}</td>
                                            <td>{s.section}</td>
                                            <td>{s.cgpa}</td>
                                            <td style={{ color: s.grade === 'F' ? 'var(--danger)' : 'inherit' }}>{s.grade}</td>
                                        </tr>
                                    ))}
                                {allStudents.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center' }}>No students found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
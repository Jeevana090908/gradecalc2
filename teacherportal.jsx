
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, setDoc, query, where } from 'firebase/firestore';

export default function TeacherPortal() {
    const { logout, currentUser } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState('dashboard'); // 'dashboard', 'add', 'view'

    // Add Student State
    const [studentData, setStudentData] = useState({
        id: '', name: '', branch: 'CSE', section: 'A', year: '1st', subjectCount: 0
    });
    const [marks, setMarks] = useState([]);

    // View Grades State
    const [students, setStudents] = useState([]);
    const [filterBranch, setFilterBranch] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [sortType, setSortType] = useState('none'); // 'rank', 'failed'

    // Fetch students on load of "View" module
    useEffect(() => {
        let unsubscribe = () => { };
        if (view === 'view') {
            const q = collection(db, "students");
            unsubscribe = onSnapshot(q, (snapshot) => {
                let list = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

                // Filter
                if (filterBranch !== 'All') list = list.filter(s => s.branch === filterBranch);
                if (filterSection !== 'All') list = list.filter(s => s.section === filterSection);

                // Sort/Special Views
                if (sortType === 'rank') {
                    list.sort((a, b) => b.cgpa - a.cgpa);
                } else if (sortType === 'failed') {
                    list = list.filter(s => s.grade === 'F');
                }

                setStudents(list);
            });
        }
        return () => unsubscribe();
    }, [view, filterBranch, filterSection, sortType]); // Added dependencies to re-trigger filter logic on snap

    // --- LOGIC ---
    const handleSubjectCountChange = (count) => {
        setStudentData({ ...studentData, subjectCount: count });
        setMarks(new Array(parseInt(count)).fill(0));
    };

    const handleMarkChange = (index, val) => {
        const newMarks = [...marks];
        newMarks[index] = parseInt(val) || 0;
        setMarks(newMarks);
    };

    const calculateGrade = (total, subjects) => {
        // Logic: >= 9.0% (Assuming CGPA logic or percentage?)
        // User said: ">=9.0% give A grade take >=8.0% give B grade"
        // Usually % is out of 100. CGPA is out of 10. 
        // Let's assume user means CGPA points: >= 9.0 is A.
        // Average = Total / Subjects. 
        // If input marks are out of 100, we convert to 10 scale? 
        // Let's assume marks are 0-100.
        if (subjects === 0) return { total: 0, cgpa: 0, grade: 'N/A' };

        // Simple average for now
        const avg = total / subjects;
        // Convert to 10 scale if needed, or just use avg/10. 
        // Let's assume standard calculation: CGPA = Avg / 10
        const cgpa = (avg / 10).toFixed(2);

        let grade = 'C';
        if (cgpa >= 9.0) grade = 'A';
        else if (cgpa >= 8.0) grade = 'B';

        // Fail condition? user implied "failed students". 
        // Usually < 4.0 or < 35marks. Let's say CGPA < 4.0 is F
        if (cgpa < 4.0) grade = 'F';

        return { total, cgpa, grade };
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        const totalMarks = marks.reduce((a, b) => a + b, 0);
        const { total, cgpa, grade } = calculateGrade(totalMarks, marks.length);

        // Create Student Doc
        // ID is used as Document ID for easy lookup
        try {
            await setDoc(doc(db, "students", studentData.id), {
                ...studentData,
                marks,
                total,
                cgpa,
                grade,
                passwordSet: false // for student first login
            });
            alert("Student Added Successfully!");

            // Clear form
            setStudentData({ id: '', name: '', branch: 'CSE', section: 'A', year: '1st', subjectCount: 0 });
            setMarks([]);

            // Redirect to View
            setView('view');
        } catch (err) {
            console.error(err);
            alert("Error adding student: " + err.message);
        }
    };

    const handleRemoveStudent = async (uid) => {
        if (window.confirm("Are you sure you want to remove this student?")) {
            await deleteDoc(doc(db, "students", uid));
            // No need to fetch manually, onSnapshot will trigger
        }
    };

    // Long press logic
    const [longPressTimer, setLongPressTimer] = useState(null);
    const startLongPress = (id) => {
        setLongPressTimer(setTimeout(() => handleRemoveStudent(id), 800)); // 800ms for long press
    };
    const endLongPress = () => {
        clearTimeout(longPressTimer);
    };

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="title">Teacher Portal</h1>
                <button onClick={logout} className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>Logout</button>
            </div>

            {view === 'dashboard' && (
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
                    <div className="card" onClick={() => setView('add')} style={{ cursor: 'pointer', textAlign: 'center', minWidth: '250px', border: '1px solid var(--accent-primary)' }}>
                        <h2 style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }}>Add Student Marks</h2>
                        <p style={{ fontSize: '3rem' }}>+</p>
                    </div>
                    <div className="card" onClick={() => setView('view')} style={{ cursor: 'pointer', textAlign: 'center', minWidth: '250px', border: '1px solid var(--success)' }}>
                        <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>View Grades</h2>
                        <p style={{ fontSize: '3rem' }}>📄</p>
                    </div>
                </div>
            )}

            {view === 'add' && (
                <div className="card fade-in">
                    <button onClick={() => setView('dashboard')} className="btn btn-outline" style={{ marginBottom: '1rem' }}>&larr; Back</button>
                    <h2 style={{ marginBottom: '1.5rem' }}>Add New Student</h2>
                    <form onSubmit={handleAddStudent}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <Input label="Student ID" value={studentData.id} onChange={e => setStudentData({ ...studentData, id: e.target.value })} required />
                            <Input label="Name" value={studentData.name} onChange={e => setStudentData({ ...studentData, name: e.target.value })} required />

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Branch</label>
                                <select value={studentData.branch} onChange={e => setStudentData({ ...studentData, branch: e.target.value })} required>
                                    {['CSE', 'CSD', 'CAI', 'AIDS', 'ECM', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL'].map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Year</label>
                                <select value={studentData.year} onChange={e => setStudentData({ ...studentData, year: e.target.value })} required>
                                    <option value="1st">1st Year</option>
                                    <option value="2nd">2nd Year</option>
                                </select>
                            </div>

                            <Input label="Section" value={studentData.section} onChange={e => setStudentData({ ...studentData, section: e.target.value })} required />

                            <Input
                                label="No. of Subjects"
                                type="number"
                                value={studentData.subjectCount}
                                onChange={e => handleSubjectCountChange(e.target.value)}
                                min="1" max="10"
                            />
                        </div>

                        {studentData.subjectCount > 0 && (
                            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                                {marks.map((mark, i) => (
                                    <div key={i}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sub {i + 1}</label>
                                        <input
                                            type="number"
                                            value={mark}
                                            onChange={e => handleMarkChange(i, e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem' }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <button className="btn btn-primary" style={{ marginTop: '2rem', width: '100%' }}>Add Student</button>
                    </form>
                </div>
            )}

            {view === 'view' && (
                <div className="card fade-in" style={{ maxWidth: '100%' }}>
                    <button onClick={() => setView('dashboard')} className="btn btn-outline" style={{ marginBottom: '1rem' }}>&larr; Back</button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
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
                                <option value="C">Section C</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                className={`btn ${sortType === 'rank' ? 'btn-primary' : 'btn-outline'} `}
                                onClick={() => setSortType(sortType === 'rank' ? 'none' : 'rank')}
                            >
                                Rank (High-Low)
                            </button>
                            <button
                                className={`btn ${sortType === 'failed' ? 'btn-danger' : 'btn-outline'} `}
                                onClick={() => setSortType(sortType === 'failed' ? 'none' : 'failed')}
                            >
                                Failed Students
                            </button>
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Branch</th>
                                    <th>Sec</th>
                                    <th>Total</th>
                                    <th>CGPA</th>
                                    <th>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s, idx) => (
                                    <tr
                                        key={s.uid}
                                        onMouseDown={() => startLongPress(s.uid)}
                                        onMouseUp={endLongPress}
                                        onTouchStart={() => startLongPress(s.uid)}
                                        onTouchEnd={endLongPress}
                                        style={{ cursor: 'pointer' }}
                                        title="Long press to remove"
                                    >
                                        <td>{idx + 1}</td>
                                        <td>{s.id}</td>
                                        <td>{s.name}</td>
                                        <td>{s.branch}</td>
                                        <td>{s.section}</td>
                                        <td>{s.total}</td>
                                        <td>{s.cgpa}</td>
                                        <td>
                                            <span style={{
                                                color: s.grade === 'A' ? 'var(--success)' : s.grade === 'F' ? 'var(--danger)' : 'inherit',
                                                fontWeight: 'bold'
                                            }}>
                                                {s.grade}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No students found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {view === 'view' && (
                        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                            <button onClick={() => setView('add')} className="btn btn-primary">Back to Add Student</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
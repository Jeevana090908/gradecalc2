import React from 'react';

export default function Input({ label, type = "text", value, onChange, placeholder, required = false, ...props }) {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                style={{ width: '100%' }}
                {...props}
            />
        </div>
    );
}
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Field } from '../components/ui.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login-intro">
        <h1>Reviews that reflect the year, not the last week.</h1>
        <p>Set goals, collect feedback, and complete appraisals in one place.</p>
      </section>
      <form className="login-form" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Log in' : 'Create an account'}</h2>
        <Alert>{error}</Alert>
        {mode === 'register' && <Field label="Full name"><input value={form.name} onChange={set('name')} required /></Field>}
        <Field label="Email"><input type="email" value={form.email} onChange={set('email')} required /></Field>
        <Field label="Password"><input type="password" value={form.password} onChange={set('password')} minLength={6} required /></Field>
        <button className="btn primary" disabled={busy}>{mode === 'login' ? 'Log in' : 'Create account'}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'New here? Create an employee account' : 'Already have an account? Log in'}
        </button>
        {mode === 'login' && <p className="hint">Demo: admin@epms.com, manager@epms.com or employee@epms.com with Password@123</p>}
      </form>
    </div>
  );
}

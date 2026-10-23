import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', roles: ['admin', 'manager', 'employee'], end: true },
  { to: '/goals', label: 'Goals', roles: ['admin', 'manager', 'employee'] },
  { to: '/appraisals', label: 'Appraisals', roles: ['admin', 'manager', 'employee'] },
  { to: '/feedback', label: 'Feedback', roles: ['admin', 'manager', 'employee'] },
  { to: '/reports', label: 'Reports', roles: ['admin', 'manager'] },
  { to: '/admin', label: 'Administration', roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Performance<br />Review</div>
        <nav aria-label="Main">
          {NAV.filter((n) => n.roles.includes(user.role)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="me">
          <strong>{user.name}</strong>
          <span>{user.role}{user.designation ? ` · ${user.designation}` : ''}</span>
          <button className="btn ghost light" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  );
}

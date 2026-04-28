import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://35.180.66.115:3000/api/v1';

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Add token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export default function App() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
  // Check if we just came back from GitHub OAuth
  const params = new URLSearchParams(window.location.search);
  const token = params.get('access_token');
  if (token) {
    localStorage.setItem('access_token', token);
    window.history.replaceState({}, '', '/');
  }
  fetchMe();
}, []);

  useEffect(() => {
    if (user) fetchProfiles();
  }, [user, page]);

  async function fetchMe() {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
    } catch {
      setUser(null);
    }
  }

  async function fetchProfiles() {
    setLoading(true);
    try {
      const res = await api.get('/profiles', { params: { page, limit: 10 } });
      setProfiles(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch profiles');
    }
    setLoading(false);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await api.get('/profiles/search', { params: { q: search } });
      setProfiles(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed');
    }
    setLoading(false);
  }

  async function handleExport() {
    window.open(`${API}/profiles/export`, '_blank');
  }

  async function handleLogout() {
    await api.post('/auth/logout');
    setUser(null);
    setProfiles([]);
  }

 function handleLogin() {
  window.location.href = `http://35.180.66.115:3000/api/v1/auth/github`;
}

  if (!user) {
    return (
      <div style={styles.center}>
        <h1>Insighta Labs</h1>
        <p>Demographic Intelligence Platform</p>
        <button style={styles.btn} onClick={handleLogin}>
          Login with GitHub
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Insighta Labs</h2>
        <div>
          <span>👤 {user.username} ({user.role})</span>
          <button style={styles.btnSmall} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div style={styles.searchBar}>
        <form onSubmit={handleSearch}>
          <input
            style={styles.input}
            placeholder="Search e.g. young males from nigeria"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button style={styles.btn} type="submit">Search</button>
          <button style={styles.btn} type="button" onClick={fetchProfiles}>Reset</button>
          {user.role === 'admin' && (
            <button style={styles.btnGreen} type="button" onClick={handleExport}>
              Export CSV
            </button>
          )}
        </form>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading...</p>}

      <p>Total: {total} profiles</p>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>Name</th><th>Gender</th><th>Age</th>
            <th>Age Group</th><th>Country</th><th>Created</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.gender}</td>
              <td>{p.age}</td>
              <td>{p.age_group}</td>
              <td>{p.country_name}</td>
              <td>{new Date(p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.pagination}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          Prev
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
}

const styles = {
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  container: { padding: '20px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  searchBar: { marginBottom: '20px' },
  input: { padding: '8px', width: '300px', marginRight: '10px', fontSize: '14px' },
  btn: { padding: '8px 16px', marginRight: '8px', cursor: 'pointer', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' },
  btnSmall: { padding: '6px 12px', marginLeft: '12px', cursor: 'pointer', background: '#e00', color: 'white', border: 'none', borderRadius: '4px' },
  btnGreen: { padding: '8px 16px', cursor: 'pointer', background: '#0a0', color: 'white', border: 'none', borderRadius: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  pagination: { marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center' },
};
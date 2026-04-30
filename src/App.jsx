import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://35.180.66.115:3000/api/v1';

const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: { 'X-API-Version': '1' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) return Promise.reject(err);
        const res = await axios.post(`${API}/auth/refresh`, { refresh_token: refresh });
        const newToken = res.data.access_token;
        const newRefresh = res.data.refresh_token;
        localStorage.setItem('access_token', newToken);
        localStorage.setItem('refresh_token', newRefresh);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/';
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [profiles, setProfiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token');
    const refresh = params.get('refresh_token');
    if (token) {
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refresh);
      window.history.replaceState({}, '', '/');
    }
    fetchMe();
  }, []);

  useEffect(() => {
    if (user && page === 'profiles') fetchProfiles();
  }, [user, page, currentPage]);

  async function fetchMe() {
    setAuthLoading(true);
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
    } catch {
      setUser(null);
    }
    setAuthLoading(false);
  }

  async function fetchProfiles() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/profiles', {
        params: { page: currentPage, limit: 10 }
      });
      setProfiles(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch');
    }
    setLoading(false);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/profiles/search', { params: { q: search } });
      setSearchResults(res.data.data);
      setSearchTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed');
    }
    setLoading(false);
  }

  async function handleLogout() {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await api.post('/auth/logout', { refresh_token: refresh });
    } catch {}
    localStorage.clear();
    setUser(null);
  }

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f1a', color: '#fff' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={s.loginPage}>
        <div style={s.loginBox}>
          <h1 style={{ color: '#7c3aed', marginBottom: 8 }}>Insighta Labs+</h1>
          <p style={{ color: '#888', marginBottom: 32 }}>Demographic Intelligence Platform</p>
          <button style={s.githubBtn} onClick={() => window.location.href = `${API}/auth/github`}>
            Continue with GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.app}>
      <div style={s.sidebar}>
        <h2 style={{ color: '#7c3aed', marginBottom: 32 }}>Insighta</h2>
        {['dashboard', 'profiles', 'search', 'account'].map(p => (
          <button
            key={p}
            style={{ ...s.navBtn, background: page === p ? '#7c3aed' : 'transparent' }}
            onClick={() => setPage(p)}
          >
            {p === 'dashboard' && '📊 '}
            {p === 'profiles' && '👥 '}
            {p === 'search' && '🔍 '}
            {p === 'account' && '👤 '}
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
        <button style={{ ...s.navBtn, marginTop: 'auto', color: '#e00' }} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div style={s.main}>

        {page === 'dashboard' && (
          <div>
            <h2>Dashboard</h2>
            <p style={{ color: '#888' }}>Welcome back, {user.username}!</p>
            <div style={s.cards}>
              <div style={s.card}>
                <h3>Total Profiles</h3>
                <p style={s.cardNum}>2026</p>
              </div>
              <div style={s.card}>
                <h3>Your Role</h3>
                <p style={s.cardNum}>{user.role}</p>
              </div>
              <div style={s.card}>
                <h3>Status</h3>
                <p style={{ ...s.cardNum, color: '#0a0' }}>Active</p>
              </div>
            </div>
            <div style={{ marginTop: 32 }}>
              <h3>Quick Actions</h3>
              <button style={s.btn} onClick={() => setPage('profiles')}>View Profiles</button>
              <button style={{ ...s.btn, marginLeft: 12 }} onClick={() => setPage('search')}>Search</button>
            </div>
          </div>
        )}

        {page === 'profiles' && (
          <div>
            <h2>Profiles</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {loading && <p>Loading...</p>}
            <p style={{ color: '#888' }}>Total: {total} profiles | Page {currentPage} of {totalPages}</p>
            <table style={s.table}>
              <thead>
                <tr style={{ background: '#1a1a2e' }}>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Gender</th>
                  <th style={s.th}>Age</th>
                  <th style={s.th}>Age Group</th>
                  <th style={s.th}>Country</th>
                  <th style={s.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => (
                  <tr key={p.id} style={s.tr}>
                    <td style={s.td}>{p.name}</td>
                    <td style={s.td}>{p.gender}</td>
                    <td style={s.td}>{p.age}</td>
                    <td style={s.td}>{p.age_group}</td>
                    <td style={s.td}>{p.country_name}</td>
                    <td style={s.td}>{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={s.pagination}>
              <button style={s.btn} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
              <span style={{ margin: '0 16px' }}>Page {currentPage} of {totalPages}</span>
              <button style={s.btn} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
            </div>
          </div>
        )}

        {page === 'search' && (
          <div>
            <h2>Natural Language Search</h2>
            <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
              <input
                style={s.input}
                placeholder="e.g. young males from nigeria"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button style={s.btn} type="submit">Search</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {loading && <p>Loading...</p>}
            {searchResults.length > 0 && (
              <>
                <p style={{ color: '#888' }}>Found: {searchTotal} results</p>
                <table style={s.table}>
                  <thead>
                    <tr style={{ background: '#1a1a2e' }}>
                      <th style={s.th}>Name</th>
                      <th style={s.th}>Gender</th>
                      <th style={s.th}>Age</th>
                      <th style={s.th}>Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map(p => (
                      <tr key={p.id} style={s.tr}>
                        <td style={s.td}>{p.name}</td>
                        <td style={s.td}>{p.gender}</td>
                        <td style={s.td}>{p.age}</td>
                        <td style={s.td}>{p.country_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {page === 'account' && (
          <div>
            <h2>Account</h2>
            <div style={s.accountCard}>
              <img
                src={user.avatar_url}
                alt="avatar"
                style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: 16 }}
              />
              <div style={s.accountRow}>
                <span style={s.label}>Username</span>
                <span>{user.username}</span>
              </div>
              <div style={s.accountRow}>
                <span style={s.label}>Email</span>
                <span>{user.email || 'N/A'}</span>
              </div>
              <div style={s.accountRow}>
                <span style={s.label}>Role</span>
                <span style={{ color: user.role === 'admin' ? '#7c3aed' : '#0070f3' }}>
                  {user.role}
                </span>
              </div>
              <div style={s.accountRow}>
                <span style={s.label}>User ID</span>
                <span style={{ fontSize: 12, color: '#888' }}>{user.id}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const s = {
  app: { display: 'flex', minHeight: '100vh', background: '#0f0f1a', color: '#fff', fontFamily: 'sans-serif' },
  sidebar: { width: 200, background: '#1a1a2e', padding: 24, display: 'flex', flexDirection: 'column' },
  main: { flex: 1, padding: 32 },
  navBtn: { display: 'block', width: '100%', padding: '10px 16px', marginBottom: 8, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: 14 },
  loginPage: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f1a' },
  loginBox: { background: '#1a1a2e', padding: 48, borderRadius: 16, textAlign: 'center', width: 360 },
  githubBtn: { background: '#7c3aed', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 8, cursor: 'pointer', fontSize: 16, width: '100%' },
  cards: { display: 'flex', gap: 24, marginTop: 24 },
  card: { background: '#1a1a2e', padding: 24, borderRadius: 12, flex: 1 },
  cardNum: { fontSize: 32, fontWeight: 'bold', color: '#7c3aed', margin: 0 },
  btn: { background: '#7c3aed', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  input: { padding: '10px 16px', width: 360, marginRight: 12, fontSize: 14, background: '#1a1a2e', border: '1px solid #333', borderRadius: 6, color: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 16 },
  th: { padding: '10px 12px', textAlign: 'left', color: '#888', fontSize: 13 },
  td: { padding: '10px 12px', borderBottom: '1px solid #1a1a2e', fontSize: 14 },
  tr: { background: '#0f0f1a' },
  pagination: { marginTop: 24, display: 'flex', alignItems: 'center' },
  accountCard: { background: '#1a1a2e', padding: 32, borderRadius: 12, maxWidth: 480 },
  accountRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #333' },
  label: { color: '#888', fontSize: 14 },
};

// import { useState, useEffect } from 'react';
// import axios from 'axios';

// const API = 'http://35.180.66.115:3000/api/v1';

// const api = axios.create({
//   baseURL: API,
//   withCredentials: true,
//   headers: { 'X-API-Version': '1' },
// });

// api.interceptors.request.use(config => {
//   const token = localStorage.getItem('access_token');
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// export default function App() {
//   const [user, setUser] = useState(null);
//   const [page, setPage] = useState('dashboard');
//   const [profiles, setProfiles] = useState([]);
//   const [total, setTotal] = useState(0);
//   const [totalPages, setTotalPages] = useState(0);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [search, setSearch] = useState('');
//   const [searchResults, setSearchResults] = useState([]);
//   const [searchTotal, setSearchTotal] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const token = params.get('access_token');
//     const refresh = params.get('refresh_token');
//     if (token) {
//       localStorage.setItem('access_token', token);
//       localStorage.setItem('refresh_token', refresh);
//       window.history.replaceState({}, '', '/');
//     }
//     fetchMe();
//   }, []);

//   useEffect(() => {
//     if (user && page === 'profiles') fetchProfiles();
//   }, [user, page, currentPage]);

//   async function fetchMe() {
//     try {
//       const res = await api.get('/auth/me');
//       setUser(res.data.data);
//     } catch {
//       setUser(null);
//     }
//   }

//   async function fetchProfiles() {
//     setLoading(true);
//     setError('');
//     try {
//       const res = await api.get('/profiles', {
//         params: { page: currentPage, limit: 10 }
//       });
//       setProfiles(res.data.data);
//       setTotal(res.data.total);
//       setTotalPages(res.data.total_pages);
//     } catch (err) {
//       setError(err.response?.data?.message || 'Failed to fetch');
//     }
//     setLoading(false);
//   }

//   async function handleSearch(e) {
//     e.preventDefault();
//     if (!search.trim()) return;
//     setLoading(true);
//     setError('');
//     try {
//       const res = await api.get('/profiles/search', { params: { q: search } });
//       setSearchResults(res.data.data);
//       setSearchTotal(res.data.total);
//     } catch (err) {
//       setError(err.response?.data?.message || 'Search failed');
//     }
//     setLoading(false);
//   }

//   async function handleLogout() {
//     try {
//       const refresh = localStorage.getItem('refresh_token');
//       await api.post('/auth/logout', { refresh_token: refresh });
//     } catch {}
//     localStorage.clear();
//     setUser(null);
//   }

//   if (!user) {
//     return (
//       <div style={s.loginPage}>
//         <div style={s.loginBox}>
//           <h1 style={{ color: '#7c3aed', marginBottom: 8 }}>Insighta Labs+</h1>
//           <p style={{ color: '#888', marginBottom: 32 }}>Demographic Intelligence Platform</p>
//           <button style={s.githubBtn} onClick={() => window.location.href = `${API}/auth/github`}>
//             🐙 Continue with GitHub
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div style={s.app}>
//       {/* SIDEBAR */}
//       <div style={s.sidebar}>
//         <h2 style={{ color: '#7c3aed', marginBottom: 32 }}>Insighta</h2>
//         {['dashboard', 'profiles', 'search', 'account'].map(p => (
//           <button
//             key={p}
//             style={{ ...s.navBtn, background: page === p ? '#7c3aed' : 'transparent' }}
//             onClick={() => setPage(p)}
//           >
//             {p === 'dashboard' && '📊 '}
//             {p === 'profiles' && '👥 '}
//             {p === 'search' && '🔍 '}
//             {p === 'account' && '👤 '}
//             {p.charAt(0).toUpperCase() + p.slice(1)}
//           </button>
//         ))}
//         <button style={{ ...s.navBtn, marginTop: 'auto', color: '#e00' }} onClick={handleLogout}>
//           🚪 Logout
//         </button>
//       </div>

//       {/* MAIN CONTENT */}
//       <div style={s.main}>

//         {/* DASHBOARD */}
//         {page === 'dashboard' && (
//           <div>
//             <h2>📊 Dashboard</h2>
//             <p style={{ color: '#888' }}>Welcome back, {user.username}!</p>
//             <div style={s.cards}>
//               <div style={s.card}>
//                 <h3>Total Profiles</h3>
//                 <p style={s.cardNum}>2026</p>
//               </div>
//               <div style={s.card}>
//                 <h3>Your Role</h3>
//                 <p style={s.cardNum}>{user.role}</p>
//               </div>
//               <div style={s.card}>
//                 <h3>Status</h3>
//                 <p style={{ ...s.cardNum, color: '#0a0' }}>Active</p>
//               </div>
//             </div>
//             <div style={{ marginTop: 32 }}>
//               <h3>Quick Actions</h3>
//               <button style={s.btn} onClick={() => setPage('profiles')}>View Profiles</button>
//               <button style={{ ...s.btn, marginLeft: 12 }} onClick={() => setPage('search')}>Search</button>
//             </div>
//           </div>
//         )}

//         {/* PROFILES */}
//         {page === 'profiles' && (
//           <div>
//             <h2>👥 Profiles</h2>
//             {error && <p style={{ color: 'red' }}>{error}</p>}
//             {loading && <p>Loading...</p>}
//             <p style={{ color: '#888' }}>Total: {total} profiles | Page {currentPage} of {totalPages}</p>
//             <table style={s.table}>
//               <thead>
//                 <tr style={{ background: '#1a1a2e' }}>
//                   <th style={s.th}>Name</th>
//                   <th style={s.th}>Gender</th>
//                   <th style={s.th}>Age</th>
//                   <th style={s.th}>Age Group</th>
//                   <th style={s.th}>Country</th>
//                   <th style={s.th}>Created</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {profiles.map(p => (
//                   <tr key={p.id} style={s.tr}>
//                     <td style={s.td}>{p.name}</td>
//                     <td style={s.td}>{p.gender}</td>
//                     <td style={s.td}>{p.age}</td>
//                     <td style={s.td}>{p.age_group}</td>
//                     <td style={s.td}>{p.country_name}</td>
//                     <td style={s.td}>{new Date(p.created_at).toLocaleDateString()}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//             <div style={s.pagination}>
//               <button style={s.btn} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
//               <span style={{ margin: '0 16px' }}>Page {currentPage} of {totalPages}</span>
//               <button style={s.btn} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
//             </div>
//           </div>
//         )}

//         {/* SEARCH */}
//         {page === 'search' && (
//           <div>
//             <h2>🔍 Natural Language Search</h2>
//             <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
//               <input
//                 style={s.input}
//                 placeholder="e.g. young males from nigeria"
//                 value={search}
//                 onChange={e => setSearch(e.target.value)}
//               />
//               <button style={s.btn} type="submit">Search</button>
//             </form>
//             {error && <p style={{ color: 'red' }}>{error}</p>}
//             {loading && <p>Loading...</p>}
//             {searchResults.length > 0 && (
//               <>
//                 <p style={{ color: '#888' }}>Found: {searchTotal} results</p>
//                 <table style={s.table}>
//                   <thead>
//                     <tr style={{ background: '#1a1a2e' }}>
//                       <th style={s.th}>Name</th>
//                       <th style={s.th}>Gender</th>
//                       <th style={s.th}>Age</th>
//                       <th style={s.th}>Country</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {searchResults.map(p => (
//                       <tr key={p.id} style={s.tr}>
//                         <td style={s.td}>{p.name}</td>
//                         <td style={s.td}>{p.gender}</td>
//                         <td style={s.td}>{p.age}</td>
//                         <td style={s.td}>{p.country_name}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </>
//             )}
//           </div>
//         )}

//         {/* ACCOUNT */}
//         {page === 'account' && (
//           <div>
//             <h2>👤 Account</h2>
//             <div style={s.accountCard}>
//               <img
//                 src={user.avatar_url}
//                 alt="avatar"
//                 style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: 16 }}
//               />
//               <div style={s.accountRow}>
//                 <span style={s.label}>Username</span>
//                 <span>{user.username}</span>
//               </div>
//               <div style={s.accountRow}>
//                 <span style={s.label}>Email</span>
//                 <span>{user.email || 'N/A'}</span>
//               </div>
//               <div style={s.accountRow}>
//                 <span style={s.label}>Role</span>
//                 <span style={{ color: user.role === 'admin' ? '#7c3aed' : '#0070f3' }}>
//                   {user.role}
//                 </span>
//               </div>
//               <div style={s.accountRow}>
//                 <span style={s.label}>User ID</span>
//                 <span style={{ fontSize: 12, color: '#888' }}>{user.id}</span>
//               </div>
//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }

// const s = {
//   app: { display: 'flex', minHeight: '100vh', background: '#0f0f1a', color: '#fff', fontFamily: 'sans-serif' },
//   sidebar: { width: 200, background: '#1a1a2e', padding: 24, display: 'flex', flexDirection: 'column' },
//   main: { flex: 1, padding: 32 },
//   navBtn: { display: 'block', width: '100%', padding: '10px 16px', marginBottom: 8, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: 14 },
//   loginPage: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f1a' },
//   loginBox: { background: '#1a1a2e', padding: 48, borderRadius: 16, textAlign: 'center', width: 360 },
//   githubBtn: { background: '#7c3aed', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 8, cursor: 'pointer', fontSize: 16, width: '100%' },
//   cards: { display: 'flex', gap: 24, marginTop: 24 },
//   card: { background: '#1a1a2e', padding: 24, borderRadius: 12, flex: 1 },
//   cardNum: { fontSize: 32, fontWeight: 'bold', color: '#7c3aed', margin: 0 },
//   btn: { background: '#7c3aed', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
//   input: { padding: '10px 16px', width: 360, marginRight: 12, fontSize: 14, background: '#1a1a2e', border: '1px solid #333', borderRadius: 6, color: '#fff' },
//   table: { width: '100%', borderCollapse: 'collapse', marginTop: 16 },
//   th: { padding: '10px 12px', textAlign: 'left', color: '#888', fontSize: 13 },
//   td: { padding: '10px 12px', borderBottom: '1px solid #1a1a2e', fontSize: 14 },
//   tr: { background: '#0f0f1a' },
//   pagination: { marginTop: 24, display: 'flex', alignItems: 'center' },
//   accountCard: { background: '#1a1a2e', padding: 32, borderRadius: 12, maxWidth: 480 },
//   accountRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #333' },
//   label: { color: '#888', fontSize: 14 },
// };
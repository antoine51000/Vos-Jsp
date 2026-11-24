import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

if (currentPage !== 'maintenance.html') {
  let maintenanceActive = false;
  let authReady = false;
  let currentRole = 'membre';

  function hasValidBypass() {
    if (sessionStorage.getItem('vos_jsp_mnt_force_block') === '1') return false;
    const raw = sessionStorage.getItem('vos_jsp_mnt_bypass');
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return Boolean(parsed && (parsed.type === 'superadmin' || parsed.type === 'otp'));
    } catch (_) {
      return false;
    }
  }

  function evaluateGuard() {
    if (!maintenanceActive) return;
    if (hasValidBypass()) return;
    if (authReady && currentRole === 'superadmin') return;
    window.location.replace('maintenance.html');
  }

  onSnapshot(doc(db, 'site_config', 'maintenance'), (snap) => {
    maintenanceActive = snap.exists() && snap.data().enabled === true;
    evaluateGuard();
  });

  onAuthStateChanged(auth, async (user) => {
    authReady = true;
    if (!user) {
      currentRole = 'membre';
      evaluateGuard();
      return;
    }
    try {
      const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
      const uSnap = await getDoc(doc(db, 'users', user.uid));
      const d = uSnap.exists() ? (uSnap.data() || {}) : {};
      currentRole = String(d.role || d.grade || 'membre').toLowerCase();
    } catch (_) {
      currentRole = 'membre';
    }
    evaluateGuard();
  });
}

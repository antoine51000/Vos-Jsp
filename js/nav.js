import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const scriptEl = document.querySelector('script[type="module"][src*="nav.js"]');
const activeHref = (scriptEl && scriptEl.dataset.active) || (window.location.pathname.split('/').pop() || 'index.html');
const logoutRedirect = (scriptEl && scriptEl.dataset.logoutRedirect) || activeHref || 'index.html';

const NAV_LINKS = [
  { href: 'index.html', label: 'Accueil' },
  { href: 'actus.html', label: 'Actualités' },
  { href: 'galerie.html', label: 'Galerie' },
  { href: 'proposer.html', label: 'Proposer' },
  { href: 'a-propos.html', label: 'À propos' },
  { href: 'forum.html', label: 'Forum' },
  { href: 'profil.html', label: 'Profil' },
  { href: 'contester.html', label: 'Contester' }
];

function getInitials(label) {
  const clean = String(label || 'JS')
    .replace(/^\s*\[\s*(?:SUPER\s*ADMIN|SUPERADMIN|ADMIN|MODO|MODERATEUR|MODÉRATEUR)\s*\]\s*[-–:]?\s*/i, '')
    .trim() || 'JS';
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : clean.slice(0, 2).toUpperCase();
}

function mountNavMarkup() {
  const mount = document.createElement('div');
  mount.id = 'site-nav-root';

  const navItemsHtml = NAV_LINKS.map((item) => {
    const cls = item.href === activeHref ? ' class="active"' : '';
    return `<a href="${item.href}"${cls}>${item.label}</a>`;
  }).join('\n      ');

  const adminCls = activeHref === 'admin.html' ? ' class="active"' : '';
  const mailCls = activeHref === 'mail.html' ? ' class="active"' : '';
  const loginCls = activeHref === 'login.html' ? ' active' : '';

  mount.innerHTML = `
    <div class="topbar">
      <div class="topbar-left">
        <button type="button" class="menu-btn" id="menu-open" aria-label="Ouvrir le menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <a href="index.html" class="brand">
          <span class="brand-dot"></span>
          <div>VOS <span>JSP</span></div>
        </a>
      </div>
      <div id="topbar-right-slot" style="display: flex; align-items: center; gap: 0.5rem;"></div>
    </div>

    <div class="nav-backdrop" id="nav-backdrop"></div>

    <aside class="drawer" id="drawer">
      <div class="drawer-header">
        <a href="index.html" class="brand" style="box-shadow:none; border:none; padding:0.25rem;">
          <span class="brand-dot"></span>
          <div>VOS <span>JSP</span></div>
        </a>
        <button type="button" class="close-btn" id="menu-close" aria-label="Fermer le menu">&times;</button>
      </div>

      <div class="drawer-label">Navigation</div>
      <nav>
        ${navItemsHtml}
        <a href="admin.html" id="drawer-admin-link"${adminCls} style="display: none;">Panel Admin</a>
        <a href="mail.html" id="drawer-mail-link"${mailCls} style="display: none;">Messagerie Admin</a>
      </nav>

      <div id="drawer-profile-box" class="profile-widget" style="display: none;">
        <div class="profile-avatar" id="drawer-profile-avatar">JS</div>
        <div class="profile-meta">
          <strong class="profile-name" id="drawer-profile-name"></strong>
          <span class="profile-tag" id="drawer-profile-role">membre</span>
        </div>
      </div>

      <a href="login.html" id="drawer-auth-btn" class="btn${loginCls}">Connexion</a>
      <button type="button" id="drawer-logout-btn" class="btn btn-secondary btn-small" style="display: none;">Déconnexion</button>
    </aside>
  `;

  document.body.prepend(mount);

  const drawer = document.getElementById('drawer');
  const backdrop = document.getElementById('nav-backdrop');
  const openBtn = document.getElementById('menu-open');
  const closeBtn = document.getElementById('menu-close');

  function closeDrawer() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
  }

  openBtn.addEventListener('click', () => {
    drawer.classList.add('open');
    backdrop.classList.add('open');
  });
  closeBtn.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  drawer.querySelectorAll('nav a').forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });
}

mountNavMarkup();

const profileBox = document.getElementById('drawer-profile-box');
const profileAvatar = document.getElementById('drawer-profile-avatar');
const profileName = document.getElementById('drawer-profile-name');
const profileRole = document.getElementById('drawer-profile-role');
const authBtn = document.getElementById('drawer-auth-btn');
const logoutBtn = document.getElementById('drawer-logout-btn');
const adminLink = document.getElementById('drawer-admin-link');
const mailLink = document.getElementById('drawer-mail-link');

let userUnsub = null;

function applyUserState(user, data = {}) {
  if (!user) {
    profileBox.style.display = 'none';
    logoutBtn.style.display = 'none';
    adminLink.style.display = 'none';
    mailLink.style.display = 'none';
    authBtn.style.display = 'inline-flex';
    return;
  }

  const isBanned = data.banned === true;
  const rawRole = String(data.role || data.grade || 'membre').toLowerCase();
  const isAdmin = !isBanned && (rawRole === 'admin' || rawRole === 'superadmin' || rawRole.includes('admin'));
  const pseudo = data.pseudo || user.displayName || (user.email ? user.email.split('@')[0] : 'Membre');
  const roleLabel = isBanned ? 'banni' : (rawRole === 'superadmin' ? 'superadmin' : (isAdmin ? 'admin' : 'membre'));

  profileName.textContent = pseudo;
  profileAvatar.textContent = getInitials(pseudo);
  profileRole.textContent = roleLabel;
  profileRole.className = isAdmin ? 'profile-tag admin' : 'profile-tag';
  adminLink.style.display = isAdmin ? 'block' : 'none';
  mailLink.style.display = isAdmin ? 'block' : 'none';
  profileBox.style.display = 'flex';
  authBtn.style.display = 'none';
  logoutBtn.style.display = 'inline-flex';
}

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.replace(logoutRedirect);
});

onAuthStateChanged(auth, async (user) => {
  if (userUnsub) {
    userUnsub();
    userUnsub = null;
  }

  if (!user) {
    applyUserState(null);
    return;
  }

  applyUserState(user, {});

  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      applyUserState(user, snap.data() || {});
    }
  } catch (_) {}

  userUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
    if (snap.exists()) {
      applyUserState(user, snap.data() || {});
    }
  }, () => {});
});

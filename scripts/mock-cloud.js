// Backend simulado para probar en local el login y la sincronización sin desplegar nada en AWS.
// scripts/build-mock.js arma www-mock/ con este archivo en lugar de vendor/cloud.js.
(function () {
  const K = "mockcloud";
  const db = () => JSON.parse(localStorage.getItem(K) || '{"users":{},"docs":{},"session":null}');
  const save = d => localStorage.setItem(K, JSON.stringify(d));
  const err = (name, message) => Object.assign(new Error(message || name), { name });
  const wait = () => new Promise(r => setTimeout(r, 120));
  let me = null;
  const Cloud = {
    available: true,
    errMsg: e => (e && e.message) || "Error",
    init() {},
    user: () => me,
    async current() { const d = db(); me = d.session ? { id: d.users[d.session].id, email: d.session } : null; return me; },
    async signUp(email, password) {
      await wait(); const d = db();
      if (d.users[email]) throw err("UsernameExistsException", "Ya existe una cuenta con ese correo.");
      if (password.length < 8) throw err("InvalidPasswordException", "Contraseña débil.");
      d.users[email] = { id: "u" + Math.random().toString(36).slice(2, 10), password, confirmed: false, code: "123456" }; save(d);
      return "CONFIRM_SIGN_UP";
    },
    async confirm(email, code) {
      await wait(); const d = db(), u = d.users[email];
      if (!u || code.trim() !== u.code) throw err("CodeMismatchException", "El código no es correcto.");
      u.confirmed = true; d.session = email; save(d); me = { id: u.id, email }; return me;
    },
    async resend() { await wait(); },
    async signIn(email, password) {
      await wait(); const d = db(), u = d.users[email];
      if (!u || u.password !== password) throw err("NotAuthorizedException", "Correo o contraseña incorrectos.");
      if (!u.confirmed) return "CONFIRM_SIGN_UP";
      d.session = email; save(d); me = { id: u.id, email }; return "DONE";
    },
    async signOut() { const d = db(); d.session = null; save(d); me = null; },
    async forgot() { await wait(); },
    async confirmForgot(email, code, password) { const d = db(); d.users[email].password = password; save(d); },
    async deleteAccount() { const d = db(); for (const id of Object.keys(d.docs)) if (id.startsWith(me.id + "|")) delete d.docs[id]; delete d.users[me.email]; d.session = null; save(d); me = null; },
    async list() {
      await wait(); if (!me) throw err("NotAuthorizedException", "Sin sesión");
      return Object.values(db().docs).filter(x => x.owner === me.id).map(x => ({ id: x.id, path: x.path, updated: x.updated, deleted: x.deleted, data: JSON.parse(x.data) }));
    },
    async put(path, data, updated, deleted) {
      if (window.__offline) throw err("NetworkError", "Sin conexión");
      const d = db(), id = me.id + "|" + path; d.docs[id] = { id, owner: me.id, path, data: JSON.stringify(data), updated, deleted: !!deleted }; save(d);
    }
  };
  window.Cloud = Cloud;
})();

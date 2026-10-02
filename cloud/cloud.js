/* Puente entre la app y el backend de Amplify (Cognito + AppSync/DynamoDB).
   scripts/build-cloud.js lo empaqueta en src/vendor/cloud.js como window.Cloud.
   Si todavía no hay amplify_outputs.json, Cloud.available es false y la app funciona solo en local. */
import { Amplify } from "aws-amplify";
import {
  signUp, confirmSignUp, resendSignUpCode, signIn, signOut, getCurrentUser,
  fetchUserAttributes, resetPassword, confirmResetPassword, autoSignIn, deleteUser
} from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import outputs from "amplify-outputs";

let client = null, me = null;
const known = new Set(); // ids que ya existen en la nube (create vs. update)

const errMsg = e => {
  const n = e && (e.name || e.code) || "";
  const M = {
    UsernameExistsException: "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.",
    UserNotFoundException: "No hay una cuenta con ese correo.",
    NotAuthorizedException: "Correo o contraseña incorrectos.",
    CodeMismatchException: "El código no es correcto. Revísalo e inténtalo otra vez.",
    ExpiredCodeException: "El código venció. Pide uno nuevo.",
    InvalidPasswordException: "La contraseña debe tener al menos 8 caracteres, con mayúscula, minúscula, número y símbolo.",
    InvalidParameterException: "Revisa los datos: el correo debe ser válido y la contraseña cumplir los requisitos.",
    LimitExceededException: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
    TooManyRequestsException: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
    UserNotConfirmedException: "Tu cuenta todavía no está confirmada. Te enviamos un código a tu correo.",
    NetworkError: "Sin conexión a internet."
  };
  return M[n] || (e && /network|fetch/i.test(String(e.message)) ? M.NetworkError : (e && e.message) || "Ocurrió un error.");
};

async function loadMe() {
  try {
    const u = await getCurrentUser();
    let email = u.signInDetails && u.signInDetails.loginId || "";
    try { const a = await fetchUserAttributes(); email = a.email || email; } catch (_) {}
    me = { id: u.userId, email };
  } catch (_) { me = null; }
  return me;
}
const idOf = path => me.id + "|" + path;

const Cloud = {
  available: !!outputs,
  errMsg,
  init() {
    if (!outputs || client) return;
    Amplify.configure(outputs);
    client = generateClient();
  },
  user: () => me,
  current: loadMe,
  async signUp(email, password) {
    const r = await signUp({ username: email, password, options: { userAttributes: { email }, autoSignIn: true } });
    return r.nextStep && r.nextStep.signUpStep; // "CONFIRM_SIGN_UP" | "COMPLETE_AUTO_SIGN_IN" | "DONE"
  },
  async confirm(email, code) {
    const r = await confirmSignUp({ username: email, confirmationCode: code.trim() });
    if (r.nextStep && r.nextStep.signUpStep === "COMPLETE_AUTO_SIGN_IN") { try { await autoSignIn(); } catch (_) {} }
    return loadMe();
  },
  resend: email => resendSignUpCode({ username: email }),
  async signIn(email, password) {
    try { await signOut(); } catch (_) {}
    const r = await signIn({ username: email, password });
    const step = r.nextStep && r.nextStep.signInStep;
    if (step === "CONFIRM_SIGN_UP") { try { await resendSignUpCode({ username: email }); } catch (_) {} return "CONFIRM_SIGN_UP"; }
    await loadMe();
    return step || "DONE";
  },
  async signOut() { known.clear(); try { await signOut(); } finally { me = null; } },
  forgot: email => resetPassword({ username: email }),
  confirmForgot: (email, code, password) => confirmResetPassword({ username: email, confirmationCode: code.trim(), newPassword: password }),
  async deleteAccount() {
    // borra los documentos y luego la cuenta de Cognito
    for (const d of await Cloud.list()) { try { await client.models.Doc.delete({ id: d.id }); } catch (_) {} }
    await deleteUser(); me = null; known.clear();
  },
  // todos los documentos del usuario (o solo los cambiados desde «since»)
  async list(since) {
    const out = []; let nextToken = null;
    do {
      const r = await client.models.Doc.list({ limit: 1000, nextToken, filter: since ? { updated: { gt: since } } : undefined });
      if (r.errors && r.errors.length) throw new Error(r.errors[0].message);
      for (const d of r.data) { known.add(d.id); out.push({ id: d.id, path: d.path, updated: d.updated, deleted: !!d.deleted, data: typeof d.data === "string" ? JSON.parse(d.data) : d.data }); }
      nextToken = r.nextToken;
    } while (nextToken);
    return out;
  },
  async put(path, data, updated, deleted) {
    const item = { id: idOf(path), path, data: JSON.stringify(data == null ? null : data), updated, deleted: !!deleted };
    const tryUpdate = () => client.models.Doc.update(item), tryCreate = () => client.models.Doc.create(item);
    let r = known.has(item.id) ? await tryUpdate() : await tryCreate();
    if (r.errors && r.errors.length) r = known.has(item.id) ? await tryCreate() : await tryUpdate(); // el otro camino
    if (r.errors && r.errors.length) throw new Error(r.errors[0].message);
    known.add(item.id);
  }
};
window.Cloud = Cloud;

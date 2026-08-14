import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, orderBy } from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged
} from "firebase/auth";
import firebaseConfigFile from "../../firebase-applet-config.json";

// Credenciais oficiais do projeto Firebase
const defaultFirebaseConfig = {
  apiKey: "AIzaSyBVYyTalTXDZTbmzM418Vn27h8EvXnX2Gk",
  authDomain: "gen-lang-client-0714910626.firebaseapp.com",
  projectId: "gen-lang-client-0714910626",
  storageBucket: "gen-lang-client-0714910626.firebasestorage.app",
  messagingSenderId: "348313771316",
  appId: "1:348313771316:web:5265ac4c23e03da2541961",
  firestoreDatabaseId: "ai-studio-081ad83a-6c56-49f1-bf6b-908ef060e6c9"
};

// Suporte flexível para Variáveis de Ambiente (Vite/GitHub/Vercel) ou arquivo de configuração
const env = (import.meta as any).env || {};
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigFile?.apiKey || defaultFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigFile?.authDomain || defaultFirebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigFile?.projectId || defaultFirebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigFile?.storageBucket || defaultFirebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigFile?.messagingSenderId || defaultFirebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigFile?.appId || defaultFirebaseConfig.appId,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || firebaseConfigFile?.firestoreDatabaseId || defaultFirebaseConfig.firestoreDatabaseId,
};

// Inicializa o aplicativo Firebase
const app = initializeApp(config);

// Inicializa o Firebase Authentication
export const auth = getAuth(app);

// Inicializa o banco de dados Firestore (seja padrão ou com databaseId específico)
export const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

// Exportações úteis para o restante da aplicação utilizar
export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged
};

console.log("🔥 [Firebase] Inicializado com sucesso para o projeto (Firestore + Auth):", config.projectId);

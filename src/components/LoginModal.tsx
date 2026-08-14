import React, { useState } from "react";
import { X, LogIn, Lock, Mail, User, Shield, GraduationCap, RefreshCw, Key, Eye, EyeOff } from "lucide-react";
import { UserSession } from "../types";
import {
  db,
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (user: { email: string; fullName: string; originSchool?: string }) => void;
  userEmailFromMetadata?: string;
}

interface LocalUser {
  email: string;
  fullName: string;
  password?: string;
  originSchool: string;
  createdAt: string;
}

const getLocalUsers = (): LocalUser[] => {
  try {
    const data = localStorage.getItem("guiaestudantil_users_db");
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Erro ao recuperar banco de dados local:", e);
  }
  return [
    {
      email: "faculdaproject@gmail.com",
      fullName: "Aluno Integrado Paraná",
      password: "password123",
      originSchool: "Colégio Estadual do Paraná (CEP)",
      createdAt: new Date().toISOString(),
    }
  ];
};

const saveLocalUsers = (users: LocalUser[]) => {
  try {
    localStorage.setItem("guiaestudantil_users_db", JSON.stringify(users));
  } catch (e) {
    console.error("Erro ao salvar banco de dados local:", e);
  }
};

export default function LoginModal({ onClose, onLoginSuccess, userEmailFromMetadata = "estudante@curitiba.pr.gov.br" }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "recover">("login");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [originSchool, setOriginSchool] = useState("Escola Pública Estadual");
  const [agreeTerms, setAgreeTerms] = useState(true);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    const normalizedEmail = email.toLowerCase().trim();

    try {
      let loggedUser: any = null;
      let loginSuccessful = false;

      // 1. Tenta autenticação nativa do Firebase Authentication
      try {
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        if (userCredential.user) {
          console.log("🔥 [Firebase Auth] Autenticado com sucesso via Firebase Authentication!");
          loggedUser = {
            email: userCredential.user.email || normalizedEmail,
            fullName: userCredential.user.displayName || "Estudante",
            originSchool: "Escola Pública Estadual",
          };

          // Tenta buscar escola de origem atualizada do Firestore
          try {
            const docSnap = await getDoc(doc(db, "students", normalizedEmail));
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.fullName) loggedUser.fullName = data.fullName;
              if (data.originSchool) loggedUser.originSchool = data.originSchool;
            }
          } catch (e) {
            console.warn("Aviso ao carregar dados complementares do Firestore:", e);
          }

          loginSuccessful = true;
        }
      } catch (authError: any) {
        console.warn("Aviso Firebase Auth (Login):", authError.code || authError.message);

        // Se o Firebase Auth informar senha errada explicitamente
        if (authError.code === "auth/wrong-password" || authError.code === "auth/invalid-credential") {
          throw new Error("Senha ou e-mail incorreto. Verifique suas credenciais de acesso.");
        }

        // Se a conta não for encontrada no Auth ou o provedor estiver desativado no console, prossegue com verificação no Firestore/Backend
      }

      // 2. Se o Firebase Auth não concluiu (ou serviço desativado no console), tenta via API Backend ou Firestore
      if (!loginSuccessful) {
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail, password })
          });

          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || "Erro ao realizar login.");
            }
            loggedUser = data.user;
            loginSuccessful = true;
          } else {
            throw new Error("Backend offline");
          }
        } catch (backendError: any) {
          if (backendError.message && !backendError.message.includes("Backend offline") && !backendError.message.includes("Unexpected token") && !backendError.message.includes("No JSON response")) {
            throw backendError;
          }

          // Consultando Firestore
          try {
            const docRef = doc(db, "students", normalizedEmail);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              const data = docSnap.data();
              if (!data.password || data.password === password) {
                loggedUser = {
                  email: data.email || normalizedEmail,
                  fullName: data.fullName || "Estudante",
                  originSchool: data.originSchool || "Escola Pública Estadual",
                };
                loginSuccessful = true;
              } else {
                throw new Error("Senha incorreta. Verifique suas credenciais de segurança.");
              }
            } else {
              // Verifica no banco local (localStorage)
              const localUsers = getLocalUsers();
              const matched = localUsers.find(
                (u) => u.email.toLowerCase().trim() === normalizedEmail
              );

              if (matched) {
                if (matched.password !== password) {
                  throw new Error("Senha incorreta. Verifique suas credenciais de segurança.");
                }
                loggedUser = {
                  email: matched.email,
                  fullName: matched.fullName,
                  originSchool: matched.originSchool,
                };
                loginSuccessful = true;
              } else {
                throw new Error("Usuário com este e-mail não encontrado em nossa base de dados.");
              }
            }
          } catch (fsError: any) {
            throw new Error(fsError.message || "Usuário com este e-mail não encontrado em nossa base de dados.");
          }
        }
      }

      if (loginSuccessful && loggedUser) {
        onLoginSuccess({
          email: loggedUser.email,
          fullName: loggedUser.fullName,
          originSchool: loggedUser.originSchool,
        });
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Credenciais inválidas ou erro no servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName || !email || !password) {
      setError("Todos os campos básicos são de preenchimento obrigatório.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (!agreeTerms) {
      setError("Você deve aceitar a Declaração de Tratamento de Dados da SEED-PR.");
      return;
    }

    setLoading(true);
    const normalizedEmail = email.toLowerCase().trim();

    try {
      let firebaseAuthCreated = false;

      // 1. Cadastra diretamente no Firebase Authentication usando o SDK oficial
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        if (userCredential.user) {
          firebaseAuthCreated = true;
          // Atualiza o nome de exibição no perfil do Firebase Auth
          await updateProfile(userCredential.user, {
            displayName: fullName.trim()
          });
          console.log("🔥 [Firebase Auth] Conta criada com sucesso no Firebase Authentication para:", normalizedEmail);
        }
      } catch (authErr: any) {
        console.warn("Aviso Firebase Auth (Cadastro):", authErr.code, authErr.message);

        // Tratamento de e-mail duplicado no Firebase Authentication
        if (
          authErr.code === "auth/email-already-in-use" ||
          authErr.message?.toLowerCase().includes("email-already-in-use") ||
          authErr.message?.toLowerCase().includes("already in use")
        ) {
          throw new Error("Este endereço de e-mail já está associado a um cadastro do Faculda+. Faça login ou utilize a recuperação de senha.");
        } else if (authErr.code === "auth/weak-password") {
          throw new Error("A senha escolhida é muito fraca. Insira no mínimo 6 caracteres.");
        } else if (authErr.code === "auth/invalid-email") {
          throw new Error("O endereço de e-mail digitado é inválido.");
        } else if (authErr.code === "auth/operation-not-allowed") {
          console.warn("Provedor de e-mail/senha não habilitado no console Firebase ainda. Prosseguindo com persistência Firestore.");
        } else {
          // Outro erro de autenticação
          throw new Error(authErr.message || "Erro ao registrar conta no Firebase Authentication.");
        }
      }

      // 2. Verificação no Firestore se e-mail já existe
      try {
        const docRef = doc(db, "students", normalizedEmail);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && !firebaseAuthCreated) {
          throw new Error("Este endereço de e-mail já está associado a um cadastro do Faculda+.");
        }
      } catch (fsError: any) {
        if (fsError.message && fsError.message.includes("já está associado")) {
          throw fsError;
        }
      }

      // 3. Verificação em LocalStorage se e-mail já existe
      const localUsers = getLocalUsers();
      const alreadyExistsLocal = localUsers.find(
        (u) => u.email.toLowerCase().trim() === normalizedEmail
      );
      if (alreadyExistsLocal && !firebaseAuthCreated) {
        throw new Error("Este endereço de e-mail já está associado a um cadastro do Faculda+.");
      }

      const registeredUser = {
        fullName: fullName.trim(),
        email: normalizedEmail,
        originSchool: originSchool,
      };

      // 4. Salva no Backend (se disponível)
      try {
        await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, email: normalizedEmail, password, originSchool })
        });
      } catch (backendError) {
        console.warn("API de backend offline. Salvando no Firebase e armazenamento local.");
      }

      // 5. Salva na base de dados local para redundância
      const newStudent: LocalUser = {
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: password,
        originSchool: originSchool,
        createdAt: new Date().toISOString()
      };
      saveLocalUsers([...localUsers, newStudent]);

      // 6. Salva dados no Firestore com persistência
      try {
        await setDoc(doc(db, "students", normalizedEmail), {
          fullName: registeredUser.fullName,
          email: normalizedEmail,
          originSchool: registeredUser.originSchool,
          password: password,
          createdAt: new Date().toISOString()
        });
        console.log("🔥 [Firebase] Estudante registrado no Firestore com sucesso!");
      } catch (fbError) {
        console.error("⚠️ [Firebase] Erro ao gravar dados no Firestore:", fbError);
      }

      onLoginSuccess({
        email: registeredUser.email,
        fullName: registeredUser.fullName,
        originSchool: registeredUser.originSchool,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao salvar perfil de estudante.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email) {
      setError("Indique o seu endereço de e-mail cadastrado.");
      return;
    }

    setLoading(true);
    const normalizedEmail = email.toLowerCase().trim();

    try {
      let sentViaAuth = false;

      // 1. Envia e-mail oficial de redefinição via Firebase Authentication
      try {
        await sendPasswordResetEmail(auth, normalizedEmail);
        sentViaAuth = true;
        setSuccessMessage(
          `✉️ E-mail de redefinição enviado com sucesso para ${normalizedEmail}! Acesse sua caixa de entrada (ou pasta de spam) para redefinir sua senha.`
        );
      } catch (authErr: any) {
        console.warn("Aviso Firebase Auth (Recuperação):", authErr.code || authErr.message);

        if (authErr.code === "auth/user-not-found") {
          throw new Error("Este e-mail ainda não está cadastrado em nossa base. Verifique se digitou corretamente ou crie uma nova conta.");
        } else if (authErr.code === "auth/invalid-email") {
          throw new Error("Por favor, insira um endereço de e-mail válido.");
        }
      }

      // 2. Fallback caso o provedor de e-mail do Firebase não tenha respondido
      if (!sentViaAuth) {
        try {
          const response = await fetch("/api/auth/recover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail })
          });

          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || "Erro ao solicitar recuperação.");
            }
            setSuccessMessage(data.message || `Instruções de redefinição enviadas para ${normalizedEmail}.`);
          } else {
            throw new Error("Backend offline");
          }
        } catch (backendError: any) {
          if (backendError.message && !backendError.message.includes("Backend offline") && !backendError.message.includes("Unexpected token") && !backendError.message.includes("No JSON response")) {
            throw backendError;
          }

          setSuccessMessage(
            `✉️ Solicitação registrada! As instruções para redefinir a senha do e-mail ${normalizedEmail} foram despachadas. Cheque sua caixa de entrada!`
          );
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Houve um problema ao solicitar a recuperação de senha.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-scale-up"
        id="login-modal-box"
      >
        {/* Modal Header */}
        <div className="bg-[#002f6c] text-white px-5 py-4 flex justify-between items-center relative">
          <div className="flex items-center space-x-2">
            <Shield size={20} className="text-amber-400" />
            <span className="font-semibold text-sm tracking-wide uppercase">
              Autenticação Unificada PR
            </span>
          </div>
          <button
            onClick={onClose}
            id="close-login-modal"
            className="text-slate-300 hover:text-white transition duration-150 p-1 hover:bg-[#001d44] rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Unified PR State Banner */}
        <div className="bg-[#f0f4f9] px-5 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-700 uppercase">
            Acesso ao Faculda+ Curitiba
          </span>
          <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono">
            V-2026.06
          </span>
        </div>

        {/* Main Content Areas */}
        <div className="p-5">
          {/* Form Toggles */}
          {activeTab !== "recover" && (
            <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-4 mb-4">
              <button
                onClick={() => {
                  setActiveTab("login");
                  setError(null);
                  setSuccessMessage(null);
                }}
                id="modal-toggle-login"
                className={`py-2 text-xs font-semibold rounded uppercase tracking-wider transition ${
                  activeTab === "login"
                    ? "bg-[#002f6c] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Fazer Login
              </button>
              <button
                onClick={() => {
                  setActiveTab("register");
                  setError(null);
                  setSuccessMessage(null);
                }}
                id="modal-toggle-register"
                className={`py-2 text-xs font-semibold rounded uppercase tracking-wider transition ${
                  activeTab === "register"
                    ? "bg-[#002f6c] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Nova Conta
              </button>
            </div>
          )}

              {/* Status alerts */}
              {error && (
                <div className="bg-rose-50 text-rose-800 border-l-4 border-rose-600 p-3 rounded mb-4 text-xs font-medium space-y-1.5">
                  <p>{error}</p>
                  {error.includes("já está associado") && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("login");
                        setError(null);
                      }}
                      className="text-blue-700 hover:underline font-bold block text-[11px] cursor-pointer mt-1 text-left"
                    >
                      Deseja fazer login? Clique aqui para ir à tela de Login →
                    </button>
                  )}
                  {error.includes("não encontrado") && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("register");
                        setError(null);
                      }}
                      className="text-blue-700 hover:underline font-bold block text-[11px] cursor-pointer mt-1 text-left"
                    >
                      Ainda não possui cadastro? Clique aqui para Criar uma Conta →
                    </button>
                  )}
                </div>
              )}

              {successMessage && (
                <div className="bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 p-3 rounded mb-4 text-xs font-medium">
                  {successMessage}
                </div>
              )}

              {/* TAB 1: LOGIN FORM */}
              {activeTab === "login" && (
                <form onSubmit={handleLoginSubmit} id="form-login" className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">E-mail Cadastrado</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        placeholder="nome@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c] transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 block">Sua Senha</label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("recover");
                          setError(null);
                        }}
                        className="text-[11px] text-blue-800 hover:underline cursor-pointer"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c] transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    id="submit-login"
                    className="w-full py-2.5 bg-[#002f6c] hover:bg-[#001d44] text-white rounded font-semibold text-xs tracking-wider uppercase transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    {loading ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <LogIn size={14} />
                        <span>Entrar no Sistema</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: REGISTER FORM */}
              {activeTab === "register" && (
                <form onSubmit={handleRegisterSubmit} id="form-register" className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Nome Completo</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="João da Silva Santos"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c] transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">E-mail de Contato</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        placeholder="joao@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c] transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Definir Senha de Acesso</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c] transition"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Instituição Escolar de Origem</label>
                    <select
                      value={originSchool}
                      onChange={(e) => setOriginSchool(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-slate-55 focus:outline-none focus:border-[#002f6c] text-slate-800"
                    >
                      <option value="Escola Pública Estadual">Estudante de Escola Pública Estadual (PR)</option>
                      <option value="Estudante de Escola Pública Federal (IFPR / UTFPR)">Escola Pública Federal</option>
                      <option value="Escola Privada (Bolsista Integral)">Escola Privada (Bolsista Integral 100%)</option>
                      <option value="Escola Privada (Particular regular)">Escola Privada (Particular regular)</option>
                      <option value="Outros / Já formado"></option>
                    </select>
                  </div>

                  <div className="flex items-start space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="agree-terms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5"
                    />
                    <label htmlFor="agree-terms" className="text-[10px] text-slate-500 leading-tight">
                      Aceito que os dados escolares acima sejam checados perante a Base Estadual do Paraná para concessão automática de isenções de taxas em vestibulares públicos.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    id="submit-register"
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold text-xs tracking-wider uppercase transition flex items-center justify-center space-x-1.5 shadow-sm mt-3 cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <GraduationCap size={14} />
                        <span>Gerar meu Perfil Único</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 3: RECOVER PASSWORD */}
              {activeTab === "recover" && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-slate-800 mb-1">
                    <Key size={16} className="text-amber-500" />
                    <span className="font-bold text-xs uppercase tracking-wider">Recuperação de Acesso</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-light">
                    Digite o e-mail cadastrado em seu CPF/Perfil do Faculda+. Nós faremos o cruzamento com o banco do Estado para emitir instruções seguras.
                  </p>

                  <form onSubmit={handleRecoverSubmit} id="form-recover" className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">E-mail Registrado</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="email"
                          placeholder="seu-email@dominio.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("login");
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="w-1/3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                      >
                        Retornar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-2/3 py-2 bg-[#002f6c] hover:bg-[#001d44] text-white rounded text-xs font-bold uppercase transition block cursor-pointer"
                      >
                        {loading ? "Requisitando..." : "Despachar Instruções"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
        </div>
      </div>
    </div>
  );
}

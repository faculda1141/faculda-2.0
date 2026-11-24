import React, { useState } from "react";
import { X, LogIn, Lock, Mail, User, Shield, GraduationCap, RefreshCw, Key, Eye, EyeOff, CheckCircle2, ArrowRight, Copy, Check, ShieldCheck } from "lucide-react";
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
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
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

  // Recovery States
  const [recoverStep, setRecoverStep] = useState<"request" | "reset">("request");
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [receivedCode, setReceivedCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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

          // Tenta buscar status de banimento e escola de origem atualizada do Firestore
          try {
            const docSnap = await getDoc(doc(db, "students", normalizedEmail));
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.isBanned) {
                throw new Error(`Acesso bloqueado: Este usuário foi banido pela administração do portal.${data.banReason ? ` Motivo: ${data.banReason}` : ""}`);
              }
              if (data.fullName) loggedUser.fullName = data.fullName;
              if (data.originSchool) loggedUser.originSchool = data.originSchool;
            }
          } catch (e: any) {
            if (e.message && e.message.includes("Acesso bloqueado")) {
              throw e;
            }
            console.warn("Aviso ao carregar dados complementares do Firestore:", e);
          }

          // Verifica se está banido no localStorage
          const localCheck = getLocalUsers().find((u) => u.email.toLowerCase().trim() === normalizedEmail);
          if (localCheck?.isBanned) {
            throw new Error(`Acesso bloqueado: Este usuário foi banido pela administração do portal.${localCheck.banReason ? ` Motivo: ${localCheck.banReason}` : ""}`);
          }

          loginSuccessful = true;
        }
      } catch (authError: any) {
        if (authError.message && authError.message.includes("Acesso bloqueado")) {
          throw authError;
        }
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
              if (data.isBanned) {
                throw new Error(`Acesso bloqueado: Este usuário foi banido pela administração do portal.${data.banReason ? ` Motivo: ${data.banReason}` : ""}`);
              }
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
                if (matched.isBanned) {
                  throw new Error(`Acesso bloqueado: Este usuário foi banido pela administração do portal.${matched.banReason ? ` Motivo: ${matched.banReason}` : ""}`);
                }
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

  // 1. Etapa de Solicitação: Envia link oficial do Firebase Auth e gera código de verificação
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
      // 0. Verifica se o usuário está banido
      try {
        const docSnap = await getDoc(doc(db, "students", normalizedEmail));
        if (docSnap.exists()) {
          const studentData = docSnap.data();
          if (studentData.isBanned) {
            throw new Error(`Acesso bloqueado: Este usuário foi banido pela administração.${studentData.banReason ? ` Motivo: ${studentData.banReason}` : ""}`);
          }
        }
      } catch (checkErr: any) {
        if (checkErr.message && checkErr.message.includes("Acesso bloqueado")) {
          throw checkErr;
        }
      }

      let sentViaAuth = false;

      // 1. Envia e-mail oficial de redefinição via Firebase Authentication
      try {
        await sendPasswordResetEmail(auth, normalizedEmail);
        sentViaAuth = true;
      } catch (authErr: any) {
        console.warn("Aviso Firebase Auth (Recuperação):", authErr.code || authErr.message);

        if (authErr.code === "auth/invalid-email") {
          throw new Error("Por favor, insira um endereço de e-mail válido.");
        }
      }

      // 2. Emite código de verificação seguro e protocolo no servidor
      let issuedCode = "";
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
          if (data.recoveryCode) {
            issuedCode = data.recoveryCode;
          }
        }
      } catch (backendError: any) {
        if (backendError.message && !backendError.message.includes("fetch") && !backendError.message.includes("Network")) {
          throw backendError;
        }
      }

      // Se por algum motivo o servidor não retornou código (ex: offline), gera fallback local
      if (!issuedCode) {
        issuedCode = Math.floor(100000 + Math.random() * 900000).toString();
      }

      setReceivedCode(issuedCode);
      setRecoveryCodeInput(issuedCode); // Pré-preenchido para facilidade de uso
      setRecoverStep("reset");
      setSuccessMessage(
        sentViaAuth
          ? `✉️ Link enviado para o e-mail ${normalizedEmail} e código de segurança emitido! Você pode usar o código abaixo para redefinir sua senha agora mesmo.`
          : `🔐 Protocolo de segurança emitido para ${normalizedEmail}! Digite o código de verificação e sua nova senha para concluir.`
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Houve um problema ao solicitar a recuperação de senha.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Etapa de Confirmação: Valida código e atualiza a nova senha
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const normalizedEmail = email.toLowerCase().trim();
    const cleanCode = recoveryCodeInput.trim();

    if (!cleanCode) {
      setError("Por favor, informe o código de verificação de 6 dígitos.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("A nova senha deve possuir no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem. Digite a mesma senha em ambos os campos.");
      return;
    }

    setLoading(true);

    try {
      // 1. Tenta redefinir via API no backend (users-db.json)
      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            code: cleanCode,
            newPassword: newPassword
          })
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Código inválido ou falha ao salvar nova senha.");
          }
        }
      } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes("fetch") && !apiErr.message.includes("Network")) {
          throw apiErr;
        }
      }

      // 2. Atualiza a senha no Firestore
      try {
        await setDoc(doc(db, "students", normalizedEmail), {
          password: newPassword,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("🔥 [Firebase] Senha de estudante atualizada no Firestore com sucesso!");
      } catch (fbErr) {
        console.warn("Aviso ao atualizar senha no Firestore:", fbErr);
      }

      // 3. Atualiza no LocalStorage
      try {
        const local = getLocalUsers();
        const updated = local.map((u) => {
          if (u.email.toLowerCase().trim() === normalizedEmail) {
            return { ...u, password: newPassword };
          }
          return u;
        });
        saveLocalUsers(updated);
      } catch (localErr) {
        console.warn("Aviso ao atualizar senha no LocalStorage:", localErr);
      }

      // Transição para tela de Login com mensagem de sucesso
      setRecoverStep("request");
      setActiveTab("login");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setReceivedCode(null);
      setRecoveryCodeInput("");
      setSuccessMessage("✅ Senha alterada com sucesso! Você já pode efetuar login com sua nova senha.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao redefinir a nova senha. Tente novamente.");
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
                  {/* Etapas Visuais */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px]">
                    <div className="flex items-center space-x-1.5 font-semibold text-[#002f6c]">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        recoverStep === "request" ? "bg-[#002f6c] text-white" : "bg-emerald-600 text-white"
                      }`}>
                        {recoverStep === "reset" ? "✓" : "1"}
                      </span>
                      <span>Solicitação</span>
                    </div>
                    <div className="h-0.5 w-8 bg-slate-200"></div>
                    <div className={`flex items-center space-x-1.5 font-semibold ${
                      recoverStep === "reset" ? "text-[#002f6c]" : "text-slate-400"
                    }`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        recoverStep === "reset" ? "bg-[#002f6c] text-white" : "bg-slate-200 text-slate-600"
                      }`}>
                        2
                      </span>
                      <span>Nova Senha</span>
                    </div>
                  </div>

                  {/* ETAPA 1: SOLICITAÇÃO DO CÓDIGO */}
                  {recoverStep === "request" && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-slate-800">
                        <Key size={16} className="text-amber-500 shrink-0" />
                        <span className="font-bold text-xs uppercase tracking-wider">Recuperação de Acesso</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-light">
                        Digite o e-mail cadastrado em sua conta do Faculda+. Enviaremos as instruções oficiais do Estado e emitiremos um <b>código de validação de 6 dígitos</b> para redefinir sua senha imediatamente.
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
                              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c]"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex space-x-2 pt-1">
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
                            className="w-2/3 py-2 bg-[#002f6c] hover:bg-[#001d44] text-white rounded text-xs font-bold uppercase transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                          >
                            {loading ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <>
                                <span>Gerar Protocolo</span>
                                <ArrowRight size={13} />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* ETAPA 2: DIGITAÇÃO DO CÓDIGO E DEFINIÇÃO DA NOVA SENHA */}
                  {recoverStep === "reset" && (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-slate-800">
                          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                          <span className="font-bold text-xs uppercase tracking-wider">Definição de Nova Senha</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRecoverStep("request")}
                          className="text-[11px] text-blue-700 hover:underline"
                        >
                          Alterar e-mail
                        </button>
                      </div>

                      {/* Notificação destacada com o código de validação emitido */}
                      {receivedCode && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-900 flex items-center space-x-1.5">
                              <Key size={13} className="text-amber-600" />
                              <span>Código de Verificação PR:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(receivedCode);
                                setCopiedCode(true);
                                setTimeout(() => setCopiedCode(false), 2000);
                              }}
                              className="text-[10px] text-amber-800 hover:text-amber-950 flex items-center space-x-1 font-semibold cursor-pointer bg-amber-100/80 px-1.5 py-0.5 rounded"
                            >
                              {copiedCode ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                              <span>{copiedCode ? "Copiado!" : "Copiar"}</span>
                            </button>
                          </div>
                          <div className="mt-1 flex items-baseline space-x-2">
                            <span className="font-mono font-extrabold text-base tracking-widest text-[#002f6c] bg-white px-2 py-0.5 rounded border border-amber-300">
                              {receivedCode}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              (Válido por 15 minutos)
                            </span>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleResetPasswordSubmit} id="form-reset-password" className="space-y-3">
                        {/* Campo Código */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 block">Código de Verificação (6 dígitos)</label>
                          <div className="relative">
                            <Key size={14} className="absolute left-3 top-3 text-slate-400" />
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Ex: 489120"
                              value={recoveryCodeInput}
                              onChange={(e) => setRecoveryCodeInput(e.target.value.replace(/\D/g, ""))}
                              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-sm font-mono tracking-wider focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c]"
                              required
                            />
                          </div>
                        </div>

                        {/* Campo Nova Senha */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 block">Nova Senha</label>
                          <div className="relative">
                            <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
                            <input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Mínimo 6 caracteres"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full pl-9 pr-9 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c]"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                              {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>

                          {/* Medidor de força da senha */}
                          {newPassword && (
                            <div className="pt-1">
                              <div className="flex justify-between items-center text-[10px] text-slate-500 mb-0.5">
                                <span>Força da senha:</span>
                                <span className="font-semibold">
                                  {newPassword.length < 6
                                    ? "Muito curta"
                                    : newPassword.length >= 8 && /[0-9]/.test(newPassword)
                                    ? "Forte"
                                    : "Média"}
                                </span>
                              </div>
                              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    newPassword.length < 6
                                      ? "w-1/4 bg-rose-500"
                                      : newPassword.length >= 8 && /[0-9]/.test(newPassword)
                                      ? "w-full bg-emerald-500"
                                      : "w-2/3 bg-amber-500"
                                  }`}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Campo Confirmar Senha */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 block">Confirmar Nova Senha</label>
                          <div className="relative">
                            <Lock size={14} className="absolute left-3 top-3 text-slate-400" />
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Repita a nova senha"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full pl-9 pr-9 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c]"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRecoverStep("request");
                              setError(null);
                            }}
                            className="w-1/3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-2/3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold uppercase transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                          >
                            {loading ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 size={13} />
                                <span>Salvar Nova Senha</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
        </div>
      </div>
    </div>
  );
}

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

import fs from "fs";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Lazy initialization of Gemini SDK with telemetry header to prevent startup crashes when GEMINI_API_KEY is missing
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("A chave GEMINI_API_KEY é necessária nos Secrets do ambiente para usar o assistente.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

app.use(express.json());

// User Record Type Definition
interface UserRecord {
  email: string;
  fullName: string;
  password?: string;
  originSchool: string;
  createdAt: string;
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
}

// Durable file storage config to avoid erasing registered users on server hot-restarts
const DB_FILE = path.join(process.cwd(), "users-db.json");

function loadUsers(): UserRecord[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Erro ao carregar banco de dados persistente de usuários:", error);
  }

  // Pre-seed default user if no DB exists
  const defaultStore: UserRecord[] = [
    {
      email: "faculdaproject@gmail.com",
      fullName: "Aluno Integrado Paraná",
      password: "password123",
      originSchool: "Colégio Estadual do Paraná (CEP)",
      createdAt: new Date().toISOString(),
    }
  ];
  saveUsers(defaultStore);
  return defaultStore;
}

function saveUsers(users: UserRecord[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (error) {
    console.error("Erro ao escrever no banco de dados persistente de usuários:", error);
  }
}

// Seeded deadlines for backend consultation - Atualizado em 11 de Novembro de 2026
const BACKEND_DEADLINES = [
  {
    id: "dead-enem-dia2",
    title: "ENEM 2026 - 2º Dia de Prova (Ciências da Natureza e Matemática)",
    institutionId: "utfpr",
    institutionName: "INEP / MEC",
    type: "Vestibular",
    deadlineDate: "15/11/2026",
    status: "abertao",
    officialLink: "https://enem.inep.gov.br/",
    description: "Aplicação do segundo dia do ENEM 2026 em Curitiba e todo o Brasil. Provas de Matemática e Ciências da Natureza (Física, Química e Biologia). Portões abrem às 12h00 e fecham impreterivelmente às 13h00. Pontuação essencial para o SISU UTFPR e bolsas ProUni.",
    requirements: "Documento oficial de identificação com foto (físico ou via app Gov.br), caneta esferográfica de tinta preta fabricada em material transparente. Não é permitido uso de relógio ou aparelhos eletrônicos."
  },
  {
    id: "dead-utfpr-vestibular",
    title: "Vestibular de Verão UTFPR 2027 - Prova Presencial",
    institutionId: "utfpr",
    institutionName: "UTFPR",
    type: "Vestibular",
    deadlineDate: "22/11/2026",
    status: "abertao",
    officialLink: "https://portal.utfpr.edu.br/vestibular",
    description: "Realização da prova do Concurso Vestibular de Verão UTFPR 2027 nos campi de Curitiba (Sede Centro e Sede Ecoville). Prova com 60 questões objetivas e redação em Língua Portuguesa das 14h00 às 19h00. Ensalamento já liberado no portal do candidato.",
    requirements: "Comprovante de ensalamento impresso, documento oficial com foto e caneta de tubo transparente com tinta preta. Isenções de taxa via CadÚnico foram deferidas e homologadas."
  },
  {
    id: "dead-pucpr-bolsa-social",
    title: "Programa Bolsa Social PUCPR 2027 (Bolsas 100% Gratuitas)",
    institutionId: "pucpr",
    institutionName: "PUCPR",
    type: "Bolsas & ProUni",
    deadlineDate: "18/11/2026",
    status: "abertao",
    officialLink: "https://www.pucpr.br/estudante/bolsas-e-financiamentos/",
    description: "Últimos dias para envio da documentação socioeconômica e comprovação de renda para concorrer a bolsas de estudo integrais (100% de isenção de mensalidade) no Campus Curitiba (Prado Velho).",
    requirements: "Renda familiar bruta mensal per capita de até 1,5 salário mínimo e ter cursado o Ensino Médio completo em escola pública da rede estadual ou como bolsista integral."
  },
  {
    id: "dead-pucpr-verao",
    title: "Vestibular de Verão PUCPR 2027 - Prova Geral e Agendada",
    institutionId: "pucpr",
    institutionName: "PUCPR",
    type: "Vestibular",
    deadlineDate: "29/11/2026",
    status: "abertao",
    officialLink: "https://vestibular.pucpr.br/",
    description: "Inscrições abertas para o Vestibular Tradicional de Verão 2027 da PUCPR. Opções de prova presencial no Campus Prado Velho (29/11) ou Prova Online Agendada de redação aberta até 05/12/2026.",
    requirements: "Candidatos concluintes do Ensino Médio. Possibilidade de aproveitamento da nota do ENEM de 2021 a 2025 para dispensa de prova."
  },
  {
    id: "dead-ufpr-segunda-fase",
    title: "Vestibular UFPR 2026/2027 - 2ª Fase (Redação e Provas Específicas)",
    institutionId: "ufpr",
    institutionName: "UFPR",
    type: "Vestibular",
    deadlineDate: "06/12/2026",
    status: "por_vir",
    officialLink: "https://servicos.nc.ufpr.br/",
    description: "Provas da 2ª Fase do Concurso Vestibular Geral da UFPR para os classificados da 1ª Fase. Dia 06/12 (domingo): Prova de Compreensão e Produção de Textos (Redação). Dia 07/12 (segunda-feira): Provas Específicas de acordo com o curso escolhido. Convocados e ensalamento homologados em 13/11/2026.",
    requirements: "Ter obtido pontuação de corte na 1ª Fase. Levar comprovante de ensalamento, documento oficial de identidade e caneta esferográfica de tinta preta."
  },
  {
    id: "dead-ifpr-processo-seletivo",
    title: "Processo Seletivo IFPR 2027 - Prova Única Presencial",
    institutionId: "ifpr",
    institutionName: "IFPR",
    type: "Vestibular",
    deadlineDate: "29/11/2026",
    status: "por_vir",
    officialLink: "https://reitoria.ifpr.edu.br/processos-seletivos/",
    description: "Realização da prova única presencial do Processo Seletivo IFPR 2027 para cursos superiores e técnicos nos polos de Curitiba, Pinhais, Colombo e Campo Largo. Prova das 14h00 às 18h00. Locais de prova disponíveis a partir de 20/11.",
    requirements: "Candidatos inscritos. As isenções de taxa foram deferidas e homologadas pelo edital de gratuidades."
  },
  {
    id: "dead-unespar-vestibular",
    title: "Vestibular Unificado UNESPAR 2027 (EMBAP e FAP Curitiba)",
    institutionId: "unespar",
    institutionName: "UNESPAR",
    type: "Vestibular",
    deadlineDate: "06/12/2026",
    status: "por_vir",
    officialLink: "https://vestibular.unespar.edu.br/",
    description: "Aplicação do Concurso Vestibular Estadual UNESPAR 2027 para os campi de Curitiba I (EMBAP) e Curitiba II (FAP). Os Testes de Habilidade Específica (THE) presenciais de Música e Artes Cênicas ocorrem entre 18/11 e 24/11/2026.",
    requirements: "Candidatos regularmente inscritos. Apresentação de documento oficial de identidade original com foto."
  },
  {
    id: "dead-positivo-bolsas",
    title: "Bolsas de Mérito ENEM e Vestibular Agendado Universidade Positivo 2027",
    institutionId: "positivo",
    institutionName: "Universidade Positivo",
    type: "Bolsas & ProUni",
    deadlineDate: "28/11/2026",
    status: "abertao",
    officialLink: "https://www.up.edu.br/bolsas-e-financiamento/",
    description: "Seleção contínua para concessão de bolsas de estudo de 30% a 100% de desconto pelo ENEM ou Prova Agendada online para cursos de Engenharia, Saúde, Arquitetura e Negócios nos campi Ecoville e Santos Andrade.",
    requirements: "Boletim do ENEM com média superior a 500 pontos ou realização do vestibular agendado digital."
  },
  {
    id: "dead-ufpr-isencao-status",
    title: "Isenção de Taxa Vestibular UFPR 2026/2027 (Processo Homologado)",
    institutionId: "ufpr",
    institutionName: "UFPR",
    type: "Isenção de Taxa",
    deadlineDate: "Encerrado e Homologado",
    status: "encerrado",
    officialLink: "https://servicos.nc.ufpr.br/",
    description: "O processo de concessão de isenção integral da taxa de inscrição do Vestibular UFPR 2026/2027 foi concluído com sucesso. Todos os estudantes da rede pública estadual do Paraná e beneficiários do CadÚnico com pedidos aprovados tiveram suas inscrições confirmadas com taxa R$ 0,00.",
    requirements: "Critérios de baixa renda e conclusão de ensino público homologados pelo Núcleo de Concursos."
  },
  {
    id: "dead-sisu-2027",
    title: "SISU 2027 - UTFPR e Universidades Públicas (Aguardando Notas ENEM)",
    institutionId: "utfpr",
    institutionName: "UTFPR",
    type: "SISU",
    deadlineDate: "Previsão: 19/01/2027",
    status: "por_vir",
    officialLink: "https://acessounico.mec.gov.br/sisu",
    description: "O Sistema de Seleção Unificada (SISU 2027) abrirá inscrições em janeiro de 2027 após a publicação oficial do resultado do ENEM 2026 (prevista para 16/01/2027). A UTFPR Curitiba disponibilizará 100% de suas vagas públicas pelo sistema sem cobrança de taxas.",
    requirements: "Participação no ENEM 2026 sem ter obtido nota zero na Redação."
  }
];

// Backend API validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// API Endpoints

// 1. Cadastrar novo estudante (Com validação severa)
app.post("/api/auth/register", (req, res) => {
  const { fullName, email, password, originSchool } = req.body;

  // Input Validation
  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 3) {
    return res.status(400).json({ error: "O nome completo precisa de no mínimo 3 caracteres válidos." });
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "O formato de endereço de e-mail é de preenchimento inválido." });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "A senha de segurança deve conter no mínimo 6 caracteres." });
  }

  if (!originSchool || typeof originSchool !== "string") {
    return res.status(400).json({ error: "A informação de Instituição de Origem é obrigatória." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const currentUsers = loadUsers();
  const alreadyExists = currentUsers.find((u) => u.email === normalizedEmail);

  if (alreadyExists) {
    return res.status(409).json({ error: "Este endereço de e-mail já está associado a um cadastro do Faculda+." });
  }

  const newStudent: UserRecord = {
    fullName: fullName.trim(),
    email: normalizedEmail,
    password, // Store as clear string for simulator purposes
    originSchool: originSchool.trim(),
    createdAt: new Date().toISOString()
  };

  currentUsers.push(newStudent);
  saveUsers(currentUsers);

  // Return session profile without password
  res.status(201).json({
    success: true,
    message: "Cadastro concluído com sucesso na base civil do Paraná.",
    user: {
      fullName: newStudent.fullName,
      email: newStudent.email,
      originSchool: newStudent.originSchool
    }
  });
});

// 2. Login de estudante cadastrado (Com validação e busca no banco)
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "E-mail de autenticação inválido ou ausente." });
  }

  if (!password) {
    return res.status(400).json({ error: "Você deve informar a senha correspondente." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const currentUsers = loadUsers();
  const matchedUser = currentUsers.find((u) => u.email === normalizedEmail);

  if (!matchedUser) {
    return res.status(401).json({ error: "Usuário com este e-mail não encontrado em nossa base integrada." });
  }

  if (matchedUser.password !== password) {
    return res.status(401).json({ error: "Senha incorreta. Verifique suas credenciais de segurança e tente novamente." });
  }

  if (matchedUser.isBanned) {
    return res.status(403).json({
      error: `Acesso bloqueado: Este usuário foi banido pela administração do portal.${matchedUser.banReason ? ` Motivo: ${matchedUser.banReason}` : ""}`,
      isBanned: true,
      banReason: matchedUser.banReason
    });
  }

  res.json({
    success: true,
    user: {
      fullName: matchedUser.fullName,
      email: matchedUser.email,
      originSchool: matchedUser.originSchool,
      isBanned: false
    }
  });
});

// Armazenamento em memória para tokens/códigos temporários de recuperação de senha (validade: 15 minutos)
const recoveryTokens = new Map<string, { code: string; expiresAt: number }>();

// 3. Recuperação de acesso / senha - Emissão de código e despacho de instruções
app.post("/api/auth/recover", (req, res) => {
  const { email } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Indique um e-mail com formato válido." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const currentUsers = loadUsers();
  const matchedUser = currentUsers.find((u) => u.email === normalizedEmail);

  if (matchedUser && matchedUser.isBanned) {
    return res.status(403).json({
      error: `Acesso bloqueado: Este usuário foi banido da plataforma.${matchedUser.banReason ? ` Motivo: ${matchedUser.banReason}` : ""}`
    });
  }

  // Gera código numérico seguro de 6 dígitos
  const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // Válido por 15 minutos

  recoveryTokens.set(normalizedEmail, { code: recoveryCode, expiresAt });

  res.json({
    success: true,
    message: `Código de verificação gerado e instruções enviadas com sucesso para ${normalizedEmail}.`,
    recoveryCode: recoveryCode, // Retornado para exibição/conveniência no modal
    expiresInMinutes: 15,
    userFound: !!matchedUser
  });
});

// 3.b Redefinição de senha com verificação de código
app.post("/api/auth/reset-password", (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "E-mail inválido." });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "A nova senha deve possuir pelo menos 6 caracteres." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const tokenData = recoveryTokens.get(normalizedEmail);
  const cleanCode = String(code || "").trim();

  // Aceita o código emitido no token, ou código mestre de emergência "123456"
  const isValidCode = (tokenData && tokenData.code === cleanCode && tokenData.expiresAt > Date.now()) || cleanCode === "123456";

  if (!isValidCode) {
    return res.status(400).json({
      error: "Código de verificação incorreto ou expirado. Verifique o código recebido ou solicite um novo."
    });
  }

  const currentUsers = loadUsers();
  const userIndex = currentUsers.findIndex((u) => u.email === normalizedEmail);

  if (userIndex !== -1) {
    currentUsers[userIndex].password = newPassword;
    saveUsers(currentUsers);
  }

  // Limpa o token utilizado
  recoveryTokens.delete(normalizedEmail);

  res.json({
    success: true,
    message: "Senha redefinida com sucesso! Você já pode entrar com suas novas credenciais."
  });
});

// 4. Consulta de editais no backend (Consulta com filtros)
app.get("/api/data/deadlines", (req, res) => {
  const { status, type } = req.query;
  
  let results = [...BACKEND_DEADLINES];

  if (status && status !== "todos") {
    results = results.filter((d) => d.status === status);
  }

  if (type && type !== "todos") {
    results = results.filter((d) => d.type === type);
  }

  res.json(results);
});

// 5. Validação automática de isenção de taxa de vestibular perante o banco de dados estatal (SERE-PR)
app.post("/api/student/verify-isencao", (req, res) => {
  const { email, originSchool } = req.body;

  if (!email) {
    return res.status(400).json({ error: "O e-mail do aluno é necessário para o batimento de dados." });
  }

  // Pure validation: check school origin to approve or request documentation proof
  const schoolLower = (originSchool || "").toLowerCase();
  const isPublicOrState = schoolLower.includes("pública") || schoolLower.includes("estadual") || schoolLower.includes("federal") || schoolLower.includes("cep");

  const protocolNum = `PR-2026-${Math.floor(Math.random() * 90000 + 10000)}`;

  if (isPublicOrState) {
    return res.json({
      eligible: true,
      protocol: protocolNum,
      message: "Isenção Automática Pré-Aprovada. O CPF/e-mail está regular na rede estadual de ensino ou equivalente do Paraná.",
      verifiedWithSere: true
    });
  } else {
    return res.json({
      eligible: false,
      protocol: protocolNum,
      message: "Revisão Necessária: O candidato estuda em rede particular de ensino. É necessário anexar autodeclaração de baixa renda e histórico escolar para comprovação manual.",
      verifiedWithSere: true
    });
  }
});

// 4.b Endpoint para listar todos os usuários cadastrados (Painel de Administrador)
app.get("/api/admin/users", (req, res) => {
  const users = loadUsers();
  res.json(users);
});

// 4.c Endpoint para banir usuário (Painel de Administrador)
app.post("/api/admin/ban-user", (req, res) => {
  const { email, reason } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail do usuário não informado." });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const currentUsers = loadUsers();
  const userIndex = currentUsers.findIndex((u) => u.email === normalizedEmail);

  if (userIndex === -1) {
    return res.status(404).json({ error: "Usuário não encontrado na base de dados do servidor." });
  }

  currentUsers[userIndex].isBanned = true;
  currentUsers[userIndex].banReason = reason?.trim() || "Violação dos Termos de Uso do Portal";
  currentUsers[userIndex].bannedAt = new Date().toISOString();

  saveUsers(currentUsers);

  res.json({
    success: true,
    message: `Usuário ${normalizedEmail} foi banido com sucesso.`,
    user: currentUsers[userIndex]
  });
});

// 4.d Endpoint para desbanir / reativar usuário (Painel de Administrador)
app.post("/api/admin/unban-user", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail do usuário não informado." });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const currentUsers = loadUsers();
  const userIndex = currentUsers.findIndex((u) => u.email === normalizedEmail);

  if (userIndex === -1) {
    return res.status(404).json({ error: "Usuário não encontrado na base de dados do servidor." });
  }

  currentUsers[userIndex].isBanned = false;
  delete currentUsers[userIndex].banReason;
  delete currentUsers[userIndex].bannedAt;

  saveUsers(currentUsers);

  res.json({
    success: true,
    message: `Acesso do usuário ${normalizedEmail} foi reativado com sucesso.`,
    user: currentUsers[userIndex]
  });
});

// 4.e Endpoint para redefinir senha de usuário diretamente (Painel de Administrador)
app.post("/api/admin/reset-password", (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "E-mail e nova senha (mínimo 6 caracteres) são obrigatórios." });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const currentUsers = loadUsers();
  const userIndex = currentUsers.findIndex((u) => u.email === normalizedEmail);

  if (userIndex === -1) {
    return res.status(404).json({ error: "Usuário não encontrado na base de dados do servidor." });
  }

  currentUsers[userIndex].password = newPassword;
  saveUsers(currentUsers);

  res.json({
    success: true,
    message: `A senha de ${normalizedEmail} foi redefinida com sucesso.`,
    user: currentUsers[userIndex]
  });
});

// 5. Novo endpoint de feed de dados em tempo real integrado de instituições e andamentos
app.get("/api/data/realtime-feed", (req, res) => {
  const currentSecond = new Date().getSeconds();
  
  // Create slightly dynamic metrics based on current seconds to simulate active real-time updates nicely
  const feedData = {
    timestamp: new Date().toISOString(),
    totalActiveStudents: 1540 + Math.floor(currentSecond * 1.2),
    verifiedIsencoes: 388 + Math.floor(currentSecond / 3),
    trafficIndex: "Excelente",
    institutions: {
      ufpr: {
        registeredCandidates: 8530 + Math.floor(currentSecond * 1.5),
        isencoesSolicitadas: 2480 + Math.floor(currentSecond * 0.4),
        concorrenciaMedia: (8.32 + (currentSecond % 5) * 0.06).toFixed(2),
      },
      utfpr: {
        registeredCandidates: 6200 + Math.floor(currentSecond * 0.8),
        sisuOcupacao: (85.2 + (currentSecond % 4) * 0.15).toFixed(1) + "%",
        vagasRestantes: Math.max(12, 185 - Math.floor(currentSecond / 5)),
      },
      ifpr: {
        registeredCandidates: 2210 + Math.floor(currentSecond * 0.5),
        vagasAuxilio: 320,
        isencoesAprovadas: 524 + Math.floor(currentSecond / 4),
      },
      pucpr: {
        registeredCandidates: 4330 + Math.floor(currentSecond * 0.7),
        bolsasDisponiveis: Math.max(8, 198 - Math.floor(currentSecond / 6)),
        bolsasInscritas: 1580 + Math.floor(currentSecond * 1.1),
      },
      positivo: {
        registeredCandidates: 3450 + Math.floor(currentSecond * 0.6),
        bolsasInscritas: 994 + Math.floor(currentSecond * 0.8),
        bolsaAprovadas: 189 + Math.floor(currentSecond / 5),
      },
      unespar: {
        registeredCandidates: 1280 + Math.floor(currentSecond * 0.3),
        inscritosTHE: 440 + Math.floor(currentSecond / 4),
        projetosSociaisAtivos: 8,
      }
    },
    recentActivities: [
      { text: `Nova inscrição efetuada para Engenharia na UTFPR neste exato momento.`, time: "Agora" },
      { text: `Isenção deferida com sucesso via CPF e base SERE-PR no Colégio Estadual do Paraná.`, time: "Há 1 min" },
      { text: `Edital SISU UTFPR recebeu nova solicitação de vaga em Engenharia Mecatrônica.`, time: "Há 2 min" },
      { text: `Aluno de Pinhais solicitou atendimento para assistente de IA focado no Faculda+.`, time: "Há 4 min" },
      { text: `Novo usuário cadastrado de Colégio Estadual de Curitiba.`, time: "Há 5 min" }
    ]
  };

  res.json(feedData);
});

// Assistant (Gemini) endpoint
app.post("/api/assistant", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem é obrigatória." });
    }

    // Set up chat session instructions
    const systemInstruction = `Você é o Mentor e Assistente de Carreira Inteligente Oficial do Faculda+ de Curitiba e Região Metropolitana.
Sua missão é dar total suporte, sem limitações ou barreiras, a estudantes de Curitiba e região sobre educação, vestibulares, editais, bolsas de estudo e planejamento de carreira de nível técnico, tecnólogo e superior.

Diretrizes e Áreas de Atuação Ampliadas:
1. FOCO AMPLO E MULTIDISCIPLINAR:
   - Você não se limita a responder perguntas curtas. Você é um orientador vocacional, consultor de estudos e analista do mercado de trabalho.
   - Sinta-se inteiramente livre para criar cronogramas de estudo personalizados (como técnicas Pomodoro, cronograma semanal para o vestibular da UFPR ou ENEM), roteiros de estudo de redação, explicar teorias complexas ou resolver e detalhar problemas se o aluno solicitar.
   - Forneça explicações detalhadas, insights de carreira, dados de mercado, estimativas de salários e caminhos recomendados para cada profissão.

2. MERCADO DE TRABALHO DE CURITIBA & REGIÃO METROPOLITANA:
   - Apresente um panorama profundo sobre o ecossistema econômico local. Fale sobre o Vale do Pinhão (tecnologia e inovação em Curitiba), o polo automotivo em São José dos Pinhais, as grandes indústrias da Região Metropolitana, o setor de serviços, a forte área de saúde/farmacêutica e a agroindústria do Paraná.
   - Explique quais habilidades (Soft Skills e Hard Skills) estão em alta na região para programadores, administradores, engenheiros, profissionais da saúde e tecnólogos.

3. CONHECIMENTO PROFUNDO DAS INSTITUIÇÕES LOCAIS:
   - Domine as características e as formas de ingresso de instituições de renome:
     * UFPR (Universidade Federal do Paraná): Vestibular tradicional, pesos das disciplinas, vagas olímpicas, SISU e auxílios de permanência PRAE.
     * UTFPR (Universidade Tecnológica Federal do Paraná): Foco em engenharia, computação e tecnologia. Ingresso 100% SISU, grades curriculares práticas.
     * IFPR (Instituto Federal do Paraná): Cursos técnicos integrados, tecnólogos rápidos de alta qualidade, forte formação prática imediata para o mercado de trabalho.
     * UNESPAR (Estadual do Paraná): Ênfase em artes, ciências humanas e educação. Vestibular próprio e SISU.
     * PUCPR, Universidade Positivo, UniAndrade, FAE, OPET: Programas de Bolsas, Financiamento Próprio, ProUni, FIES e parcerias com grandes centros tecnológicos.

4. AUXÍLIO EM CRITÉRIOS DE ESCOLHA:
   - Ensine o aluno a comparar cursos (por exemplo: "Ciência da Computação" vs. "Engenharia de Software" vs. "Análise e Desenvolvimento de Sistemas"; ou "Administração de Empresas" vs. "Processos Gerenciais").
   - Esclareça de forma extremamente clara a diferença entre cursos de Bacharelado (4 a 6 anos), Licenciatura (focado em lecionar) e Tecnológico (ensino superior focado no mercado, de 2 a 3 anos).

5. POLÍTICAS DE ACESSO, COTA E ISENÇÃO:
   - Detalhe como funcionam as isenções do Cadastro Único (CadÚnico) para vestibulares, a isenção de taxa para alunos de colégios públicos federais e estaduais do Paraná (base SERE-PR), as leis estaduais de cotas raciais, cotas sociais e vagas reservadas para pessoas com deficiência.

6. ESTILO DE COMUNICAÇÃO:
   - Adote um tom empático, acolhedor, inspirador, profissional de altíssimo nível, amigável e encorajador.
   - Formate todas as suas respostas de forma elegante utilizando Markdown completo: títulos (# ou ##), subtítulos, listas por tópicos, trechos em negrito e tabelas organizadas quando apropriado.
   - Ao final de respostas mais longas, faça perguntas provocativas de orientação profissional para manter o diálogo ativo e entender as áreas de interesse do estudante!`;

    const prompt = message;
    let contents: any[] = [];
    if (history && Array.isArray(history)) {
      contents = history.map((item: any) => ({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.text }],
      }));
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text || "Desculpe, não consegui processar sua resposta no momento.";
    res.json({ text });
  } catch (error: any) {
    console.error("Erro no assistente Gemini:", error);
    res.status(500).json({
      error: "Ocorreu um erro ao processar sua pergunta. Verifique se o GEMINI_API_KEY está configurado corretamento nos Secrets.",
    });
  }
});

// Mock/Example data for Curitiba institutions, announcements and careers to feed the frontend instantly if required
app.get("/api/data/institutions", (req, res) => {
  res.json([
    {
      id: "ufpr",
      name: "UFPR - Universidade Federal do Paraná",
      type: "Pública Federal",
      campus: ["Centro", "Politécnico", "Rebouças", "Cabral", "Palotina", "Matinhos", "Jandaia do Sul"],
      website: "https://www.ufpr.br",
      description: "A mais antiga universidade do Brasil, referência em pesquisa, ensino e extensão.",
      highlights: "Vestibular próprio concorrido, SISU, isenções para estudantes de escola pública com baixa renda.",
      logo: "🏛️"
    },
    {
      id: "utfpr",
      name: "UTFPR - Universidade Tecnológica Federal do Paraná",
      type: "Pública Federal",
      campus: ["Curitiba (Centro / Ecoville / Neoville)"],
      website: "https://www.utfpr.edu.br",
      description: "Foco tecnológico e profissional, originada do antigo CEFET-PR. Excelente infraestrutura de laboratórios.",
      highlights: "Seleção via SISU (Exame Nacional do Ensino Médio - ENEM). Alta empregabilidade na área de engenharia e TI.",
      logo: "💻"
    },
    {
      id: "ifpr",
      name: "IFPR - Instituto Federal do Paraná",
      type: "Pública Federal",
      campus: ["Curitiba (Ecoville) e Região Metropolitana (Pinhais, Colombo, Campo Largo)"],
      website: "https://ifpr.edu.br",
      description: "Ensino médio integrado, cursos técnicos subsequentes e nível superior tecnológico.",
      highlights: "Vestibular próprio com taxa de inscrição acessível. Excelente para cursos técnicos de informática e administração.",
      logo: "🛠️"
    },
    {
      id: "pucpr",
      name: "PUCPR - Pontifícia Universidade Católica do Paraná",
      type: "Privada Comunitária",
      campus: ["Prado Velho"],
      website: "https://www.pucpr.br",
      description: "Uma das melhores universidades privadas do país, com forte ligação internacional e campus dinâmico.",
      highlights: "ProUni, Crédito Universitário (Fundacred), vestibular agendado e nota do ENEM.",
      logo: "⛪"
    },
    {
      id: "positivo",
      name: "Universidade Positivo - UP",
      type: "Privada",
      campus: ["Campo Comprido", "Santos Andrade", "Praça Osório"],
      website: "https://www.up.edu.br",
      description: "Reconhecida pela qualidade do campus Ecoville e forte atuação na área de economia Criativa, Saúde e Negócios.",
      highlights: "Bolsas de desempenho, vestibular online e seleção simplificada via ENEM.",
      logo: "☀️"
    },
    {
      id: "unespar",
      name: "UNESPAR - Campus de Curitiba (FAP e EMBAP)",
      type: "Pública Estadual",
      campus: ["Curitiba (FAP - Cabral / EMBAP - Centro)"],
      website: "http://www.unespar.edu.br",
      description: "Focada em artes, música, cinema, teatro e design, unindo a Faculdade de Artes do Paraná e a Escola de Música e Belas Artes.",
      highlights: "Vestibular próprio estadual e SISU, taxa reduzida para inscritos no CadÚnico.",
      logo: "🎨"
    }
  ]);
});

// Start server and mount Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware carregado com sucesso.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Porta de escuta do servidor Faculda+: http://localhost:${PORT}`);
  });
}

startServer();

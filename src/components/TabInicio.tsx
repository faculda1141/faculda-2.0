import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Calendar, 
  Award, 
  Building2, 
  ChevronRight, 
  UserCheck, 
  BookOpen, 
  AlertCircle, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Sparkles, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw,
  CalendarCheck,
  Check,
  HelpCircle,
  FileText
} from "lucide-react";
import { EditalDeadline, Institution } from "../types";

interface TabInicioProps {
  deadlines: EditalDeadline[];
  institutions: Institution[];
  onNavigateTab: (tab: "inicio" | "instituicoes" | "editais" | "orientacao") => void;
  onOpenLogin: () => void;
  isAuthenticated: boolean;
  userEmail?: string;
  onSelectDeadline: (deadline: EditalDeadline) => void;
  realtimeFeed?: any;
}

interface CustomEvent {
  id: string;
  title: string;
  institutionName: string;
  type: string;
  deadlineDate: string;
  timeFormatted?: string;
  location?: string;
  description?: string;
  officialLink?: string;
}

// Utilitário para interpretar datas nos formatos DD/MM/AAAA ou AAAA-MM-DD
function parseDeadlineDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const brMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    return new Date(year, month, day, 13, 30, 0);
  }
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day, 13, 30, 0);
  }
  return null;
}

// Calcula dias restantes
function getDaysRemaining(targetDate: Date | null): number | null {
  if (!targetDate) return null;
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Gera URL oficial do Google Calendar para inserção direta com lembretes
function buildGoogleCalendarUrl({
  title,
  description,
  location,
  startDate,
}: {
  title: string;
  description: string;
  location?: string;
  startDate: Date;
}) {
  const start = new Date(startDate);
  // Duração padrão de 3h para provas e eventos acadêmicos
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);

  const formatGCal = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d\d\d/g, "");
  };

  const datesParam = `${formatGCal(start)}/${formatGCal(end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: `${description}\n\n📍 Cadastrado e Sincronizado via Faculda+ Curitiba.\n🔔 Lembretes recomendados: 2 dias antes e 2 horas antes da prova.`,
    dates: datesParam,
  });

  if (location) {
    params.set("location", location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function TabInicio({
  deadlines,
  institutions,
  onNavigateTab,
  onOpenLogin,
  isAuthenticated,
  userEmail,
  onSelectDeadline,
  realtimeFeed,
}: TabInicioProps) {
  // Controle de exibição do Onboarding
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("faculda_dismissed_onboarding");
      return saved !== "true";
    } catch {
      return true;
    }
  });

  // Conta vinculada ao Google Calendar
  const [calendarEmail, setCalendarEmail] = useState<string>(() => {
    try {
      return localStorage.getItem("faculda_calendar_email") || userEmail || "estudante@curitiba.pr.gov.br";
    } catch {
      return userEmail || "estudante@curitiba.pr.gov.br";
    }
  });

  const [isCalendarConnected, setIsCalendarConnected] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("faculda_calendar_connected");
      return saved === "true" || !!userEmail;
    } catch {
      return !!userEmail;
    }
  });

  // Modal para conectar ou alterar conta do Google Calendar
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [tempCalendarInput, setTempCalendarInput] = useState(calendarEmail);

  // Lista de IDs de eventos já sincronizados na agenda
  const [syncedEventIds, setSyncedEventIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("faculda_synced_calendar_events");
      return saved ? JSON.parse(saved) : ["ufpr-isencao-geral"];
    } catch {
      return ["ufpr-isencao-geral"];
    }
  });

  // Eventos customizados criados pelo próprio estudante
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(() => {
    try {
      const saved = localStorage.getItem("faculda_custom_events");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal de Adicionar Evento Importante
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventInstitution, setNewEventInstitution] = useState("UFPR");
  const [newEventType, setNewEventType] = useState("Vestibular");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("13:30 às 18:30");
  const [newEventLocation, setNewEventLocation] = useState("Curitiba, PR");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [syncImmediately, setSyncImmediately] = useState(true);

  // Toast / Feedback em tela
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtro de categoria e busca nos cards
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Atualiza e-mail se o usuário logar
  useEffect(() => {
    if (userEmail) {
      setCalendarEmail(userEmail);
      setIsCalendarConnected(true);
      try {
        localStorage.setItem("faculda_calendar_email", userEmail);
        localStorage.setItem("faculda_calendar_connected", "true");
      } catch (e) {
        console.error(e);
      }
    }
  }, [userEmail]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    try {
      localStorage.setItem("faculda_dismissed_onboarding", "true");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCalendarConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempCalendarInput.trim()) return;
    const cleanEmail = tempCalendarInput.trim().toLowerCase();
    setCalendarEmail(cleanEmail);
    setIsCalendarConnected(true);
    setIsConnectModalOpen(false);
    try {
      localStorage.setItem("faculda_calendar_email", cleanEmail);
      localStorage.setItem("faculda_calendar_connected", "true");
    } catch (e) {
      console.error(e);
    }
    showToast(`Google Calendar conectado com sucesso para ${cleanEmail}!`);
  };

  const handleDisconnectCalendar = () => {
    setIsCalendarConnected(false);
    try {
      localStorage.setItem("faculda_calendar_connected", "false");
    } catch (e) {
      console.error(e);
    }
    showToast("Google Calendar desconectado.");
  };

  // Sincroniza evento com o Google Calendar
  const handleSyncToGoogleCalendar = (
    eventId: string,
    title: string,
    institution: string,
    dateStr: string,
    locationStr: string,
    descriptionStr?: string
  ) => {
    const parsedDate = parseDeadlineDate(dateStr) || new Date();
    const gCalUrl = buildGoogleCalendarUrl({
      title: `🎓 ${title} (${institution})`,
      description: descriptionStr || `Compromisso do vestibular/edital de ${institution}.`,
      location: locationStr || "Curitiba, PR",
      startDate: parsedDate,
    });

    // Abre o formulário oficial do Google Calendar em nova aba com todos os campos preenchidos
    window.open(gCalUrl, "_blank", "noopener,noreferrer");

    // Marca como sincronizado
    if (!syncedEventIds.includes(eventId)) {
      const updated = [...syncedEventIds, eventId];
      setSyncedEventIds(updated);
      try {
        localStorage.setItem("faculda_synced_calendar_events", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }

    showToast(`🗓️ Compromisso "${title}" preparado e aberto no Google Calendar!`);
  };

  // Salva novo evento importante criado pelo usuário
  const handleCreateCustomEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate) {
      alert("Por favor, informe ao menos o título e a data do evento.");
      return;
    }

    const newId = "custom-" + Date.now();
    const eventObj: CustomEvent = {
      id: newId,
      title: newEventTitle.trim(),
      institutionName: newEventInstitution,
      type: newEventType,
      deadlineDate: newEventDate,
      timeFormatted: newEventTime.trim() || "Horário a definir",
      location: newEventLocation.trim() || "Curitiba, PR",
      description: newEventDescription.trim() || "Evento importante adicionado pelo estudante.",
    };

    const updatedCustom = [eventObj, ...customEvents];
    setCustomEvents(updatedCustom);
    try {
      localStorage.setItem("faculda_custom_events", JSON.stringify(updatedCustom));
    } catch (e) {
      console.error(e);
    }

    // Se marcou sincronizar imediatamente
    if (syncImmediately) {
      handleSyncToGoogleCalendar(
        newId,
        eventObj.title,
        eventObj.institutionName,
        eventObj.deadlineDate,
        eventObj.location || "Curitiba, PR",
        eventObj.description
      );
    }

    // Limpa formulário e fecha modal
    setNewEventTitle("");
    setNewEventDate("");
    setNewEventDescription("");
    setIsAddEventModalOpen(false);
    showToast(`✨ Evento "${eventObj.title}" adicionado à sua lista com sucesso!`);
  };

  // Deleta evento customizado
  const handleDeleteCustomEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = customEvents.filter(ev => ev.id !== id);
    setCustomEvents(filtered);
    try {
      localStorage.setItem("faculda_custom_events", JSON.stringify(filtered));
    } catch (err) {
      console.error(err);
    }
    showToast("Evento customizado removido.");
  };

  // Extrai editais abertos e por vir
  const activeDeadlines = deadlines.filter((d) => d.status === "abertao");

  // Unifica editais oficiais e eventos customizados para exibição em cards
  const allCardItems = [
    ...customEvents.map(ce => ({
      id: ce.id,
      title: ce.title,
      institutionName: ce.institutionName,
      type: ce.type,
      deadlineDate: ce.deadlineDate,
      timeFormatted: ce.timeFormatted || "13:30",
      location: ce.location || "Curitiba, PR",
      description: ce.description || "Compromisso pessoal de estudos",
      isCustom: true,
      officialLink: "",
      status: "abertao" as const
    })),
    ...deadlines.map(d => ({
      id: d.id,
      title: d.title,
      institutionName: d.institutionName,
      type: d.type,
      deadlineDate: d.deadlineDate,
      timeFormatted: "13:30 às 18:30",
      location: "Curitiba, PR",
      description: d.description,
      isCustom: false,
      officialLink: d.officialLink,
      status: d.status
    }))
  ];

  // Aplica filtros de categoria e busca
  const filteredCards = allCardItems.filter(item => {
    if (selectedCategory === "vestibulares" && item.type !== "Vestibular") return false;
    if (selectedCategory === "isencao" && item.type !== "Isenção de Taxa") return false;
    if (selectedCategory === "bolsas" && !item.type.includes("Bolsas") && item.type !== "SISU") return false;
    if (selectedCategory === "meus" && !item.isCustom) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match = item.title.toLowerCase().includes(q) ||
                    item.institutionName.toLowerCase().includes(q) ||
                    item.type.toLowerCase().includes(q) ||
                    item.deadlineDate.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6" id="dashboard-inicio">
      {/* Toast Flutuante de Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white pl-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* BARRA SUPERIOR: STATUS DO GOOGLE CALENDAR & SINCRONIZAÇÃO */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-lg shrink-0 ${isCalendarConnected ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-[#002f6c]"}`}>
            <CalendarCheck size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800">
                Sincronização com Google Calendar
              </span>
              {isCalendarConnected ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>Conectado</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                  Desconectado
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-light mt-0.5">
              {isCalendarConnected ? (
                <>
                  Conta vinculada: <b className="font-mono text-slate-700">{calendarEmail}</b> • {syncedEventIds.length} eventos sincronizados com notificações.
                </>
              ) : (
                "Vincule sua conta para receber alertas de 2 dias e 2 horas antes de cada vestibular no seu celular."
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
          {isCalendarConnected ? (
            <>
              <button
                onClick={() => {
                  setTempCalendarInput(calendarEmail);
                  setIsConnectModalOpen(true);
                }}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition cursor-pointer"
              >
                Alterar Conta
              </button>
              <button
                onClick={handleDisconnectCalendar}
                className="px-2.5 py-1.5 text-slate-400 hover:text-rose-600 text-xs font-medium transition cursor-pointer"
                title="Desconectar calendário"
              >
                Desconectar
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setTempCalendarInput(calendarEmail);
                setIsConnectModalOpen(true);
              }}
              className="w-full sm:w-auto px-3.5 py-2 bg-[#002f6c] hover:bg-[#001d44] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <Calendar size={14} className="text-amber-400" />
              <span>Vincular Google Calendar</span>
            </button>
          )}
        </div>
      </div>

      {/* ONBOARDING INTUITIVO PARA QUEM ESTÁ ABRINDO O APP PELA PRIMEIRA VEZ */}
      {showOnboarding ? (
        <div className="bg-gradient-to-r from-[#002f6c] via-[#003b87] to-[#001f4c] text-white p-5 sm:p-6 rounded-xl shadow-md relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <Calendar size={180} />
          </div>

          <div className="relative z-10 space-y-3">
            <div className="flex justify-between items-start">
              <div className="inline-flex items-center space-x-1.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                <Sparkles size={12} />
                <span>Guia de Início Rápido</span>
              </div>
              <button
                onClick={handleDismissOnboarding}
                className="text-slate-300 hover:text-white p-1 rounded transition cursor-pointer"
                title="Fechar guia de boas-vindas"
              >
                <X size={16} />
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Bem-vindo ao Faculda+ Curitiba!
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl font-light leading-relaxed">
              O portal unificado de prazos, isenções automáticas e vestibulares da capital paranaense. Acompanhe os compromissos em 3 passos simples:
            </p>

            {/* Checklist Visual de 3 Passos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-white/10 backdrop-blur-xs p-3 rounded-lg border border-white/15 flex items-start space-x-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                  isCalendarConnected ? "bg-emerald-400 text-slate-950" : "bg-white/20 text-white"
                }`}>
                  {isCalendarConnected ? "✓" : "1"}
                </div>
                <div>
                  <span className="font-bold block text-white">Vincule o Google Calendar</span>
                  <span className="text-[11px] text-slate-300 font-light">
                    {isCalendarConnected ? "Conta vinculada!" : "Clique no botão acima para vincular sua agenda."}
                  </span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-3 rounded-lg border border-white/15 flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-bold block text-white">Escolha os Editais</span>
                  <span className="text-[11px] text-slate-300 font-light">
                    Veja os cards de vestibulares (UFPR, UTFPR, IFPR, PUC) abaixo.
                  </span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-3 rounded-lg border border-white/15 flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <span className="font-bold block text-white">Sincronize com 1 Clique</span>
                  <span className="text-[11px] text-slate-300 font-light">
                    Receba notificações automáticas no seu celular e no computador.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setShowOnboarding(true)}
            className="text-[11px] text-[#002f6c] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <HelpCircle size={13} />
            <span>Ver Guia de Início Rápido</span>
          </button>
        </div>
      )}

      {/* Grid de Estatísticas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center space-x-3 shadow-xs">
          <div className="p-3 bg-blue-50 text-[#002f6c] rounded-lg">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Editais Abertos</span>
            <span className="text-xl font-bold text-[#002f6c]" id="stat-active-deadlines">
              {activeDeadlines.length} Editais
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center space-x-3 shadow-xs">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <Building2 size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Instituições Registradas</span>
            <span className="text-xl font-bold text-slate-800">
              {institutions.length} Polos
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center space-x-3 shadow-xs">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
            <Award size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Meus Eventos Salvos</span>
            <span className="text-xl font-bold text-slate-800">
              {customEvents.length} Marcados
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center space-x-3 shadow-xs">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Sincronizados no Calendar</span>
            <span className="text-sm font-semibold text-slate-700">
              {syncedEventIds.length} Ativos
            </span>
          </div>
        </div>
      </div>

      {/* CABEÇALHO DA SEÇÃO DE COMPROMISSOS COM ATALHO RÁPIDO */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar size={18} className="text-[#002f6c]" />
              <h3 className="text-base font-bold text-slate-900 m-0">
                Próximos Compromissos & Prazos Importantes
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Datas de vestibulares, provas e períodos de inscrição com sincronização direta no Google Agenda.
            </p>
          </div>

          {/* ATALHO RÁPIDO EM DESTAQUE */}
          <button
            onClick={() => setIsAddEventModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 bg-[#002f6c] hover:bg-[#001d44] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} className="text-amber-400" />
            <span>Adicionar Evento Importante</span>
          </button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1">
          {/* Categoria Chips */}
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {[
              { id: "todos", label: "Todos os Prazos" },
              { id: "vestibulares", label: "Vestibulares" },
              { id: "isencao", label: "Isenção de Taxa" },
              { id: "bolsas", label: "Bolsas & SISU" },
              { id: "meus", label: `Meus Eventos (${customEvents.length})` },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-[#002f6c] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por instituição, prova..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* GRADE DE CARDS VISUAIS DE COMPROMISSOS */}
        {filteredCards.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <Calendar size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-700">Nenhum compromisso encontrado para o filtro selecionado.</p>
            <p className="text-[11px] text-slate-500 mt-1">Tente mudar a categoria ou adicione um novo evento personalizado.</p>
            <button
              onClick={() => setIsAddEventModalOpen(true)}
              className="mt-3 px-3 py-1.5 bg-[#002f6c] text-white text-xs font-bold rounded cursor-pointer"
            >
              Criar Novo Evento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredCards.map((card) => {
              const parsedDate = parseDeadlineDate(card.deadlineDate);
              const daysRemaining = getDaysRemaining(parsedDate);
              const isSynced = syncedEventIds.includes(card.id);

              // Indicadores visuais de urgência
              const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;
              const isMedium = daysRemaining !== null && daysRemaining > 7 && daysRemaining <= 25;

              return (
                <div
                  key={card.id}
                  className={`bg-white rounded-xl border transition-all duration-200 flex flex-col justify-between p-4 shadow-xs hover:shadow-md ${
                    isSynced ? "border-emerald-200 bg-emerald-50/10" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    {/* Topo do Card: Tags e Contagem Regressiva */}
                    <div className="flex justify-between items-start gap-2 mb-2.5">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                          {card.institutionName}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {card.type}
                        </span>
                        {card.isCustom && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            Pessoal
                          </span>
                        )}
                      </div>

                      {/* Contador de Dias */}
                      {daysRemaining !== null && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 shrink-0 ${
                            daysRemaining < 0
                              ? "bg-slate-100 text-slate-500"
                              : daysRemaining === 0
                              ? "bg-rose-600 text-white animate-pulse"
                              : isUrgent
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : isMedium
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          <Clock size={10} />
                          <span>
                            {daysRemaining < 0
                              ? "Encerrado"
                              : daysRemaining === 0
                              ? "🚨 É Hoje!"
                              : daysRemaining === 1
                              ? "⚠️ Amanhã"
                              : `Faltam ${daysRemaining} dias`}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Título do Evento */}
                    <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {card.title}
                    </h4>

                    {/* Descrição resumida */}
                    <p className="text-[11px] text-slate-500 font-light mt-1.5 line-clamp-2 leading-relaxed">
                      {card.description}
                    </p>

                    {/* Detalhes de Data e Local */}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Calendar size={13} className="text-blue-700 shrink-0" />
                        <span className="font-semibold text-slate-800">{card.deadlineDate}</span>
                        <span className="text-[11px] text-slate-400">({card.timeFormatted})</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="text-[11px] text-slate-600 truncate">{card.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col space-y-2">
                    {/* Botão de Sincronização com o Google Calendar */}
                    {isSynced ? (
                      <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-xs">
                        <div className="flex items-center space-x-1.5 font-bold text-[11px]">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>Sincronizado na Agenda</span>
                        </div>
                        <button
                          onClick={() =>
                            handleSyncToGoogleCalendar(
                              card.id,
                              card.title,
                              card.institutionName,
                              card.deadlineDate,
                              card.location,
                              card.description
                            )
                          }
                          className="text-[10px] text-emerald-700 hover:text-emerald-950 font-semibold underline cursor-pointer"
                          title="Abrir no Google Calendar"
                        >
                          Ver/Reabrir
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          handleSyncToGoogleCalendar(
                            card.id,
                            card.title,
                            card.institutionName,
                            card.deadlineDate,
                            card.location,
                            card.description
                          )
                        }
                        className="w-full py-1.5 bg-[#002f6c] hover:bg-[#001d44] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                      >
                        <Calendar size={13} className="text-amber-400" />
                        <span>Sincronizar no Google Calendar</span>
                      </button>
                    )}

                    {/* Botão Secundário: Detalhes ou Exclusão */}
                    <div className="flex justify-between items-center text-[11px]">
                      {card.isCustom ? (
                        <button
                          onClick={(e) => handleDeleteCustomEvent(card.id, e)}
                          className="text-rose-600 hover:underline cursor-pointer"
                        >
                          Excluir evento
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const found = deadlines.find(d => d.id === card.id);
                            if (found) onSelectDeadline(found);
                          }}
                          className="text-[#002f6c] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Ver edital completo</span>
                          <ChevronRight size={11} />
                        </button>
                      )}

                      {card.officialLink && (
                        <a
                          href={card.officialLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-slate-700 flex items-center space-x-1"
                        >
                          <span>Link Oficial</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DUAS COLUNAS FINAIS: AVISOS URGENTES & INTEGRAÇÃO DE CURITIBA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main: Active alerts panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Bell size={18} className="text-amber-500 animate-bounce" />
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Avisos e Transmissões Urgentes de Curitiba
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                Atualizado em 11/11/2026
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border-l-4 border-rose-600 rounded flex items-start space-x-3">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 font-light">
                  <p className="font-bold text-slate-900">ENEM 2026 — 2º Dia de Prova neste Domingo (15/11)</p>
                  Atenção estudantes de Curitiba: O 2º dia de aplicação do ENEM 2026 (Matemática e Ciências da Natureza) ocorre neste domingo, <span className="font-semibold text-rose-950">15 de Novembro</span>. Os portões fecham rigorosamente às 13h00. O desempenho no exame é indispensável para o ingresso via SISU na UTFPR e para concorrer a bolsas integrais do ProUni.
                </div>
              </div>

              <div className="p-3 bg-blue-50 border-l-4 border-[#002f6c] rounded flex items-start space-x-3">
                <AlertCircle size={16} className="text-[#002f6c] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 font-light">
                  <p className="font-bold text-slate-900">UFPR 2026/2027 — Convocados e Ensalamento da 2ª Fase nesta Sexta (13/11)</p>
                  O Núcleo de Concursos (NC/UFPR) publicará nesta sexta-feira, <span className="font-semibold text-blue-950">13 de Novembro</span>, a relação de classificados da 1ª Fase e os locais de prova da 2ª Fase (prevista para os dias 06 e 07 de Dezembro). Todas as isenções de taxa foram homologadas e os candidatos isentos aprovados têm participação garantida.
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 rounded flex items-start space-x-3">
                <AlertCircle size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 font-light">
                  <p className="font-bold text-slate-900">Bolsa Social PUCPR 2027 & Vestibular UTFPR (Reta Final)</p>
                  O prazo final para envio da documentação de comprovação de renda para as bolsas de 100% da PUCPR encerra-se em <span className="font-semibold text-emerald-950">18 de Novembro</span>. Já a prova presencial do Vestibular de Verão da UTFPR Curitiba será aplicada no domingo, <span className="font-semibold text-emerald-950">22 de Novembro</span>.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar: Contexto Curitiba & Prazos */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <h4 className="text-xs font-bold text-[#002f6c] tracking-widest uppercase border-b border-slate-100 pb-2 m-0">
              Educação & Integração Curitibana
            </h4>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                  Vale do Pinhão
                </span>
                <p className="text-xs text-slate-800 font-semibold mt-1">
                  Espaço de Inovação de Curitiba
                </p>
                <p className="text-[11px] text-slate-500 font-light">
                  A prefeitura promove periodicamente editais de incentivo à residência técnica júnior para estudantes de TI curitibanos, subsidiando capacitações de alto nível.
                </p>
              </div>

              <div className="h-[1px] bg-slate-100"></div>

              <div>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                  Teatro Guaíra
                </span>
                <p className="text-xs text-slate-800 font-semibold mt-1">
                  Bolsas Culturais Unespar
                </p>
                <p className="text-[11px] text-slate-500 font-light">
                  A UNESPAR disponibiliza anualmente auxílios para estudantes dos cursos de dança e artes cênicas acompanharem montagens profissionais no palco de Curitiba.
                </p>
              </div>

              <div className="h-[1px] bg-slate-100"></div>

              <div>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                  Passe VIP Escolar
                </span>
                <p className="text-xs text-slate-800 font-semibold mt-1">
                  Apoio ao Estudante Curitiba
                </p>
                <p className="text-[11px] text-slate-500 font-light">
                  A URBS disponibiliza o passe livre estudantil para matriculados regularmente em escolas em Curitiba.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: VINCULAR GOOGLE CALENDAR */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-[#002f6c] p-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <CalendarCheck size={18} className="text-amber-400" />
                <h4 className="text-sm font-bold">Configurar Google Calendar</h4>
              </div>
              <button
                onClick={() => setIsConnectModalOpen(false)}
                className="text-slate-300 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCalendarConnection} className="p-5 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Sincronização Segura de Vestibulares</span>
                </p>
                <p className="leading-relaxed">
                  Informe o e-mail da sua Conta Google. Os compromissos e datas das provas serão cadastrados na sua agenda com notificações automáticas antes de cada certame.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail da sua Conta Google / Gmail
                </label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@gmail.com"
                  value={tempCalendarInput}
                  onChange={(e) => setTempCalendarInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#002f6c] hover:bg-[#001d44] text-white text-xs font-bold rounded-lg transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Check size={14} />
                  <span>Salvar e Ativar Calendário</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR EVENTO IMPORTANTE */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-[#002f6c] p-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Plus size={18} className="text-amber-400" />
                <h4 className="text-sm font-bold">Adicionar Evento Importante</h4>
              </div>
              <button
                onClick={() => setIsAddEventModalOpen(false)}
                className="text-slate-300 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomEvent} className="p-5 space-y-3.5">
              <p className="text-xs text-slate-600 font-light">
                Cadastre um prazo crucial para os seus estudos (ex: simulado, prova, taxa de inscrição) e envie diretamente para o Google Calendar.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Simulado Geral UFPR - 1ª Fase"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#002f6c] focus:ring-1 focus:ring-[#002f6c]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Instituição Relacionada
                  </label>
                  <select
                    value={newEventInstitution}
                    onChange={(e) => setNewEventInstitution(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#002f6c]"
                  >
                    <option value="UFPR">UFPR (Federal do Paraná)</option>
                    <option value="UTFPR">UTFPR (Tecnológica do Paraná)</option>
                    <option value="IFPR">IFPR (Instituto Federal PR)</option>
                    <option value="PUCPR">PUCPR (Pontifícia Católica)</option>
                    <option value="UNESPAR">UNESPAR (Estadual)</option>
                    <option value="Universidade Positivo">Universidade Positivo</option>
                    <option value="ENEM / MEC">ENEM / MEC</option>
                    <option value="Outro">Outra Instituição</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#002f6c]"
                  >
                    <option value="Vestibular">Vestibular / Prova</option>
                    <option value="Isenção de Taxa">Isenção de Taxa</option>
                    <option value="Inscrição">Inscrição & Matrícula</option>
                    <option value="Simulado">Simulado & Preparatório</option>
                    <option value="SISU">SISU / ProUni / FIES</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data do Compromisso *
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#002f6c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Horário da Prova / Limite
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 13:30 às 18:30"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#002f6c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Local / Polo em Curitiba
                </label>
                <input
                  type="text"
                  placeholder="Ex: Curitiba - Campus Politécnico / Consultar Ensalamento"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#002f6c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações ou Anotações
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Levar documento original com foto e caneta preta de tubo transparente..."
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#002f6c]"
                />
              </div>

              {/* Checkbox para sincronizar automaticamente */}
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="sync-immediately"
                  checked={syncImmediately}
                  onChange={(e) => setSyncImmediately(e.target.checked)}
                  className="w-4 h-4 text-[#002f6c] rounded cursor-pointer"
                />
                <label htmlFor="sync-immediately" className="text-xs text-amber-950 font-semibold cursor-pointer">
                  Sincronizar no Google Calendar imediatamente com lembretes automáticos
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#002f6c] hover:bg-[#001d44] text-white text-xs font-bold rounded-lg transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Plus size={14} className="text-amber-400" />
                  <span>Salvar Evento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

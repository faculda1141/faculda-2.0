import { Institution, EditalDeadline, CareerArea } from "./types";

export const CURITIBA_INSTITUTIONS: Institution[] = [
  {
    id: "ufpr",
    name: "UFPR - Universidade Federal do Paraná",
    type: "Pública Federal",
    campus: ["Centro (Reitoria, Santos Andrade)", "Politécnico (Jardim das Américas)", "Cabral", "Rebouças", "Matinhos", "Palotina"],
    website: "https://www.ufpr.br",
    description: "A mais antiga universidade do Brasil, fundada em 1912. Ícone educacional de Curitiba e do Paraná, altamente reconhecida por suas pesquisas, laboratórios de alto nível e forte prestígio acadêmico no mercado nacional.",
    highlights: "Entrada por vestibular unificado próprio de duas fases ou por transferência externa. Oferece auxílios estudantis robustos (alimentação, moradia) via PRAE.",
    logo: "🏛️"
  },
  {
    id: "utfpr",
    name: "UTFPR - Universidade Tecnológica Federal do Paraná",
    type: "Pública Federal",
    campus: ["Sede Centro (Av. Sete de Setembro)", "Sede Ecoville (Rua Dep. Heitor Alencar Furtado)", "Sede Neoville (Rua Pedro Gusso)"],
    website: "https://www.utfpr.edu.br",
    description: "Referência nacional de ensino tecnológico de ponta, derivada do CEFET-PR. Excelente foco na resolução prática de problemas, estreita conexão com o polo industrial de Curitiba e programas de empreendedorismo de ponta.",
    highlights: "Ingresso 100% pelo SISU (nota do ENEM). Fortes laços de pesquisa aplicada, desenvolvimento e alta aceitação de graduandos nas maiores empresas de tecnologia do país.",
    logo: "💻"
  },
  {
    id: "ifpr",
    name: "IFPR - Instituto Federal do Paraná",
    type: "Pública Federal",
    campus: ["Campus Curitiba (Ecoville / Neoville)", "RM Colombo", "RM Pinhais", "RM Campo Largo"],
    website: "https://ifpr.edu.br",
    description: "Oferece desde cursos técnicos integrados ao ensino médio até graduações tecnológicas de curta duração, além de licenciaturas voltadas para inserção veloz e qualificada no mercado profissional paranaense.",
    highlights: "Vestibular próprio anual e sorteio público para vagas remanescentes. Altamente prestigiado na capacitação produtiva regional de base industrial e de serviços.",
    logo: "🛠️"
  },
  {
    id: "pucpr",
    name: "PUCPR - Pontifícia Universidade Católica do Paraná",
    type: "Privada Comunitária",
    campus: ["Campus Principal (Prado Velho / Curitiba)", "Londrina", "Maringá", "Toledo"],
    website: "https://www.pucpr.br",
    description: "Reconhecida como uma das melhores universidades privadas e filantrópicas do Brasil. Possui um gigantesco ecossistema de inovação (Hotmilk) no Prado Velho, integrando startups e desenvolvimento tecnológico à formação acadêmica.",
    highlights: "Oferece bolsas integrais da Bolsa Social PUCPR, ProUni nacional, vestibular de redação online, aproveitamento do ENEM e financiamentos flexíveis.",
    logo: "⛪"
  },
  {
    id: "positivo",
    name: "Universidade Positivo - UP",
    type: "Privada",
    campus: ["Ecoville (Campus Sede)", "Praça Osório", "Santos Andrade (Pós-Graduação)"],
    website: "https://www.up.edu.br",
    description: "Destaca-se pela sua infraestrutura monumental no Campo Comprido e forte proximidade corporativa nas áreas de medicina, odontologia, arquitetura de vanguarda e ciências de negócios, além da agilidade do sistema EaD.",
    highlights: "Bolsas de mérito pelo ENEM de até 100%, Vestibular de Inverno agendado, e programas de incentivo à transição de carreira para adultos.",
    logo: "☀️"
  },
  {
    id: "unespar",
    name: "UNESPAR - Campus de Curitiba I (EMBAP) e II (FAP)",
    type: "Pública Estadual",
    campus: ["EMBAP (Centro / Comendador Araujo)", "FAP (Cabral)"],
    website: "https://www.unespar.edu.br",
    description: "Universidade Pública Estadual que abriga duas grandes escolas tradicionais de artes e cultura do Paraná: Escola de Música e Belas Artes (EMBAP) e a Faculdade de Artes do Paraná (FAP). Foco integral em formação artística.",
    highlights: "Ingresso pelo próprio Concurso Vestibular Estadual ou pelo Processo Informatizado SISU. Isenção garantida para portadores de CadÚnico PR.",
    logo: "🎨"
  }
];

export const CURITIBA_DEADLINES: EditalDeadline[] = [
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

export const CAREER_AREAS: CareerArea[] = [
  {
    id: "car-1",
    name: "Engenharia de Software & TI",
    category: "Engenharias & TI",
    description: "Desenvolvimento de sistemas computacionais, inteligência artificial, segurança de dados e aplicações web. Curitiba é um dos maiores polos tecnológicos do país, contando com o Vale do Pinhão, dezenas de aceleradoras e centenas de startups que demandam milhares de desenvolvedores.",
    skills: ["Lógica de Programação", "Resolução de Problemas", "Trabalho em Equipe", "Inglês Técnico", "Familiaridade com Bancos de Dados"],
    salariesCuritiba: "R$ 3.800 (Júnior) a R$ 14.500 (Sênior)",
    institutionsOffering: ["UTFPR", "UFPR", "PUCPR", "OPET", "Universidade Positivo", "IFPR"],
    iconName: "Binary"
  },
  {
    id: "car-2",
    name: "Medicina, Biomedicina e Saúde Humana",
    category: "Saúde & Biológicas",
    description: "Diagnóstico, tratamento e prevenção de patologias, bem como pesquisa laboratorial e farmacêutica. Sendo Curitiba polo de excelência médica e com hospitais escola modelo (Hospital de Clínicas da UFPR, Hospital Pequeno Príncipe e Hospital Cajuru da PUCPR), a área tem altos índices de colocação.",
    skills: ["Empatia profunda", "Gosto por biologia e química", "Altíssima capacidade sob pressão", "Ética profissional", "Estudo vitalício"],
    salariesCuritiba: "R$ 8.500 (Início de carreira clínica) até R$ 22.000 (Especialistas)",
    institutionsOffering: ["UFPR", "PUCPR", "Universidade Positivo", "FPP (Faculdades Pequeno Príncipe)", "Evangélica Mackenzie"],
    iconName: "Stethoscope"
  },
  {
    id: "car-3",
    name: "Design de Animação e Cinema e Audiovisual",
    category: "Humanas & Artes",
    description: "Criação de marcas, design industrial, produção cinematográfica, animação digital e economia criativa. Curitiba é uma cidade muito reconhecida por sua identidade visual, design urbano e abriga festivais renomados (como Olhar de Cinema e Festival de Teatro de Curitiba).",
    skills: ["Sensibilidade e percepção visual", "Dominar softwares 3D/Adobe", "Criatividade extrema", "Storytelling", "Análise estética"],
    salariesCuritiba: "R$ 3.200 (Designer Pleno) a R$ 8.200 (Diretor de Arte)",
    institutionsOffering: ["UNESPAR (FAP)", "UFPR", "PUCPR", "Universidade Positivo", "UTFPR (Design Industrial)"],
    iconName: "Palette"
  },
  {
    id: "car-4",
    name: "Administração de Empresas e Finanças Corporativas",
    category: "Negócios & Ciências Sociais",
    description: "Gestão de recursos estratégicos, planejamento governamental, consultoria financeira, marketing digital e inteligência de negócios. Essencial para sustentar o pujante ecossistema empresarial e o setor de comércio e serviços curitibanos.",
    skills: ["Comunicação fluida", "Perfil orientado a metas", "Capacidade analítica e matemática", "Liderança", "Gestão de tempo"],
    salariesCuritiba: "R$ 4.000 (Analista Administrativo) a R$ 12.000 (Gerente Geral)",
    institutionsOffering: ["UFPR", "UTFPR", "PUCPR", "Universidade Positivo", "UniAndrade", "Fesp"],
    iconName: "TrendingUp"
  },
  {
    id: "car-5",
    name: "Arquitetura, Urbanismo e Mobilidade Sustentável",
    category: "Engenharias & TI",
    description: "Planejamento habitacional, paisagismo, design de interiores e mobilidade integrada. Característica histórica forte de Curitiba, referência em planejamento urbano sustentável no mundo com seu sistema de BRT (canaletas expressas e ônibus tubo).",
    skills: ["Desenho técnico e espacial", "Interesse em sustentabilidade", "Legislação urbana", "Domínio de CAD/BIM", "Aparato histórico e estético"],
    salariesCuritiba: "R$ 5.200 (Arquiteto sob sindicato) a R$ 10.500 (Coordenador de Projetos)",
    institutionsOffering: ["UFPR", "PUCPR", "Universidade Positivo", "UTPF-PR (Urbanismo)"],
    iconName: "Map"
  }
];

// ------------------------- PERGUNTAS -------------------------

const LETRAS = ['A', 'B', 'C', 'D'];

const PERGUNTAS_DISC = [
  [
    "Animado",
    "Aventureiro",
    "Analítico",
    "Adaptável"
  ],
  [
    "Brincalhão",
    "Persuasivo",
    "Persistente",
    "Sereno"
  ],
  [
    "Sociável",
    "Energético",
    "Doador",
    "Submisso"
  ],
  [
    "Convincente",
    "Competitivo",
    "Atencioso",
    "Controlado"
  ],
  [
    "Estimulante",
    "Habilidoso",
    "Respeitoso",
    "Reservado"
  ],
  [
    "Espirituoso",
    "Auto-suficiente",
    "Sensível",
    "Satisfeito"
  ],
  [
    "Charmoso",
    "Positivo",
    "Planejador",
    "Paciente"
  ],
  [
    "Espontâneo",
    "Seguro",
    "Organizado",
    "Tímido"
  ],
  [
    "Otimista",
    "Franco",
    "Ordeiro",
    "Serviçal"
  ],
  [
    "Engraçado",
    "Vigoroso",
    "Fiel",
    "Amigável"
  ],
  [
    "Encantador",
    "Audacioso",
    "Minucioso",
    "Diplomático"
  ],
  [
    "Alegre",
    "Confiante",
    "Culto",
    "Previsível"
  ],
  [
    "Inspirado",
    "Independente",
    "Idealista",
    "Inofensivo"
  ],
  [
    "Demonstrativo",
    "Decidido",
    "Profundo",
    "Irônico"
  ],
  [
    "Desembaraçado",
    "Ativo",
    "Musical",
    "Mediador"
  ],
  [
    "Conversador",
    "Firme",
    "Pensativo",
    "Tolerante"
  ],
  [
    "Vivo",
    "Líder",
    "Leal",
    "Ouvinte"
  ],
  [
    "Atraente",
    "Chefe",
    "Detalhista",
    "Contente"
  ],
  [
    "Popular",
    "Produtivo",
    "Perfeccionista",
    "Agradável"
  ],
  [
    "Vivaz",
    "Valente",
    "Comportado",
    "Equilibrado"
  ],
  [
    "Metido",
    "Mandão",
    "Acanhado",
    "Vazio"
  ],
  [
    "Indisciplinado",
    "Insensível",
    "Rancoroso",
    "Desinteressado"
  ],
  [
    "Repetitível",
    "Inflexível",
    "Ressentido",
    "Relutante"
  ],
  [
    "Esquecido",
    "Franco",
    "Complicado",
    "Medroso"
  ],
  [
    "Inoportuno",
    "Impaciente",
    "Inseguro",
    "Indeciso"
  ],
  [
    "Imprevisível",
    "Frio",
    "Impopular",
    "Desligado"
  ],
  [
    "Casual",
    "Cabeçudo",
    "Insatisfeito",
    "Exitante"
  ],
  [
    "Permissivo",
    "Orgulhoso",
    "Cauteloso",
    "Simples"
  ],
  [
    "Esquentado",
    "Discutidor",
    "Alienado",
    "Incerto"
  ],
  [
    "Ingênuo",
    "Ousado",
    "Negativo",
    "Indiferente"
  ],
  [
    "Egoísta",
    "Trabalhador",
    "Retraído",
    "Preocupado"
  ],
  [
    "Tagarela",
    "Indelicado",
    "Sensível demais",
    "Tímido"
  ],
  [
    "Desorganizado",
    "Mandão",
    "Deprimido",
    "Confuso"
  ],
  [
    "Inconstante",
    "Intolerante",
    "Introvertido",
    "Apático"
  ],
  [
    "Desordenado",
    "Manipulador",
    "Triste",
    "Resmungão"
  ],
  [
    "Convencido",
    "Obstinado",
    "Cético (não acreditar)",
    "Lento"
  ],
  [
    "Barulhento",
    "Tirânico",
    "Solitário",
    "Preguiçoso"
  ],
  [
    "Distraído",
    "Irritável",
    "Desconfiado",
    "Vagaroso"
  ],
  [
    "Agitado",
    "Imprudente",
    "Vingativo",
    "Relutante"
  ],
  [
    "Instável",
    "Astuto",
    "Crítico",
    "Acomodado"
  ]
];

// ------------------------- ESTADO -------------------------

const params = new URLSearchParams(window.location.search);
const candidatoId = params.get('candidato') || '';
const nomeCandidato = params.get('nome') || '';
const emailCandidato = params.get('email') || '';

// ------------------------- INICIALIZAÇÃO -------------------------

document.addEventListener('DOMContentLoaded', () => {
  if (!candidatoId) {
    mostrarErro('Não conseguimos identificar seu cadastro. Volte e reenvie o formulário de currículo.');
    document.getElementById('botaoEnviarDisc').disabled = true;
    return;
  }

  renderizarPerguntas();
  document.getElementById('formDisc').addEventListener('submit', enviarTeste);
  document.getElementById('listaPerguntas').addEventListener('change', atualizarProgresso);
});

function renderizarPerguntas() {
  const container = document.getElementById('listaPerguntas');
  container.innerHTML = PERGUNTAS_DISC.map((opcoes, indice) => {
    const numero = indice + 1;
    return `
      <div class="pergunta-disc" id="pergunta-${numero}">
        <div class="pergunta-titulo"><span class="pergunta-numero">${numero}.</span>Escolha a palavra que melhor lhe define:</div>
        ${opcoes.map((palavra, i) => `
          <label class="opcao-disc">
            <input type="radio" name="q${numero}" value="${LETRAS[i]} - ${palavra}" required>
            ${LETRAS[i]} - ${palavra}
          </label>
        `).join('')}
      </div>
    `;
  }).join('');
}

function atualizarProgresso(evento) {
  if (evento && evento.target && evento.target.name) {
    document.getElementById(evento.target.closest('.pergunta-disc').id).classList.add('respondida');
  }

  const total = PERGUNTAS_DISC.length;
  const respondidas = PERGUNTAS_DISC.filter((_, i) => {
    return document.querySelector(`input[name="q${i + 1}"]:checked`);
  }).length;

  document.getElementById('progressoTexto').textContent = `${respondidas} de ${total} respondidas`;
  document.getElementById('progressoBarra').style.width = ((respondidas / total) * 100) + '%';
}

// ------------------------- ENVIO -------------------------

async function enviarTeste(evento) {
  evento.preventDefault();
  esconderErro();

  const respostas = [];
  for (let i = 1; i <= PERGUNTAS_DISC.length; i++) {
    const selecionado = document.querySelector(`input[name="q${i}"]:checked`);
    if (!selecionado) {
      mostrarErro(`Faltou responder a pergunta ${i}. Role a página e complete todas antes de enviar.`);
      document.getElementById(`pergunta-${i}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    respostas.push(selecionado.value);
  }

  mostrarCarregando(true);
  document.getElementById('botaoEnviarDisc').disabled = true;

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'submeterTesteDisc',
        candidatoId,
        nome: nomeCandidato,
        email: emailCandidato,
        respostas
      })
    });

    const data = await resp.json();

    if (data.success) {
      document.getElementById('cardIntro').hidden = true;
      document.getElementById('formDisc').hidden = true;
      document.getElementById('telaSucessoDisc').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      mostrarErro(data.message || 'Não foi possível enviar o teste. Tente novamente.');
      document.getElementById('botaoEnviarDisc').disabled = false;
    }
  } catch (err) {
    mostrarErro('Erro de conexão. Verifique sua internet e tente novamente.');
    document.getElementById('botaoEnviarDisc').disabled = false;
  } finally {
    mostrarCarregando(false);
  }
}

// ------------------------- HELPERS -------------------------

function mostrarErro(msg) {
  const el = document.getElementById('mensagemErro');
  el.textContent = msg;
  el.classList.add('visivel');
}

function esconderErro() {
  const el = document.getElementById('mensagemErro');
  el.textContent = '';
  el.classList.remove('visivel');
}

function mostrarCarregando(mostrar) {
  document.getElementById('overlayCarregando').classList.toggle('visivel', mostrar);
}

// ------------------------- DADOS ESTÁTICOS -------------------------

const ESTADOS_BR = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'],
  ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'],
  ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'],
  ['MG', 'Minas Gerais'], ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'],
  ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'],
  ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins']
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const OPCAO_BANCO_TALENTOS = 'Cadastro geral / Banco de talentos';

let etapaAtual = 1;

// ------------------------- INICIALIZAÇÃO -------------------------

document.addEventListener('DOMContentLoaded', () => {
  preencherSelectData();
  preencherSelectEstados();
  carregarVagas();

  document.getElementById('formCandidato').addEventListener('submit', enviarFormulario);
});

function preencherSelectData() {
  const selDia = document.getElementById('nascDia');
  const selMes = document.getElementById('nascMes');
  const selAno = document.getElementById('nascAno');

  selDia.innerHTML = '<option value="">Dia</option>' +
    Array.from({ length: 31 }, (_, i) => i + 1)
      .map(d => `<option value="${d}">${d}</option>`).join('');

  selMes.innerHTML = '<option value="">Mês</option>' +
    MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');

  const anoAtual = new Date().getFullYear();
  const anos = [];
  for (let a = anoAtual - 14; a >= anoAtual - 80; a--) anos.push(a);
  selAno.innerHTML = '<option value="">Ano</option>' +
    anos.map(a => `<option value="${a}">${a}</option>`).join('');
}

function preencherSelectEstados() {
  const sel = document.getElementById('estado');
  sel.innerHTML = '<option value="">Selecione</option>' +
    ESTADOS_BR.map(([sigla, nome]) => `<option value="${sigla}">${nome}</option>`).join('');
}

async function carregarVagas() {
  const selVaga = document.getElementById('vaga');
  try {
    const resp = await fetch(`${APPS_SCRIPT_URL}?action=getVagasAtivas`);
    const data = await resp.json();
    const vagas = (data.success && data.vagas) ? data.vagas : [];

    selVaga.innerHTML = '<option value="">Selecione</option>' +
      vagas.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('') +
      `<option value="${OPCAO_BANCO_TALENTOS}">${OPCAO_BANCO_TALENTOS}</option>`;
  } catch (err) {
    // Mesmo se a busca de vagas falhar, garante a opção fixa de banco de talentos
    selVaga.innerHTML = `<option value="">Selecione</option><option value="${OPCAO_BANCO_TALENTOS}">${OPCAO_BANCO_TALENTOS}</option>`;
  }
}

// ------------------------- NAVEGAÇÃO ENTRE ETAPAS -------------------------

function irParaEtapa(numero) {
  if (numero > etapaAtual && !validarEtapa(etapaAtual)) {
    return;
  }

  esconderErro();

  document.querySelectorAll('.passo').forEach(p => {
    const ehAtiva = parseInt(p.dataset.passo, 10) === numero;
    p.classList.toggle('ativo', ehAtiva);
    p.hidden = !ehAtiva;
  });

  document.querySelectorAll('.etapa').forEach(e => {
    const n = parseInt(e.dataset.etapa, 10);
    e.classList.remove('ativa', 'concluida');
    if (n === numero) e.classList.add('ativa');
    else if (n < numero) e.classList.add('concluida');
  });

  etapaAtual = numero;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validarEtapa(numero) {
  let camposObrigatorios = [];

  if (numero === 1) {
    camposObrigatorios = ['nome', 'telefone', 'email', 'nascDia', 'nascMes', 'nascAno', 'estado', 'cidade', 'bairro', 'veiculoProprio'];
  } else if (numero === 2) {
    camposObrigatorios = ['disponibilidade', 'vaga', 'escolaridade', 'pretensaoSalarial'];
  }

  for (const id of camposObrigatorios) {
    const el = document.getElementById(id);
    if (!el.value || el.value.trim() === '') {
      mostrarErro('Preencha todos os campos obrigatórios antes de continuar.');
      el.focus();
      return false;
    }
  }

  if (numero === 1) {
    const emailEl = document.getElementById('email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
      mostrarErro('Informe um email válido.');
      emailEl.focus();
      return false;
    }
  }

  return true;
}

// ------------------------- ENVIO -------------------------

async function enviarFormulario(evento) {
  evento.preventDefault();
  esconderErro();

  const arquivoInput = document.getElementById('arquivo');
  const arquivo = arquivoInput.files[0];
  const consentimento = document.getElementById('consentimento').checked;

  if (!arquivo) {
    mostrarErro('Anexe seu currículo antes de enviar.');
    return;
  }

  if (arquivo.size > 10 * 1024 * 1024) {
    mostrarErro('O arquivo excede o limite de 10MB.');
    return;
  }

  if (!consentimento) {
    mostrarErro('É necessário aceitar o uso de dados para continuar.');
    return;
  }

  mostrarCarregando(true);

  try {
    const base64 = await arquivoParaBase64(arquivo);

    const dia = document.getElementById('nascDia').value.padStart(2, '0');
    const mes = document.getElementById('nascMes').value.padStart(2, '0');
    const ano = document.getElementById('nascAno').value;
    const dataNascimento = `${ano}-${mes}-${dia}`;

    const payload = {
      action: 'submitCandidato',
      dados: {
        honeypot: document.getElementById('hp_site').value,
        nome: document.getElementById('nome').value.trim(),
        telefone: document.getElementById('telefone').value.trim(),
        email: document.getElementById('email').value.trim(),
        dataNascimento,
        estado: document.getElementById('estado').value,
        cidade: document.getElementById('cidade').value.trim(),
        bairro: document.getElementById('bairro').value.trim(),
        veiculoProprio: document.getElementById('veiculoProprio').value,
        disponibilidade: document.getElementById('disponibilidade').value,
        vaga: document.getElementById('vaga').value,
        escolaridade: document.getElementById('escolaridade').value,
        pretensaoSalarial: document.getElementById('pretensaoSalarial').value,
        consentimento
      },
      arquivo: {
        base64,
        nome: arquivo.name,
        mimeType: arquivo.type
      }
    };

    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (data.success) {
      document.getElementById('cardFormulario').querySelector('form').hidden = true;
      document.getElementById('barraEtapas').hidden = true;
      document.getElementById('telaSucesso').hidden = false;
    } else {
      mostrarErro(data.message || 'Não foi possível enviar seu cadastro. Tente novamente.');
    }
  } catch (err) {
    mostrarErro('Erro de conexão. Verifique sua internet e tente novamente.');
  } finally {
    mostrarCarregando(false);
  }
}

function arquivoParaBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(arquivo);
  });
}

// ------------------------- HELPERS DE UI -------------------------

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
  document.getElementById('botaoEnviar').disabled = mostrar;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

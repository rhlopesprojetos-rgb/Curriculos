// ------------------------- ESTADO GLOBAL -------------------------

let TOKEN = null;
let candidatosOriginais = [];
let candidatosFiltrados = [];
let vagas = [];
let paginaAtual = 1;
const ITENS_POR_PAGINA = 10;

let graficoCargo, graficoIdade, graficoPretensao, graficoEnvios;

const CHAVE_STORAGE = 'lopes_admin_token';

// ------------------------- INICIALIZAÇÃO -------------------------

document.addEventListener('DOMContentLoaded', () => {
  const tokenSalvo = localStorage.getItem(CHAVE_STORAGE);
  if (tokenSalvo) {
    TOKEN = tokenSalvo;
    mostrarApp();
  }

  document.getElementById('senhaLogin').addEventListener('keydown', e => {
    if (e.key === 'Enter') fazerLogin();
  });
});

// ------------------------- LOGIN / LOGOUT -------------------------

async function fazerLogin() {
  const senha = document.getElementById('senhaLogin').value;
  const erroEl = document.getElementById('erroLogin');
  erroEl.classList.remove('visivel');

  if (!senha) return;

  mostrarCarregando(true);
  try {
    const resp = await chamarBackend({ action: 'login', senha });
    if (resp.success) {
      TOKEN = resp.token;
      localStorage.setItem(CHAVE_STORAGE, TOKEN);
      mostrarApp();
    } else {
      erroEl.textContent = resp.message || 'Senha incorreta.';
      erroEl.classList.add('visivel');
    }
  } catch (err) {
    erroEl.textContent = 'Erro de conexão. Tente novamente.';
    erroEl.classList.add('visivel');
  } finally {
    mostrarCarregando(false);
  }
}

function sair() {
  localStorage.removeItem(CHAVE_STORAGE);
  TOKEN = null;
  document.getElementById('app').hidden = true;
  document.getElementById('telaLogin').hidden = false;
  document.getElementById('senhaLogin').value = '';
}

function mostrarApp() {
  document.getElementById('telaLogin').hidden = true;
  document.getElementById('app').hidden = false;
  carregarTudo();
}

// ------------------------- CHAMADAS AO BACKEND -------------------------

async function chamarBackend(payload, tentativas = 3) {
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ token: TOKEN }, payload))
      });
      return await resp.json();
    } catch (err) {
      if (tentativa === tentativas) throw err;
      // Falha intermitente conhecida do Apps Script: espera um pouco e tenta de novo
      await new Promise(r => setTimeout(r, 600 * tentativa));
    }
  }
}

async function carregarTudo() {
  mostrarCarregando(true);
  try {
      // Chamadas sequenciais (não simultâneas): Web Apps do Apps Script podem
    // falhar de forma intermitente quando recebem 2 requisições ao mesmo tempo.
    const respCandidatos = await chamarBackend({ action: 'listCandidatos' });
    if (!respCandidatos.success) {
      alert(respCandidatos.message || 'Sessão expirada ou inválida. Faça login novamente.');
      sair();
      return;
    }

    const respVagas = await chamarBackend({ action: 'listVagasAdmin' });
    if (!respVagas.success) {
      alert(respVagas.message || 'Sessão expirada ou inválida. Faça login novamente.');
      sair();
      return;
    }

    candidatosOriginais = respCandidatos.candidatos || [];
    vagas = respVagas.vagas || [];

    popularFiltros();
    renderizarVagas();
    aplicarFiltros();
  } catch (err) {
    alert('Erro ao carregar dados do painel. Verifique sua conexão.');
  } finally {
    mostrarCarregando(false);
  }
}

// ------------------------- FILTROS -------------------------

function popularFiltros() {
  const cargos = [...new Set(candidatosOriginais.map(c => c.Vaga).filter(Boolean))].sort();
  const estados = [...new Set(candidatosOriginais.map(c => c.Estado).filter(Boolean))].sort();
  const escolaridades = [...new Set(candidatosOriginais.map(c => c.Escolaridade).filter(Boolean))];
  const disponibilidades = [...new Set(candidatosOriginais.map(c => c.Disponibilidade).filter(Boolean))];

  preencherSelectFiltro('filtroCargo', cargos, 'Todos');
  preencherSelectFiltro('filtroEstado', estados, 'Todos');
  preencherSelectFiltro('filtroEscolaridade', escolaridades, 'Todas');
  preencherSelectFiltro('filtroDisponibilidade', disponibilidades, 'Todas');
}

function preencherSelectFiltro(id, opcoes, rotuloPadrao) {
  const sel = document.getElementById(id);
  const valorAtual = sel.value;
  sel.innerHTML = `<option value="">${rotuloPadrao}</option>` +
    opcoes.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
  sel.value = valorAtual;
}

function aplicarFiltros() {
  const texto = document.getElementById('filtroTexto').value.trim().toLowerCase();
  const cargo = document.getElementById('filtroCargo').value;
  const estado = document.getElementById('filtroEstado').value;
  const escolaridade = document.getElementById('filtroEscolaridade').value;
  const disponibilidade = document.getElementById('filtroDisponibilidade').value;
  const periodo = document.getElementById('filtroPeriodo').value;

  candidatosFiltrados = candidatosOriginais.filter(c => {
    if (texto && !(`${c.Nome} ${c.Email}`.toLowerCase().includes(texto))) return false;
    if (cargo && c.Vaga !== cargo) return false;
    if (estado && c.Estado !== estado) return false;
    if (escolaridade && c.Escolaridade !== escolaridade) return false;
    if (disponibilidade && c.Disponibilidade !== disponibilidade) return false;
    if (periodo) {
      const dias = parseInt(periodo, 10);
      const dataEnvio = new Date(c.Timestamp);
      const limite = new Date();
      limite.setDate(limite.getDate() - dias);
      if (dataEnvio < limite) return false;
    }
    return true;
  });

  paginaAtual = 1;
  renderizarResumo();
  renderizarGraficos();
  renderizarTabela();
}

// ------------------------- RESUMO -------------------------

function renderizarResumo() {
  const total = candidatosFiltrados.length;

  const pretensoes = candidatosFiltrados.map(c => parseFloat(c.PretensaoSalarial)).filter(v => !isNaN(v));
  const mediaPretensao = pretensoes.length ? pretensoes.reduce((a, b) => a + b, 0) / pretensoes.length : 0;

  const idades = candidatosFiltrados.map(c => parseFloat(c.Idade)).filter(v => !isNaN(v));
  const mediaIdade = idades.length ? idades.reduce((a, b) => a + b, 0) / idades.length : 0;

  const contagemCargos = {};
  candidatosFiltrados.forEach(c => {
    if (c.Vaga) contagemCargos[c.Vaga] = (contagemCargos[c.Vaga] || 0) + 1;
  });
  const cargoTop = Object.entries(contagemCargos).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('resumoTotal').textContent = total;
  document.getElementById('resumoPretensao').textContent = formatarMoeda(mediaPretensao);
  document.getElementById('resumoIdade').textContent = idades.length ? mediaIdade.toFixed(1) : '—';
  document.getElementById('resumoCargo').textContent = cargoTop ? cargoTop[0] : '—';
}

// ------------------------- GRÁFICOS -------------------------

function renderizarGraficos() {
  renderizarGraficoCargo();
  renderizarGraficoIdade();
  renderizarGraficoPretensao();
  renderizarGraficoEnvios();
}

function coresGrafico(qtd) {
  const base = ['#E8410A', '#1a2744', '#f2a154', '#5b7fb8', '#c93a09', '#8fa8d8', '#f5c99a', '#3a4d78'];
  return Array.from({ length: qtd }, (_, i) => base[i % base.length]);
}

function renderizarGraficoCargo() {
  const contagem = {};
  candidatosFiltrados.forEach(c => {
    const cargo = c.Vaga || 'Não informado';
    contagem[cargo] = (contagem[cargo] || 0) + 1;
  });
  const labels = Object.keys(contagem);
  const dados = Object.values(contagem);

  if (graficoCargo) graficoCargo.destroy();
  graficoCargo = new Chart(document.getElementById('graficoCargo'), {
    type: 'bar',
    data: { labels, datasets: [{ data: dados, backgroundColor: coresGrafico(labels.length) }] },
    options: opcoesGraficoBase(false)
  });
}

function renderizarGraficoIdade() {
  const faixas = ['16-20', '21-25', '26-30', '31-40', '41-50', '51+'];
  const contagem = { '16-20': 0, '21-25': 0, '26-30': 0, '31-40': 0, '41-50': 0, '51+': 0 };

  candidatosFiltrados.forEach(c => {
    const idade = parseFloat(c.Idade);
    if (isNaN(idade)) return;
    if (idade <= 20) contagem['16-20']++;
    else if (idade <= 25) contagem['21-25']++;
    else if (idade <= 30) contagem['26-30']++;
    else if (idade <= 40) contagem['31-40']++;
    else if (idade <= 50) contagem['41-50']++;
    else contagem['51+']++;
  });

  if (graficoIdade) graficoIdade.destroy();
  graficoIdade = new Chart(document.getElementById('graficoIdade'), {
    type: 'doughnut',
    data: { labels: faixas, datasets: [{ data: faixas.map(f => contagem[f]), backgroundColor: coresGrafico(faixas.length) }] },
    options: opcoesGraficoBase(true)
  });
}

function renderizarGraficoPretensao() {
  const faixas = ['Até 1.500', '1.501-2.500', '2.501-4.000', '4.001-6.000', 'Acima de 6.000'];
  const contagem = { 'Até 1.500': 0, '1.501-2.500': 0, '2.501-4.000': 0, '4.001-6.000': 0, 'Acima de 6.000': 0 };

  candidatosFiltrados.forEach(c => {
    const valor = parseFloat(c.PretensaoSalarial);
    if (isNaN(valor)) return;
    if (valor <= 1500) contagem['Até 1.500']++;
    else if (valor <= 2500) contagem['1.501-2.500']++;
    else if (valor <= 4000) contagem['2.501-4.000']++;
    else if (valor <= 6000) contagem['4.001-6.000']++;
    else contagem['Acima de 6.000']++;
  });

  if (graficoPretensao) graficoPretensao.destroy();
  graficoPretensao = new Chart(document.getElementById('graficoPretensao'), {
    type: 'bar',
    data: { labels: faixas, datasets: [{ data: faixas.map(f => contagem[f]), backgroundColor: coresGrafico(faixas.length) }] },
    options: opcoesGraficoBase(false)
  });
}

function renderizarGraficoEnvios() {
  const contagem = {};
  candidatosFiltrados.forEach(c => {
    const data = new Date(c.Timestamp);
    if (isNaN(data.getTime())) return;
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    contagem[chave] = (contagem[chave] || 0) + 1;
  });
  const labels = Object.keys(contagem).sort();
  const dados = labels.map(l => contagem[l]);

  if (graficoEnvios) graficoEnvios.destroy();
  graficoEnvios = new Chart(document.getElementById('graficoEnvios'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: dados,
        borderColor: '#E8410A',
        backgroundColor: 'rgba(232,65,10,0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: opcoesGraficoBase(false)
  });
}

function opcoesGraficoBase(ehPizza) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: ehPizza, position: 'bottom', labels: { font: { size: 11 } } }
    },
    scales: ehPizza ? {} : {
      y: { beginAtZero: true, ticks: { precision: 0 } }
    }
  };
}

// ------------------------- TABELA / PAGINAÇÃO -------------------------

function renderizarTabela() {
  const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const pagina = candidatosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);

  const corpo = document.getElementById('corpoTabela');
  document.getElementById('tabelaVazia').hidden = candidatosFiltrados.length !== 0;

  corpo.innerHTML = pagina.map(c => `
    <tr>
      <td>${escapeHtml(c.Nome || '')}</td>
      <td>${escapeHtml(c.Email || '')}</td>
      <td>${escapeHtml(c.Telefone || '')}</td>
      <td>${escapeHtml(c.Vaga || '')}</td>
      <td>${escapeHtml(c.Cidade || '')}/${escapeHtml(c.Estado || '')}</td>
      <td>${escapeHtml(c.Escolaridade || '')}</td>
      <td>${escapeHtml(String(c.Idade ?? ''))}</td>
      <td>${formatarMoeda(parseFloat(c.PretensaoSalarial) || 0)}</td>
      <td>${escapeHtml(c.Disponibilidade || '')}</td>
      <td>${c.ArquivoURL ? `<a href="${c.ArquivoURL}" target="_blank" rel="noopener">Ver arquivo</a>` : '—'}</td>
      <td><button class="botao botao-secundario" onclick="abrirModal('${c.ID}')">Editar</button></td>
    </tr>
  `).join('');

  renderizarPaginacao();
}

function renderizarPaginacao() {
  const totalPaginas = Math.max(1, Math.ceil(candidatosFiltrados.length / ITENS_POR_PAGINA));
  const el = document.getElementById('paginacao');

  let html = `<button ${paginaAtual === 1 ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual - 1})">‹</button>`;

  for (let p = 1; p <= totalPaginas; p++) {
    if (p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 1) {
      html += `<button class="${p === paginaAtual ? 'ativo' : ''}" onclick="mudarPagina(${p})">${p}</button>`;
    } else if (Math.abs(p - paginaAtual) === 2) {
      html += `<span>…</span>`;
    }
  }

  html += `<button ${paginaAtual === totalPaginas ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual + 1})">›</button>`;
  el.innerHTML = html;
}

function mudarPagina(p) {
  const totalPaginas = Math.max(1, Math.ceil(candidatosFiltrados.length / ITENS_POR_PAGINA));
  if (p < 1 || p > totalPaginas) return;
  paginaAtual = p;
  renderizarTabela();
}

// ------------------------- EXPORTAR CSV -------------------------

function exportarCsv() {
  if (candidatosFiltrados.length === 0) {
    alert('Não há candidatos para exportar com os filtros atuais.');
    return;
  }

  const colunas = ['Nome', 'Email', 'Telefone', 'DataNascimento', 'Idade', 'Estado', 'Cidade', 'Bairro',
    'VeiculoProprio', 'Disponibilidade', 'Vaga', 'Escolaridade', 'PretensaoSalarial', 'ArquivoURL', 'Timestamp'];

  const linhas = [colunas.join(',')];
  candidatosFiltrados.forEach(c => {
    const linha = colunas.map(col => `"${String(c[col] ?? '').replace(/"/g, '""')}"`);
    linhas.push(linha.join(','));
  });

  const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `candidatos_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ------------------------- MODAL DE EDIÇÃO -------------------------

function abrirModal(id) {
  const c = candidatosOriginais.find(x => x.ID === id);
  if (!c) return;

  document.getElementById('editId').value = c.ID;
  document.getElementById('editNome').value = c.Nome || '';
  document.getElementById('editTelefone').value = c.Telefone || '';
  document.getElementById('editEmail').value = c.Email || '';
  document.getElementById('editDataNascimento').value = formatarDataParaInput(c.DataNascimento);
  document.getElementById('editEstado').value = c.Estado || '';
  document.getElementById('editCidade').value = c.Cidade || '';
  document.getElementById('editBairro').value = c.Bairro || '';
  document.getElementById('editVeiculoProprio').value = c.VeiculoProprio || 'Sim';
  document.getElementById('editVaga').value = c.Vaga || '';
  document.getElementById('editEscolaridade').value = c.Escolaridade || '';
  document.getElementById('editPretensaoSalarial').value = c.PretensaoSalarial || '';
  document.getElementById('editDisponibilidade').value = c.Disponibilidade || '';

  document.getElementById('modalEdicao').hidden = false;
}

function fecharModal() {
  document.getElementById('modalEdicao').hidden = true;
}

async function salvarEdicao() {
  const dados = {
    ID: document.getElementById('editId').value,
    Nome: document.getElementById('editNome').value.trim(),
    Telefone: document.getElementById('editTelefone').value.trim(),
    Email: document.getElementById('editEmail').value.trim(),
    DataNascimento: document.getElementById('editDataNascimento').value,
    Estado: document.getElementById('editEstado').value.trim(),
    Cidade: document.getElementById('editCidade').value.trim(),
    Bairro: document.getElementById('editBairro').value.trim(),
    VeiculoProprio: document.getElementById('editVeiculoProprio').value,
    Vaga: document.getElementById('editVaga').value.trim(),
    Escolaridade: document.getElementById('editEscolaridade').value,
    PretensaoSalarial: document.getElementById('editPretensaoSalarial').value,
    Disponibilidade: document.getElementById('editDisponibilidade').value
  };

  mostrarCarregando(true);
  try {
    const resp = await chamarBackend({ action: 'editCandidato', dados });
    if (resp.success) {
      fecharModal();
      await carregarTudo();
    } else {
      alert(resp.message || 'Não foi possível salvar as alterações.');
    }
  } catch (err) {
    alert('Erro de conexão ao salvar.');
  } finally {
    mostrarCarregando(false);
  }
}

// ------------------------- VAGAS -------------------------

function renderizarVagas() {
  const corpo = document.getElementById('corpoTabelaVagas');
  document.getElementById('vagasVazio').hidden = vagas.length !== 0;

  corpo.innerHTML = vagas.map(v => `
    <tr>
      <td>${escapeHtml(v.Titulo || '')}</td>
      <td>
        <select class="status-select" onchange="mudarStatusVaga('${v.ID}', this.value)">
          ${['Ativa', 'Inativa', 'Fechada', 'Cancelada'].map(s =>
            `<option value="${s}" ${v.Status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${formatarData(v.DataCriacao)}</td>
      <td><button class="botao botao-perigo" onclick="excluirVagaConfirma('${v.ID}')">Excluir</button></td>
    </tr>
  `).join('');
}

async function criarVaga() {
  const input = document.getElementById('novaVagaTitulo');
  const titulo = input.value.trim();
  if (!titulo) return;

  mostrarCarregando(true);
  try {
    const resp = await chamarBackend({ action: 'createVaga', titulo });
    if (resp.success) {
      input.value = '';
      await carregarTudo();
    } else {
      alert(resp.message || 'Não foi possível criar a vaga.');
    }
  } catch (err) {
    alert('Erro de conexão ao criar vaga.');
  } finally {
    mostrarCarregando(false);
  }
}

async function mudarStatusVaga(id, status) {
  mostrarCarregando(true);
  try {
    const resp = await chamarBackend({ action: 'updateVagaStatus', id, status });
    if (!resp.success) {
      alert(resp.message || 'Não foi possível atualizar o status.');
      await carregarTudo();
    }
  } catch (err) {
    alert('Erro de conexão ao atualizar status.');
  } finally {
    mostrarCarregando(false);
  }
}

function excluirVagaConfirma(id) {
  if (!confirm('Excluir esta vaga? Os currículos já recebidos para esse cargo não serão afetados.')) return;
  excluirVagaExecuta(id);
}

async function excluirVagaExecuta(id) {
  mostrarCarregando(true);
  try {
    const resp = await chamarBackend({ action: 'deleteVaga', id });
    if (resp.success) {
      await carregarTudo();
    } else {
      alert(resp.message || 'Não foi possível excluir a vaga.');
    }
  } catch (err) {
    alert('Erro de conexão ao excluir vaga.');
  } finally {
    mostrarCarregando(false);
  }
}

// ------------------------- HELPERS -------------------------

function mostrarCarregando(mostrar) {
  document.getElementById('overlayCarregando').classList.toggle('visivel', mostrar);
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data) {
  const d = new Date(data);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

function formatarDataParaInput(data) {
  if (!data) return '';
  const d = new Date(data);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

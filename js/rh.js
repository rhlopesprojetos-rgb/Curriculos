// ------------------------- ESTADO -------------------------

let rhColaboradores = null; // null = ainda não carregado
let rhCursos = null;
let rhDadosCarregando = false;

let rhListaFiltrados = [];
let rhListaPagina = 1;
let rhListaSomenteAtivos = false;
const RH_LISTA_POR_PAGINA = 15;

let chVisaoHc, chVisaoAdm, chVisaoUnidade, chVisaoDepto, chVisaoCargo;
let chColabTempo, chColabGeracao, chColabSexo, chColabDecisao;
let chTurnoverAno;
let chTreinoArea, chTreinoCertificado, chTreinoDepto, chTreinoNota, chTreinoEvolucao;

const ORDEM_FAIXA_TEMPO = ['< 1 ano', '1-2 anos', '2-3 anos', '3-5 anos', '5-10 anos', '10-15 anos', '15-20 anos', '20+ anos'];

// ------------------------- CARREGAMENTO -------------------------

async function garantirDadosRh() {
  if (rhColaboradores !== null || rhDadosCarregando) return;
  rhDadosCarregando = true;
  mostrarCarregando(true);

  try {
    const respColab = await chamarBackend({ action: 'listColaboradores' });
    if (!respColab.success) {
      alert(respColab.message || 'Não foi possível carregar os dados de colaboradores. Verifique se a aba "Colaboradores" existe na planilha.');
      rhColaboradores = [];
    } else {
      rhColaboradores = respColab.colaboradores || [];
    }

    const respCursos = await chamarBackend({ action: 'listCursos' });
    rhCursos = respCursos.success ? (respCursos.cursos || []) : [];

    renderizarTudoRh();
  } catch (err) {
    alert('Erro de conexão ao carregar dados de RH.');
    rhColaboradores = rhColaboradores || [];
  } finally {
    rhDadosCarregando = false;
    mostrarCarregando(false);
  }
}

function renderizarTudoRh() {
  if (!rhColaboradores || rhColaboradores.length === 0) return;
  renderizarVisaoGeralRh();
  renderizarColaboradoresRh();
  renderizarRetencaoRh();
  renderizarTreinamentosRh();
  rhListaSomenteAtivos = false;
  renderizarListaRh();
}

// ------------------------- HELPERS DE DATA -------------------------

function rhParseData(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  return isNaN(d.getTime()) ? null : d;
}

function rhDiasEntre(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// ------------------------- VISÃO GERAL -------------------------

function rhHeadcountNoFimDoAno(colaboradores, ano) {
  return colaboradores.filter(c => {
    if (!c._anoAdmissao) return false;
    if (c._anoAdmissao > ano) return false;
    if (c._ativo) return true;
    if (!c._anoDesligamento) return true; // sem data de desligamento registrada
    return c._anoDesligamento > ano;
  }).length;
}

function renderizarVisaoGeralRh() {
  const colaboradores = rhColaboradores;
  const anoAtual = new Date().getFullYear();
  const ativos = colaboradores.filter(c => c._ativo);

  const admissoesAno = colaboradores.filter(c => c._anoAdmissao === anoAtual).length;
  const desligamentosAno = colaboradores.filter(c => c._anoDesligamento === anoAtual).length;
  const turnoverAno = ativos.length ? ((desligamentosAno / ativos.length) * 100).toFixed(1) : '0.0';

  document.getElementById('rhVisaoKpis').innerHTML = `
    <div class="card-resumo"><div class="rotulo">Total ativos</div><div class="valor">${ativos.length}</div></div>
    <div class="card-resumo"><div class="rotulo">Admissões (${anoAtual})</div><div class="valor">${admissoesAno}</div></div>
    <div class="card-resumo"><div class="rotulo">Desligamentos (${anoAtual})</div><div class="valor">${desligamentosAno}</div></div>
    <div class="card-resumo"><div class="rotulo">Turnover aprox. (${anoAtual})</div><div class="valor">${turnoverAno}%</div></div>
  `;

  // Headcount por ano
  const anos = [...new Set(colaboradores.map(c => c._anoAdmissao).filter(a => a > 0))].sort();
  const primeiroAno = anos.length ? anos[0] : anoAtual;
  const listaAnos = [];
  for (let a = primeiroAno; a <= anoAtual; a++) listaAnos.push(a);

  const headcountPorAno = listaAnos.map(a => rhHeadcountNoFimDoAno(colaboradores, a));

  if (chVisaoHc) chVisaoHc.destroy();
  chVisaoHc = new Chart(document.getElementById('chVisaoHc'), {
    type: 'line',
    data: {
      labels: listaAnos,
      datasets: [{ data: headcountPorAno, borderColor: '#E8410A', backgroundColor: 'rgba(232,65,10,0.1)', fill: true, tension: 0.25 }]
    },
    options: opcoesGraficoBase(false)
  });

  // Admissões vs desligamentos por ano
  const admissoesPorAno = listaAnos.map(a => colaboradores.filter(c => c._anoAdmissao === a).length);
  const desligamentosPorAno = listaAnos.map(a => colaboradores.filter(c => c._anoDesligamento === a).length);

  if (chVisaoAdm) chVisaoAdm.destroy();
  chVisaoAdm = new Chart(document.getElementById('chVisaoAdm'), {
    type: 'bar',
    data: {
      labels: listaAnos,
      datasets: [
        { label: 'Admissões', data: admissoesPorAno, backgroundColor: '#1a2744' },
        { label: 'Desligamentos', data: desligamentosPorAno, backgroundColor: '#E8410A' }
      ]
    },
    options: Object.assign({}, opcoesGraficoBase(false), { plugins: { legend: { display: true, position: 'bottom' } } })
  });

  // Por unidade / departamento (ativos)
  renderizarBarraContagem('chVisaoUnidade', chVisaoUnidade, contarPorCampo(ativos, 'Unidade'), r => (chVisaoUnidade = r));
  renderizarBarraContagem('chVisaoDepto', chVisaoDepto, contarPorCampo(ativos, 'Departamento'), r => (chVisaoDepto = r));

  // Por cargo — top 20
  const porCargo = contarPorCampo(ativos, 'Cargo');
  const top20 = Object.entries(porCargo).sort((a, b) => b[1] - a[1]).slice(0, 20);

  if (chVisaoCargo) chVisaoCargo.destroy();
  chVisaoCargo = new Chart(document.getElementById('chVisaoCargo'), {
    type: 'bar',
    data: {
      labels: top20.map(x => x[0]),
      datasets: [{ data: top20.map(x => x[1]), backgroundColor: coresGrafico(top20.length) }]
    },
    options: Object.assign({}, opcoesGraficoBase(false), { indexAxis: 'y' })
  });
}

function contarPorCampo(lista, campo) {
  const contagem = {};
  lista.forEach(c => {
    const valor = (c[campo] || 'Não informado').toString().trim() || 'Não informado';
    contagem[valor] = (contagem[valor] || 0) + 1;
  });
  return contagem;
}

function renderizarBarraContagem(canvasId, chartRef, contagem, setRef) {
  const entradas = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  if (chartRef) chartRef.destroy();
  const grafico = new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: {
      labels: entradas.map(x => x[0]),
      datasets: [{ data: entradas.map(x => x[1]), backgroundColor: coresGrafico(entradas.length) }]
    },
    options: opcoesGraficoBase(false)
  });
  setRef(grafico);
}

// ------------------------- COLABORADORES -------------------------

function renderizarColaboradoresRh() {
  const ativos = rhColaboradores.filter(c => c._ativo);
  const desligados = rhColaboradores.filter(c => !c._ativo);

  // Medalhistas
  const topTempo = ativos
    .filter(c => c._tempoAnos !== null && c._tempoAnos !== undefined)
    .sort((a, b) => b._tempoAnos - a._tempoAnos)
    .slice(0, 4);

  document.getElementById('rhMedalhas').innerHTML = topTempo.map(c => `
    <div class="medal">
      <div class="medal-nome">${escapeHtml(c.Nome || '')}</div>
      <div class="medal-anos">${c._tempoAnos} anos</div>
      <div class="medal-cargo">${escapeHtml(c.Cargo || '')}</div>
    </div>
  `).join('') || '<p class="vazio">Sem dados suficientes.</p>';

  // Tempo de empresa
  const contagemTempo = {};
  ORDEM_FAIXA_TEMPO.forEach(f => (contagemTempo[f] = 0));
  ativos.forEach(c => {
    if (contagemTempo[c._faixaTempo] !== undefined) contagemTempo[c._faixaTempo]++;
  });

  if (chColabTempo) chColabTempo.destroy();
  chColabTempo = new Chart(document.getElementById('chColabTempo'), {
    type: 'bar',
    data: {
      labels: ORDEM_FAIXA_TEMPO,
      datasets: [{ data: ORDEM_FAIXA_TEMPO.map(f => contagemTempo[f]), backgroundColor: coresGrafico(ORDEM_FAIXA_TEMPO.length) }]
    },
    options: opcoesGraficoBase(false)
  });

  // Geração
  const porGeracao = contarPorCampo(ativos, '_geracao');
  if (chColabGeracao) chColabGeracao.destroy();
  chColabGeracao = new Chart(document.getElementById('chColabGeracao'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(porGeracao),
      datasets: [{ data: Object.values(porGeracao), backgroundColor: coresGrafico(Object.keys(porGeracao).length) }]
    },
    options: opcoesGraficoBase(true)
  });

  // Sexo
  const porSexo = contarPorCampo(ativos, 'Sexo');
  if (chColabSexo) chColabSexo.destroy();
  chColabSexo = new Chart(document.getElementById('chColabSexo'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(porSexo),
      datasets: [{ data: Object.values(porSexo), backgroundColor: coresGrafico(Object.keys(porSexo).length) }]
    },
    options: opcoesGraficoBase(true)
  });

  // Decisão de desligamento
  const porDecisao = contarPorCampo(desligados, '_decisaoDesligamento');
  if (chColabDecisao) chColabDecisao.destroy();
  chColabDecisao = new Chart(document.getElementById('chColabDecisao'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(porDecisao),
      datasets: [{ data: Object.values(porDecisao), backgroundColor: coresGrafico(Object.keys(porDecisao).length) }]
    },
    options: opcoesGraficoBase(true)
  });

  // Motivos de desligamento — top 10
  const porMotivo = contarPorCampo(desligados, 'Motivo de Desligamento');
  const top10Motivos = Object.entries(porMotivo).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maiorValor = top10Motivos.length ? top10Motivos[0][1] : 1;

  document.getElementById('rhMotivos').innerHTML = top10Motivos.map(([motivo, qtd]) => `
    <div class="bar-row">
      <div class="bar-lbl">${escapeHtml(motivo)}</div>
      <div class="bar-bg"><div class="bar-fill" style="width:${(qtd / maiorValor) * 100}%"></div></div>
      <div class="bar-v">${qtd}</div>
    </div>
  `).join('') || '<p class="vazio">Sem desligamentos registrados.</p>';
}

// ------------------------- RETENÇÃO & TURNOVER -------------------------

function renderizarRetencaoRh() {
  const colaboradores = rhColaboradores;
  const anoAtual = new Date().getFullYear();

  const anos = [...new Set(colaboradores.map(c => c._anoAdmissao).filter(a => a > 0))].sort();
  const primeiroAno = anos.length ? anos[0] : anoAtual;
  const listaAnos = [];
  for (let a = primeiroAno; a <= anoAtual; a++) listaAnos.push(a);

  const turnoverPorAno = listaAnos.map(ano => {
    const hcInicio = rhHeadcountNoFimDoAno(colaboradores, ano - 1);
    const hcFim = rhHeadcountNoFimDoAno(colaboradores, ano);
    const hcMedio = (hcInicio + hcFim) / 2 || hcFim || 1;
    const desligadosAno = colaboradores.filter(c => c._anoDesligamento === ano).length;
    return Number(((desligadosAno / hcMedio) * 100).toFixed(1));
  });

  const desligamentosAno = colaboradores.filter(c => c._anoDesligamento === anoAtual).length;
  const desligamentosAnoAnterior = colaboradores.filter(c => c._anoDesligamento === anoAtual - 1).length;
  const totalDesligadosHistorico = colaboradores.filter(c => !c._ativo).length;

  document.getElementById('rhRetencaoKpis').innerHTML = `
    <div class="card-resumo"><div class="rotulo">Turnover ${anoAtual}</div><div class="valor">${turnoverPorAno[turnoverPorAno.length - 1] || 0}%</div></div>
    <div class="card-resumo"><div class="rotulo">Desligamentos ${anoAtual}</div><div class="valor">${desligamentosAno}</div></div>
    <div class="card-resumo"><div class="rotulo">Desligamentos ${anoAtual - 1}</div><div class="valor">${desligamentosAnoAnterior}</div></div>
    <div class="card-resumo"><div class="rotulo">Total desligados (histórico)</div><div class="valor">${totalDesligadosHistorico}</div></div>
  `;

  if (chTurnoverAno) chTurnoverAno.destroy();
  chTurnoverAno = new Chart(document.getElementById('chTurnoverAno'), {
    type: 'bar',
    data: {
      labels: listaAnos,
      datasets: [{ data: turnoverPorAno, backgroundColor: '#E8410A' }]
    },
    options: opcoesGraficoBase(false)
  });

  // Retenção por período (30/60/90/180/365 dias)
  const hoje = new Date();
  const periodos = [
    { dias: 30, rotulo: '30 dias' },
    { dias: 60, rotulo: '60 dias' },
    { dias: 90, rotulo: '90 dias' },
    { dias: 180, rotulo: '180 dias' },
    { dias: 365, rotulo: '1 ano' }
  ];

  const htmlPeriodos = periodos.map(p => {
    let cohort = 0;
    let retidos = 0;

    colaboradores.forEach(c => {
      const admissao = rhParseData(c['Admissão']);
      if (!admissao) return;
      const diasDesdeAdmissao = rhDiasEntre(admissao, hoje);
      if (diasDesdeAdmissao < p.dias) return; // ainda não completou o período, não entra na coorte

      cohort++;
      if (c._ativo) {
        retidos++;
      } else {
        const desligamento = rhParseData(c['Data de Desligamento']);
        if (desligamento && rhDiasEntre(admissao, desligamento) >= p.dias) retidos++;
      }
    });

    const percentual = cohort ? ((retidos / cohort) * 100).toFixed(1) : '—';
    return `
      <div class="ret-card">
        <div class="ret-titulo">${p.rotulo}</div>
        <div class="ret-valor">${percentual}${cohort ? '%' : ''}</div>
        <div class="ret-sub">${retidos}/${cohort} contratados</div>
      </div>
    `;
  }).join('');

  document.getElementById('rhRetencaoPeriodo').innerHTML = htmlPeriodos;
}

// ------------------------- LISTA DE PESSOAS -------------------------

function alternarSomenteAtivosRh() {
  rhListaSomenteAtivos = !rhListaSomenteAtivos;
  document.getElementById('btnToggleAtivosRh').textContent = rhListaSomenteAtivos ? 'Ver todos' : 'Ver somente ativos';
  renderizarListaRh();
}

function renderizarListaRh() {
  if (!rhColaboradores) return;

  const busca = document.getElementById('rhListaBusca').value.trim().toLowerCase();

  rhListaFiltrados = rhColaboradores.filter(c => {
    if (rhListaSomenteAtivos && !c._ativo) return false;
    if (busca && !(c.Nome || '').toLowerCase().includes(busca)) return false;
    return true;
  });

  rhListaPagina = 1;
  renderizarTabelaListaRh();
}

function renderizarTabelaListaRh() {
  const corpo = document.getElementById('rhListaCorpo');
  document.getElementById('rhListaVazia').hidden = rhListaFiltrados.length !== 0;

  const inicio = (rhListaPagina - 1) * RH_LISTA_POR_PAGINA;
  const pagina = rhListaFiltrados.slice(inicio, inicio + RH_LISTA_POR_PAGINA);

  corpo.innerHTML = pagina.map(c => `
    <tr>
      <td>${escapeHtml(c.Nome || '')}</td>
      <td>${escapeHtml(c.Unidade || '')}</td>
      <td>${escapeHtml(c.Departamento || '')}</td>
      <td>${escapeHtml(c.Cargo || '')}</td>
      <td>${escapeHtml(c['Situação'] || '')}</td>
      <td>${c._admissaoFmt || ''}</td>
      <td>${c._desligamentoFmt || ''}</td>
      <td>${c._tempoAnos !== null && c._tempoAnos !== undefined ? c._tempoAnos + ' anos' : c._faixaTempo}</td>
      <td>${escapeHtml(c.Sexo || '')}</td>
      <td>${escapeHtml(c._geracao || '')}</td>
    </tr>
  `).join('');

  renderizarPaginacaoListaRh();
}

function renderizarPaginacaoListaRh() {
  const totalPaginas = Math.max(1, Math.ceil(rhListaFiltrados.length / RH_LISTA_POR_PAGINA));
  const el = document.getElementById('rhListaPaginacao');

  let html = `<button ${rhListaPagina === 1 ? 'disabled' : ''} onclick="mudarPaginaListaRh(${rhListaPagina - 1})">‹</button>`;

  for (let p = 1; p <= totalPaginas; p++) {
    if (p === 1 || p === totalPaginas || Math.abs(p - rhListaPagina) <= 1) {
      html += `<button class="${p === rhListaPagina ? 'ativo' : ''}" onclick="mudarPaginaListaRh(${p})">${p}</button>`;
    } else if (Math.abs(p - rhListaPagina) === 2) {
      html += `<span>…</span>`;
    }
  }

  html += `<button ${rhListaPagina === totalPaginas ? 'disabled' : ''} onclick="mudarPaginaListaRh(${rhListaPagina + 1})">›</button>`;
  el.innerHTML = html;
}

function mudarPaginaListaRh(p) {
  const totalPaginas = Math.max(1, Math.ceil(rhListaFiltrados.length / RH_LISTA_POR_PAGINA));
  if (p < 1 || p > totalPaginas) return;
  rhListaPagina = p;
  renderizarTabelaListaRh();
}

// ------------------------- TREINAMENTOS -------------------------

function renderizarTreinamentosRh() {
  const cursos = rhCursos || [];

  document.getElementById('rhTreinoKpis').innerHTML = cursosVazio(cursos)
    ? '<p class="vazio">Nenhum curso registrado ainda na planilha de cursos.</p>'
    : '';

  if (cursosVazio(cursos)) {
    ['chTreinoArea', 'chTreinoCertificado', 'chTreinoDepto', 'chTreinoNota', 'chTreinoEvolucao'].forEach(id => {
      const c = { chTreinoArea, chTreinoCertificado, chTreinoDepto, chTreinoNota, chTreinoEvolucao }[id];
      if (c) c.destroy();
    });
    document.getElementById('rhTreinoTop').innerHTML = '';
    return;
  }

  // KPIs
  const totalCursos = cursos.length;
  const notas = cursos.map(c => Number(c['Nota obtida'])).filter(n => !isNaN(n));
  const notaMedia = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : '—';
  const comCertificado = cursos.filter(c => (c['Certificado gerado'] || '').toString().trim().toLowerCase() === 'sim').length;
  const taxaCertificado = totalCursos ? ((comCertificado / totalCursos) * 100).toFixed(0) : 0;
  const colaboradoresUnicos = new Set(cursos.map(c => (c['Nome do colaborador'] || '').trim()).filter(Boolean)).size;

  document.getElementById('rhTreinoKpis').innerHTML = `
    <div class="card-resumo"><div class="rotulo">Cursos concluídos</div><div class="valor">${totalCursos}</div></div>
    <div class="card-resumo"><div class="rotulo">Nota média geral</div><div class="valor">${notaMedia}</div></div>
    <div class="card-resumo"><div class="rotulo">Taxa de certificado emitido</div><div class="valor">${taxaCertificado}%</div></div>
    <div class="card-resumo"><div class="rotulo">Colaboradores treinados</div><div class="valor">${colaboradoresUnicos}</div></div>
  `;

  // Cursos por área
  renderizarBarraContagem('chTreinoArea', chTreinoArea, contarPorCampo(cursos, 'Área do curso'), r => (chTreinoArea = r));

  // Certificado emitido
  const porCertificado = contarPorCampo(cursos, 'Certificado gerado');
  if (chTreinoCertificado) chTreinoCertificado.destroy();
  chTreinoCertificado = new Chart(document.getElementById('chTreinoCertificado'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(porCertificado),
      datasets: [{ data: Object.values(porCertificado), backgroundColor: coresGrafico(Object.keys(porCertificado).length) }]
    },
    options: opcoesGraficoBase(true)
  });

  // Cursos por departamento
  renderizarBarraContagem('chTreinoDepto', chTreinoDepto, contarPorCampo(cursos, 'Departamento do colaborador'), r => (chTreinoDepto = r));

  // Nota média por curso (top 15 cursos com mais realizações)
  const porCurso = {};
  cursos.forEach(c => {
    const nome = (c['Nome do curso'] || 'Não informado').toString().trim();
    const nota = Number(c['Nota obtida']);
    if (!porCurso[nome]) porCurso[nome] = { soma: 0, qtd: 0, contagem: 0 };
    porCurso[nome].contagem++;
    if (!isNaN(nota)) {
      porCurso[nome].soma += nota;
      porCurso[nome].qtd++;
    }
  });
  const cursosTop = Object.entries(porCurso)
    .sort((a, b) => b[1].contagem - a[1].contagem)
    .slice(0, 15)
    .map(([nome, dados]) => [nome, dados.qtd ? Number((dados.soma / dados.qtd).toFixed(1)) : 0]);

  if (chTreinoNota) chTreinoNota.destroy();
  chTreinoNota = new Chart(document.getElementById('chTreinoNota'), {
    type: 'bar',
    data: {
      labels: cursosTop.map(x => x[0]),
      datasets: [{ data: cursosTop.map(x => x[1]), backgroundColor: coresGrafico(cursosTop.length) }]
    },
    options: Object.assign({}, opcoesGraficoBase(false), { indexAxis: 'y', scales: { x: { beginAtZero: true, max: 10 } } })
  });

  // Evolução por mês
  const porMes = {};
  cursos.forEach(c => {
    const data = rhParseData(c['Data de realização']);
    if (!data) return;
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    porMes[chave] = (porMes[chave] || 0) + 1;
  });
  const mesesOrdenados = Object.keys(porMes).sort();

  if (chTreinoEvolucao) chTreinoEvolucao.destroy();
  chTreinoEvolucao = new Chart(document.getElementById('chTreinoEvolucao'), {
    type: 'line',
    data: {
      labels: mesesOrdenados,
      datasets: [{ data: mesesOrdenados.map(m => porMes[m]), borderColor: '#1a2744', backgroundColor: 'rgba(26,39,68,0.1)', fill: true, tension: 0.25 }]
    },
    options: opcoesGraficoBase(false)
  });

  // Top 10 colaboradores por cursos concluídos
  const porColaborador = contarPorCampo(cursos, 'Nome do colaborador');
  const top10Colab = Object.entries(porColaborador).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maiorValorColab = top10Colab.length ? top10Colab[0][1] : 1;

  document.getElementById('rhTreinoTop').innerHTML = top10Colab.map(([nome, qtd]) => `
    <div class="bar-row">
      <div class="bar-lbl">${escapeHtml(nome)}</div>
      <div class="bar-bg"><div class="bar-fill" style="width:${(qtd / maiorValorColab) * 100}%"></div></div>
      <div class="bar-v">${qtd}</div>
    </div>
  `).join('');
}

function cursosVazio(cursos) {
  return !cursos || cursos.length === 0;
}

// ------------------------- BUSCA DE COLABORADOR (CURSOS) -------------------------

function buscarCursosColaborador() {
  const busca = document.getElementById('rhTreinoBusca').value.trim().toLowerCase();
  const corpo = document.getElementById('rhTreinoBuscaCorpo');
  const vazio = document.getElementById('rhTreinoBuscaVazia');

  if (!busca) {
    corpo.innerHTML = '';
    vazio.hidden = false;
    vazio.textContent = 'Digite um nome acima para ver os cursos realizados por esse colaborador.';
    return;
  }

  const encontrados = (rhCursos || [])
    .filter(c => (c['Nome do colaborador'] || '').toLowerCase().includes(busca))
    .sort((a, b) => {
      const nomeA = (a['Nome do colaborador'] || '').toLowerCase();
      const nomeB = (b['Nome do colaborador'] || '').toLowerCase();
      if (nomeA !== nomeB) return nomeA.localeCompare(nomeB);
      const da = rhParseData(a['Data de realização']);
      const db = rhParseData(b['Data de realização']);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });

  if (!encontrados.length) {
    corpo.innerHTML = '';
    vazio.hidden = false;
    vazio.textContent = 'Nenhum curso encontrado para esse colaborador.';
    return;
  }

  vazio.hidden = true;
  corpo.innerHTML = encontrados.map(c => `
    <tr>
      <td>${escapeHtml(c['Nome do colaborador'] || '')}</td>
      <td>${escapeHtml(c['Nome do curso'] || '')}</td>
      <td>${escapeHtml(c['Área do curso'] || '')}</td>
      <td>${c['Nota obtida'] ?? ''}</td>
      <td>${c._dataFmt || ''}</td>
      <td>${escapeHtml(c['Certificado gerado'] || '')}</td>
    </tr>
  `).join('');
}

// ------------------------- ESTADO -------------------------

let usuariosOriginais = null;

// ------------------------- CARREGAMENTO -------------------------

async function garantirUsuariosCarregados() {
  if (usuariosOriginais !== null) return;
  await carregarUsuariosAdmin();
}

async function carregarUsuariosAdmin() {
  mostrarCarregando(true);
  try {
    const resp = await chamarBackend({ action: 'adminListarUsuarios' });
    if (!resp.success) {
      alert(resp.message || 'Não foi possível carregar os usuários.');
      usuariosOriginais = usuariosOriginais || [];
      return;
    }
    usuariosOriginais = resp.usuarios || [];
    renderizarTabelaUsuarios();
  } catch (err) {
    alert('Erro de conexão ao carregar usuários.');
  } finally {
    mostrarCarregando(false);
  }
}

// ------------------------- RENDER -------------------------

function renderizarTabelaUsuarios() {
  if (!usuariosOriginais) return;

  const busca = document.getElementById('usuariosBusca').value.trim().toLowerCase();
  const filtrados = usuariosOriginais.filter(u =>
    !busca || (u.Nome || '').toLowerCase().includes(busca) || (u.Email || '').toLowerCase().includes(busca)
  );

  document.getElementById('usuariosVazio').hidden = filtrados.length !== 0;

  document.getElementById('usuariosCorpo').innerHTML = filtrados.map(u => `
    <tr>
      <td>${escapeHtml(u.Nome || '')}</td>
      <td>${escapeHtml(u.Email || '')}</td>
      <td>${escapeHtml(u.NomeSuperior || '')}</td>
      <td>
        <select class="status-select" onchange="mudarPapelUsuario('${escapeHtml(u.Email)}', this.value)">
          ${['Usuario', 'Supervisor', 'Admin'].map(p =>
            `<option value="${p}" ${u.Papel === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </td>
      <td>${u.Ativo ? '<span class="badge badge-ativa">Ativo</span>' : '<span class="badge badge-cancelada">Inativo</span>'}</td>
      <td>${u.DeveTrocarSenha ? 'Sim' : 'Não'}</td>
      <td><button class="botao botao-secundario" onclick="redefinirSenhaDeUsuario('${escapeHtml(u.Email)}')">Redefinir senha</button></td>
    </tr>
  `).join('');
}

// ------------------------- AÇÕES -------------------------

async function mudarPapelUsuario(email, novoPapel) {
  mostrarCarregando(true);
  try {
    const resp = await chamarBackend({ action: 'adminAtualizarPapel', emailAlvo: email, papel: novoPapel });
    if (resp.success) {
      const u = usuariosOriginais.find(x => x.Email === email);
      if (u) u.Papel = novoPapel;
    } else {
      alert(resp.message || 'Não foi possível atualizar o papel.');
      await carregarUsuariosAdmin();
    }
  } catch (err) {
    alert('Erro de conexão ao atualizar papel.');
  } finally {
    mostrarCarregando(false);
  }
}

async function redefinirSenhaDeUsuario(email) {
  if (!confirm(`Redefinir a senha de ${email} para o padrão (123456)? A pessoa vai precisar trocar no próximo acesso.`)) return;

  mostrarCarregando(true);
  try {
    const resp = await chamarBackend({ action: 'adminRedefinirSenhaUsuario', emailAlvo: email });
    if (resp.success) {
      alert('Senha redefinida para 123456. Avise a pessoa para trocar no próximo login.');
      await carregarUsuariosAdmin();
    } else {
      alert(resp.message || 'Não foi possível redefinir a senha.');
    }
  } catch (err) {
    alert('Erro de conexão ao redefinir senha.');
  } finally {
    mostrarCarregando(false);
  }
}

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import api from '../api'
import Modal from '../components/Modal'

const AdminForjadores = () => {
  const [forjadores, setForjadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(null)
  const [resetSenhaModal, setResetSenhaModal] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const { register: regEdit, handleSubmit: submitEdit, reset: resetEdit, formState: { errors: errEdit } } = useForm()
  const { register: regSenha, handleSubmit: submitSenha, reset: resetSenha, formState: { errors: errSenha } } = useForm()

  const fetchForjadores = async () => {
    try {
      const res = await api.get('/admin/forjadores')
      setForjadores(res.data)
    } catch { toast.error('Erro ao carregar forjadores') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchForjadores() }, [])

  const handleEditar = (forjador) => {
    setEditando(forjador)
    resetEdit({ nome: forjador.nome, rp_id: forjador.rp_id, username: forjador.username })
  }

  const onSalvarEdicao = submitEdit(async (data) => {
    setSalvando(true)
    try {
      await api.put(`/admin/forjadores/${editando.id}`, data)
      toast.success('Forjador atualizado!')
      setEditando(null)
      fetchForjadores()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSalvando(false) }
  })

  const onResetSenha = submitSenha(async (data) => {
    setSalvando(true)
    try {
      await api.post(`/admin/forjadores/${resetSenhaModal.id}/reset-senha`, { novaSenha: data.novaSenha })
      toast.success('Senha resetada!')
      setResetSenhaModal(null)
      resetSenha()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao resetar senha')
    } finally { setSalvando(false) }
  })

  const handleDesativar = async (id) => {
    if (!confirm('Desativar este forjador?')) return
    try {
      await api.delete(`/admin/forjadores/${id}`)
      toast.success('Forjador desativado!')
      fetchForjadores()
    } catch { toast.error('Erro ao desativar') }
  }

  const handleReativar = async (id) => {
    try {
      await api.put(`/admin/forjadores/${id}`, { active: true })
      toast.success('Forjador reativado!')
      fetchForjadores()
    } catch { toast.error('Erro ao reativar') }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">👥 Forjadores</h1>
        <p className="text-forge-text-muted text-sm mt-1">{forjadores.length} forjador(es) cadastrado(s)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forge-gold"></div>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">RP ID</th>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Webhook</th>
                  <th className="px-4 py-3 text-left">Cadastrado</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {forjadores.map(f => (
                  <tr key={f.id} className={`table-row ${!f.active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-forge-text-muted text-sm">#{f.id}</td>
                    <td className="px-4 py-3 font-medium">{f.nome}</td>
                    <td className="px-4 py-3 text-forge-text-muted text-sm">{f.rp_id}</td>
                    <td className="px-4 py-3 text-forge-text-muted text-sm">@{f.username}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${f.active ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-red-900/40 text-red-300 border-red-700'}`}>
                        {f.active ? '✅ Ativo' : '❌ Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={f.tem_webhook ? 'text-green-400' : 'text-forge-text-muted'}>
                        {f.tem_webhook ? '✅' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-forge-text-muted text-xs">
                      {new Date(f.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEditar(f)} className="text-blue-400 hover:text-blue-300 text-sm transition-colors" title="Editar">✏️</button>
                        <button onClick={() => { setResetSenhaModal(f); resetSenha() }} className="text-yellow-400 hover:text-yellow-300 text-sm transition-colors" title="Reset senha">🔑</button>
                        {f.active ? (
                          <button onClick={() => handleDesativar(f.id)} className="text-red-400 hover:text-red-300 text-sm transition-colors" title="Desativar">🚫</button>
                        ) : (
                          <button onClick={() => handleReativar(f.id)} className="text-green-400 hover:text-green-300 text-sm transition-colors" title="Reativar">✅</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      <Modal isOpen={!!editando} onClose={() => setEditando(null)} title="✏️ Editar Forjador" size="sm">
        {editando && (
          <form onSubmit={onSalvarEdicao} className="space-y-4">
            <div>
              <label className="label">Nome</label>
              <input {...regEdit('nome', { required: true })} className="input-field" />
              {errEdit.nome && <p className="text-red-400 text-xs mt-1">Obrigatório</p>}
            </div>
            <div>
              <label className="label">RP ID</label>
              <input {...regEdit('rp_id', { required: true })} className="input-field" />
            </div>
            <div>
              <label className="label">Usuário</label>
              <input {...regEdit('username', { required: true })} className="input-field" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditando(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={salvando} className="btn-gold flex-1 justify-center">
                {salvando ? '⏳' : '💾'} Salvar
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Reset Senha */}
      <Modal isOpen={!!resetSenhaModal} onClose={() => setResetSenhaModal(null)} title="🔑 Resetar Senha" size="sm">
        {resetSenhaModal && (
          <form onSubmit={onResetSenha} className="space-y-4">
            <p className="text-forge-text-muted text-sm">Resetar senha de: <strong className="text-forge-gold">{resetSenhaModal.nome}</strong></p>
            <div>
              <label className="label">Nova Senha *</label>
              <input {...regSenha('novaSenha', { required: true, minLength: { value: 8, message: 'Mínimo 8 caracteres' } })} type="password" className="input-field" placeholder="Nova senha" />
              {errSenha.novaSenha && <p className="text-red-400 text-xs mt-1">{errSenha.novaSenha.message || 'Obrigatório'}</p>}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setResetSenhaModal(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={salvando} className="btn-danger flex-1 justify-center">
                {salvando ? '⏳' : '🔑'} Resetar
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

export default AdminForjadores

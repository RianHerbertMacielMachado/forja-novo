import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import api from '../api'
import Modal from '../components/Modal'

const AdminMateriais = () => {
  const [materiais, setMateriais] = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const fetchMateriais = async () => {
    try {
      const res = await api.get('/admin/materiais')
      setMateriais(res.data)
    } catch { toast.error('Erro ao carregar materiais') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchMateriais() }, [])

  const abrirNovo = () => {
    setEditando(null)
    reset({ nome: '' })
    setModalAberto(true)
  }

  const abrirEditar = (mat) => {
    setEditando(mat)
    reset({ nome: mat.nome })
    setModalAberto(true)
  }

  const onSalvar = handleSubmit(async (data) => {
    setSalvando(true)
    try {
      if (editando) {
        await api.put(`/admin/materiais/${editando.id}`, data)
        toast.success('Material atualizado!')
      } else {
        await api.post('/admin/materiais', data)
        toast.success('Material criado!')
      }
      setModalAberto(false)
      fetchMateriais()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar')
    } finally { setSalvando(false) }
  })

  const handleDeletar = async (mat) => {
    if (!confirm(`Deletar o material "${mat.nome}"?`)) return
    try {
      await api.delete(`/admin/materiais/${mat.id}`)
      toast.success('Material deletado!')
      fetchMateriais()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao deletar')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">🪨 Materiais</h1>
          <p className="text-forge-text-muted text-sm mt-1">{materiais.length} material(is)</p>
        </div>
        <button onClick={abrirNovo} className="btn-gold">➕ Novo Material</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forge-gold"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {materiais.map(mat => (
            <div key={mat.id} className="card flex items-center justify-between hover:border-forge-gold/30 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🪨</span>
                <div>
                  <p className="font-medium text-forge-text">{mat.nome}</p>
                  <p className="text-xs text-forge-text-muted">ID: {mat.id}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => abrirEditar(mat)} className="text-blue-400 hover:text-blue-300 text-sm transition-colors">✏️</button>
                <button onClick={() => handleDeletar(mat)} className="text-red-400 hover:text-red-300 text-sm transition-colors">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editando ? `✏️ Editar: ${editando.nome}` : '➕ Novo Material'}
        size="sm"
      >
        <form onSubmit={onSalvar} className="space-y-4">
          <div>
            <label className="label">Nome do Material *</label>
            <input
              {...register('nome', { required: 'Nome é obrigatório' })}
              className="input-field"
              placeholder="Ex: Minério de Ferro"
            />
            {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome.message}</p>}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setModalAberto(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-gold flex-1 justify-center">
              {salvando ? '⏳' : '💾'} {editando ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default AdminMateriais

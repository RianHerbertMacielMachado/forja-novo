import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import api from '../api'
import Modal from '../components/Modal'

const AdminProdutos = () => {
  const [produtos, setProdutos] = useState([])
  const [materiais, setMateriais] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalConfirmDelete, setModalConfirmDelete] = useState(false)
  const [produtoParaDeletar, setProdutoParaDeletar] = useState(null)
  const [deletando, setDeletando] = useState(false)
  const [editando, setEditando] = useState(null)
  const [matProduto, setMatProduto] = useState([])
  const [salvando, setSalvando] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const fetchData = async () => {
    try {
      const [prodRes, matRes] = await Promise.all([
        api.get('/admin/produtos'),
        api.get('/admin/materiais')
      ])
      setProdutos(Array.isArray(prodRes.data) ? prodRes.data : [])
      setMateriais(Array.isArray(matRes.data) ? matRes.data : [])
    } catch { toast.error('Erro ao carregar dados') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const abrirNovo = () => {
    setEditando(null)
    setMatProduto([])
    reset({ nome: '', tipo: 'basico', valor_unitario: '', quantidade_minima: 1, multiplo_quantidade: 1, ativo: true })
    setModalAberto(true)
  }

  const abrirEditar = (produto) => {
    setEditando(produto)
    setMatProduto(produto.materiais || [])
    reset({
      nome: produto.nome,
      tipo: produto.tipo,
      valor_unitario: produto.valor_unitario,
      quantidade_minima: produto.quantidade_minima,
      multiplo_quantidade: produto.multiplo_quantidade,
      ativo: produto.ativo
    })
    setModalAberto(true)
  }

  const confirmarDeletar = (produto) => {
    setProdutoParaDeletar(produto)
    setModalConfirmDelete(true)
  }

  const executarDeletar = async () => {
    if (!produtoParaDeletar) return
    setDeletando(true)
    try {
      const res = await api.delete(`/admin/produtos/${produtoParaDeletar.id}`)
      toast.success(res.data.message || 'Produto deletado!')
      setModalConfirmDelete(false)
      setProdutoParaDeletar(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao deletar produto')
    } finally { setDeletando(false) }
  }

  const onSalvar = handleSubmit(async (data) => {
    setSalvando(true)
    try {
      const payload = {
        ...data,
        valor_unitario: parseFloat(data.valor_unitario),
        quantidade_minima: parseInt(data.quantidade_minima),
        multiplo_quantidade: parseInt(data.multiplo_quantidade),
        ativo: data.ativo === true || data.ativo === 'true',
        materiais: matProduto.filter(m => m.material_id && m.quantidade > 0)
      }

      if (editando) {
        await api.put(`/admin/produtos/${editando.id}`, payload)
        toast.success('Produto atualizado!')
      } else {
        await api.post('/admin/produtos', payload)
        toast.success('Produto criado!')
      }
      setModalAberto(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar produto')
    } finally { setSalvando(false) }
  })

  const toggleAtivo = async (produto) => {
    try {
      await api.put(`/admin/produtos/${produto.id}`, { ativo: !produto.ativo })
      toast.success(produto.ativo ? 'Produto desativado' : 'Produto ativado')
      fetchData()
    } catch { toast.error('Erro ao atualizar') }
  }

  const addMaterial = () => {
    setMatProduto(prev => [...prev, { material_id: '', quantidade: 1 }])
  }

  const updateMaterial = (idx, field, value) => {
    setMatProduto(prev => prev.map((m, i) => i === idx ? { ...m, [field]: field === 'quantidade' ? parseInt(value) : value } : m))
  }

  const removeMaterial = (idx) => {
    setMatProduto(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">⚔️ Produtos</h1>
          <p className="text-forge-text-muted text-sm mt-1">{produtos.length} produto(s)</p>
        </div>
        <button onClick={abrirNovo} className="btn-gold">➕ Novo Produto</button>
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
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Qtd Mín</th>
                  <th className="px-4 py-3 text-center">Múltiplo</th>
                  <th className="px-4 py-3 text-left">Materiais</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => (
                  <tr key={p.id} className={`table-row ${!p.ativo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium">{p.nome}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={p.tipo === 'encantado' ? 'badge-encantado' : p.tipo === 'flechas' ? 'badge-flechas' : 'badge-basico'}>
                        {p.tipo === 'encantado' ? '✨ Encantado' : p.tipo === 'flechas' ? '🏹 Flechas' : '⚔️ Básico'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-forge-gold font-medium">
                      R$ {parseFloat(p.valor_unitario).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-4 py-3 text-center text-forge-text-muted text-sm">{p.quantidade_minima}</td>
                    <td className="px-4 py-3 text-center text-forge-text-muted text-sm">{p.multiplo_quantidade}</td>
                    <td className="px-4 py-3 text-xs text-forge-text-muted">
                      {p.materiais?.length > 0 ? p.materiais.map(m => m.nome).join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${p.ativo ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-red-900/40 text-red-300 border-red-700'}`}>
                        {p.ativo ? '✅ Ativo' : '❌ Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {/* Editar */}
                        <button
                          onClick={() => abrirEditar(p)}
                          title="Editar produto"
                          className="text-purple-400 hover:text-purple-200 transition-colors text-base"
                        >
                          ✏️
                        </button>
                        {/* Ativar/Desativar */}
                        <button
                          onClick={() => toggleAtivo(p)}
                          title={p.ativo ? 'Desativar produto' : 'Ativar produto'}
                          className={`text-base transition-colors ${p.ativo ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}`}
                        >
                          {p.ativo ? '🚫' : '✅'}
                        </button>
                        {/* Deletar */}
                        <button
                          onClick={() => confirmarDeletar(p)}
                          title="Deletar produto permanentemente"
                          className="text-red-500 hover:text-red-300 transition-colors text-base"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editando ? `✏️ Editar: ${editando.nome}` : '➕ Novo Produto'}
        size="lg"
      >
        <form onSubmit={onSalvar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome *</label>
              <input {...register('nome', { required: true })} className="input-field" placeholder="Nome do produto" />
              {errors.nome && <p className="text-red-400 text-xs mt-1">Obrigatório</p>}
              <p className="text-xs text-forge-text-muted mt-1">💡 Imagem: salve em /frontend/public/images/{'{nome}'}.png</p>
            </div>
            <div>
              <label className="label">Tipo *</label>
              <select {...register('tipo', { required: true })} className="select-field">
                <option value="basico">⚔️ Básico</option>
                <option value="encantado">✨ Encantado</option>
                <option value="flechas">🏹 Flechas</option>
              </select>
            </div>
            <div>
              <label className="label">Valor Unitário (R$) *</label>
              <input {...register('valor_unitario', { required: true, min: 0.01 })} type="number" step="0.01" min="0" className="input-field" placeholder="0.00" />
              {errors.valor_unitario && <p className="text-red-400 text-xs mt-1">Obrigatório</p>}
            </div>
            <div>
              <label className="label">Quantidade Mínima</label>
              <input {...register('quantidade_minima')} type="number" min="1" className="input-field" />
            </div>
            <div>
              <label className="label">Múltiplo de Quantidade</label>
              <input {...register('multiplo_quantidade')} type="number" min="1" className="input-field" />
              <p className="text-xs text-forge-text-muted mt-1">Ex: 100 para Flechas</p>
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register('ativo')} className="select-field">
                <option value={true}>✅ Ativo</option>
                <option value={false}>❌ Inativo</option>
              </select>
            </div>
          </div>

          {/* Materiais */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">⚒️ Materiais Necessários</label>
              <button type="button" onClick={addMaterial} className="btn-ghost text-xs py-1 px-2">+ Adicionar</button>
            </div>
            <div className="space-y-2">
              {matProduto.map((mat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={mat.material_id}
                    onChange={e => updateMaterial(idx, 'material_id', e.target.value)}
                    className="select-field flex-1 text-sm py-2"
                  >
                    <option value="">Selecione...</option>
                    {materiais.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  <input
                    type="number" min="1" value={mat.quantidade}
                    onChange={e => updateMaterial(idx, 'quantidade', e.target.value)}
                    className="input-field w-20 text-sm py-2"
                    placeholder="Qtd"
                  />
                  <button type="button" onClick={() => removeMaterial(idx)} className="text-red-400 hover:text-red-300 text-lg font-bold px-1">×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalAberto(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-gold flex-1 justify-center">
              {salvando ? '⏳' : '💾'} {editando ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmação de deleção */}
      <Modal
        isOpen={modalConfirmDelete}
        onClose={() => { setModalConfirmDelete(false); setProdutoParaDeletar(null) }}
        title="🗑️ Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-red-800/50 bg-red-900/20">
            <p className="text-forge-text text-sm">
              Você está prestes a deletar permanentemente o produto:
            </p>
            <p className="text-red-300 font-bold text-lg mt-2">
              {produtoParaDeletar?.nome}
            </p>
            <p className="text-forge-text-muted text-xs mt-2">
              ⚠️ Esta ação não pode ser desfeita. O produto será removido do sistema junto com seus materiais configurados.
            </p>
            <p className="text-forge-text-muted text-xs mt-1">
              Pedidos concluídos que contêm este produto também terão os itens removidos do histórico.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setModalConfirmDelete(false); setProdutoParaDeletar(null) }}
              className="btn-ghost flex-1 justify-center"
              disabled={deletando}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={executarDeletar}
              disabled={deletando}
              className="btn-danger flex-1 justify-center"
            >
              {deletando ? '⏳ Deletando...' : '🗑️ Deletar Permanentemente'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AdminProdutos

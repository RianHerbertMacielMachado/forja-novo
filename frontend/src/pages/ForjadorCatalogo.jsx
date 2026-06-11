import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import ProdutoCard from '../components/ProdutoCard'
import Modal from '../components/Modal'
import { useForm } from 'react-hook-form'
import api from '../api'

const ForjadorCatalogo = () => {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState([])
  const [semDados, setSemDados] = useState(false)
  const [showFinalizarModal, setShowFinalizarModal] = useState(false)
  const [showConfirmacao, setShowConfirmacao] = useState(false)
  const [pedidoCriado, setPedidoCriado] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  useEffect(() => {
    api.get('/forjador/produtos')
      .then(res => setProdutos(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Erro ao carregar produtos'))
      .finally(() => setLoading(false))
  }, [])

  const addItem = (produto, quantidade) => {
    setCarrinho(prev => {
      const existing = prev.find(i => i.produto_id === produto.id)
      if (existing) {
        return prev.map(i => i.produto_id === produto.id
          ? { ...i, quantidade: i.quantidade + quantidade } : i)
      }
      return [...prev, {
        produto_id: produto.id,
        nome: produto.nome,
        valor_unitario: parseFloat(produto.valor_unitario),
        quantidade,
        multiplo_quantidade: produto.multiplo_quantidade || 1
      }]
    })
    toast.success(`${produto.nome} adicionado!`)
  }

  const removerItem = (produtoId) => setCarrinho(prev => prev.filter(i => i.produto_id !== produtoId))
  const total = carrinho.reduce((s, i) => s + i.valor_unitario * i.quantidade, 0)

  const onFinalizar = handleSubmit(async (data) => {
    if (carrinho.length === 0) { toast.warning('Adicione produtos'); return }
    setEnviando(true)
    try {
      const res = await api.post('/forjador/pedidos', {
        clienteNome: semDados ? null : data.clienteNome,
        clientePassaporte: semDados ? null : data.clientePassaporte,
        clienteDiscordTag: data.clienteDiscordTag || null,
        itens: carrinho.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
        semDadosCliente: semDados
      })
      setPedidoCriado(res.data)
      setShowFinalizarModal(false)
      setShowConfirmacao(true)
      setCarrinho([])
      reset()
      setSemDados(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar pedido')
    } finally {
      setEnviando(false)
    }
  })

  const produtosFiltrados = produtos.filter(p => {
    const matchTipo = filtroTipo === 'todos' || p.tipo === filtroTipo
    const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase())
    return matchTipo && matchBusca
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">🏪 Catálogo</h1>
          <p className="text-forge-text-muted text-sm">Registro manual de pedidos</p>
        </div>
        {carrinho.length > 0 && (
          <button onClick={() => setShowFinalizarModal(true)} className="btn-gold">
            🛒 Finalizar ({carrinho.length})
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <input
          type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar..." className="input-field max-w-xs"
        />
        {['todos', 'basico', 'encantado', 'flechas'].map(tipo => (
          <button key={tipo} onClick={() => setFiltroTipo(tipo)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              filtroTipo === tipo ? 'bg-forge-gold text-forge-bg' : 'bg-forge-panel border border-forge-border text-forge-text-muted hover:text-forge-text'
            }`}>
            {tipo === 'todos' ? 'Todos' : tipo === 'basico' ? '⚔️ Básicos' : tipo === 'encantado' ? '✨ Encantados' : '🏹 Flechas'}
          </button>
        ))}
      </div>

      {/* Carrinho inline */}
      {carrinho.length > 0 && (
        <div className="card mb-6 border-forge-gold/30">
          <h3 className="font-semibold text-forge-gold mb-3">🛒 Carrinho ({carrinho.length} item{carrinho.length > 1 ? 's' : ''})</h3>
          <div className="flex flex-wrap gap-2">
            {carrinho.map(item => (
              <div key={item.produto_id} className="flex items-center gap-2 bg-forge-panel2 border border-forge-border rounded-lg px-3 py-1.5 text-sm">
                <span>{item.nome} ×{item.quantidade}</span>
                <button onClick={() => removerItem(item.produto_id)} className="text-red-400 hover:text-red-300">✕</button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-forge-border">
            <span className="text-forge-gold font-bold text-lg">R$ {total.toFixed(2).replace('.', ',')}</span>
            <button onClick={() => setShowFinalizarModal(true)} className="btn-gold text-sm py-2">
              ✅ Finalizar Pedido
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forge-gold"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {produtosFiltrados.map(produto => (
            <ProdutoCard key={produto.id} produto={produto} onAdd={addItem} />
          ))}
        </div>
      )}

      {/* Modal finalizar */}
      <Modal isOpen={showFinalizarModal} onClose={() => setShowFinalizarModal(false)} title="📦 Finalizar Pedido" size="md">
        <div className="space-y-4">
          {/* Toggle sem dados */}
          <label className="flex items-center gap-3 p-3 bg-forge-panel2 rounded-lg cursor-pointer">
            <input type="checkbox" checked={semDados} onChange={e => setSemDados(e.target.checked)}
              className="w-4 h-4 accent-forge-gold" />
            <span className="text-sm text-forge-text">Pedido sem dados do cliente</span>
          </label>

          <form onSubmit={onFinalizar} className="space-y-3">
            {!semDados && (
              <>
                <div>
                  <label className="label">Nome no RP *</label>
                  <input {...register('clienteNome', { required: !semDados })} className="input-field" placeholder="Nome do cliente" />
                  {errors.clienteNome && <p className="text-red-400 text-xs mt-1">Obrigatório</p>}
                </div>
                <div>
                  <label className="label">Passaporte *</label>
                  <input {...register('clientePassaporte', { required: !semDados })} className="input-field" placeholder="ID do cliente" />
                  {errors.clientePassaporte && <p className="text-red-400 text-xs mt-1">Obrigatório</p>}
                </div>
              </>
            )}
            <div>
              <label className="label">ID do Discord (opcional)</label>
              <input {...register('clienteDiscordTag')} className="input-field" placeholder="Ex: 123456789012345678" />
              <p className="text-xs text-forge-text-muted mt-1">💬 User ID numérico para DMs de status</p>
            </div>
            <div className="bg-forge-panel2 rounded-lg p-3">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-forge-gold">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowFinalizarModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={enviando} className="btn-gold flex-1 justify-center">
                {enviando ? '⏳ Criando...' : '✅ Criar Pedido'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal confirmação */}
      <Modal isOpen={showConfirmacao} onClose={() => setShowConfirmacao(false)} title="✅ Pedido Criado!" size="sm">
        <div className="text-center space-y-4">
          <div className="bg-forge-panel2 border border-forge-gold/50 rounded-xl p-6">
            <p className="text-sm text-forge-text-muted mb-1">Registro ID:</p>
            <p className="font-rajdhani text-4xl font-bold text-forge-gold">{pedidoCriado?.registro_id}</p>
          </div>
          <button onClick={() => setShowConfirmacao(false)} className="btn-gold w-full justify-center">Fechar</button>
        </div>
      </Modal>
    </div>
  )
}

export default ForjadorCatalogo

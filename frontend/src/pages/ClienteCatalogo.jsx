import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import Navbar from '../components/Navbar'
import ProdutoCard from '../components/ProdutoCard'
import Carrinho from '../components/Carrinho'
import Modal from '../components/Modal'
import { useCarrinho } from '../context/CarrinhoContext'
import api from '../api'

const ClienteCatalogo = () => {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [showFinalizarModal, setShowFinalizarModal] = useState(false)
  const [showConfirmacaoModal, setShowConfirmacaoModal] = useState(false)
  const [pedidoCriado, setPedidoCriado] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const { itens, limpar, total } = useCarrinho()

  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const res = await api.get('/cliente/produtos')
        setProdutos(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        toast.error('Erro ao carregar produtos')
      } finally {
        setLoading(false)
      }
    }
    fetchProdutos()
  }, [])

  const produtosFiltrados = produtos.filter(p => {
    const matchTipo = filtroTipo === 'todos' || p.tipo === filtroTipo
    const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase())
    return matchTipo && matchBusca
  })

  const onFinalizar = handleSubmit(async (data) => {
    if (itens.length === 0) {
      toast.warning('Adicione produtos ao carrinho antes de finalizar')
      return
    }
    setEnviando(true)
    try {
      const res = await api.post('/cliente/pedidos', {
        clienteNome: data.clienteNome,
        clientePassaporte: data.clientePassaporte,
        clienteDiscordTag: data.clienteDiscordTag || null,
        itens: itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade }))
      })
      setPedidoCriado(res.data)
      setShowFinalizarModal(false)
      setShowConfirmacaoModal(true)
      limpar()
      reset()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar pedido')
    } finally {
      setEnviando(false)
    }
  })

  return (
    <div className="min-h-screen bg-forge-bg">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-forge-panel via-forge-panel2 to-forge-bg border-b border-forge-border">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="font-rajdhani text-5xl font-bold text-forge-gold mb-3">
            ⚔️ Sistema de Forja
          </h1>
          <p className="text-forge-text-muted text-lg max-w-2xl mx-auto">
            Encomende suas armas e equipamentos forjados à mão pelos melhores ferreiros do reino
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="🔍 Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input-field flex-1"
          />
          <div className="flex gap-2">
            {['todos', 'basico', 'encantado'].map(tipo => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  filtroTipo === tipo
                    ? 'bg-forge-gold text-forge-bg'
                    : 'bg-forge-panel border border-forge-border text-forge-text-muted hover:text-forge-text'
                }`}
              >
                {tipo === 'todos' ? '🏪 Todos' : tipo === 'basico' ? '⚔️ Básicos' : '✨ Encantados'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de produtos */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forge-gold"></div>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">⚔️</p>
            <p className="text-forge-text-muted text-lg">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {produtosFiltrados.map(produto => (
              <ProdutoCard key={produto.id} produto={produto} mostrarMateriais={false} />
            ))}
          </div>
        )}
      </div>

      {/* Carrinho lateral */}
      <Carrinho onFinalizar={() => setShowFinalizarModal(true)} />

      {/* Modal de finalização */}
      <Modal
        isOpen={showFinalizarModal}
        onClose={() => setShowFinalizarModal(false)}
        title="✅ Finalizar Pedido"
        size="md"
      >
        {/* Resumo do carrinho */}
        <div className="bg-forge-panel2 rounded-xl p-4 mb-6 border border-forge-border">
          <h3 className="font-semibold text-forge-text mb-3">📦 Itens do pedido:</h3>
          {itens.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm py-1">
              <span className="text-forge-text">{item.nome} × {item.quantidade}</span>
              <span className="text-forge-gold font-medium">
                R$ {(item.valor_unitario * item.quantidade).toFixed(2).replace('.', ',')}
              </span>
            </div>
          ))}
          <div className="border-t border-forge-border mt-3 pt-3 flex justify-between font-bold">
            <span>Total:</span>
            <span className="text-forge-gold text-lg">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <form onSubmit={onFinalizar} className="space-y-4">
          <div>
            <label className="label">Nome no RP *</label>
            <input
              {...register('clienteNome', { required: 'Nome é obrigatório' })}
              className="input-field"
              placeholder="Seu personagem no RP"
            />
            {errors.clienteNome && <p className="text-red-400 text-xs mt-1">{errors.clienteNome.message}</p>}
          </div>

          <div>
            <label className="label">ID/Passaporte *</label>
            <input
              {...register('clientePassaporte', { required: 'Passaporte é obrigatório' })}
              className="input-field"
              placeholder="Seu ID ou número de passaporte"
            />
            {errors.clientePassaporte && <p className="text-red-400 text-xs mt-1">{errors.clientePassaporte.message}</p>}
          </div>

          <div>
            <label className="label">
              ID do Discord <span className="text-forge-text-muted">(opcional)</span>
            </label>
            <input
              {...register('clienteDiscordTag')}
              className="input-field"
              placeholder="Ex: 123456789012345678"
            />
            <p className="text-xs text-forge-text-muted mt-1">
              💬 Preencha com seu <strong className="text-forge-gold">User ID numérico</strong> para receber notificações de status no Discord.
              Para obter: abra o Discord → Configurações → Avançado → ative <em>Modo Desenvolvedor</em> → clique com botão direito no seu perfil → <em>Copiar ID do usuário</em>.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowFinalizarModal(false)} className="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className="btn-gold flex-1 justify-center">
              {enviando ? (
                <><span className="animate-spin">⏳</span> Processando...</>
              ) : (
                '✅ Confirmar Pedido'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmação */}
      <Modal
        isOpen={showConfirmacaoModal}
        onClose={() => setShowConfirmacaoModal(false)}
        title="🎉 Pedido Realizado!"
        size="sm"
      >
        <div className="text-center space-y-4">
          <div className="text-5xl">⚔️</div>
          <p className="text-forge-text">Seu pedido foi recebido com sucesso!</p>

          <div className="bg-forge-panel2 border border-forge-gold/50 rounded-xl p-6">
            <p className="text-sm text-forge-text-muted mb-2">Seu Registro ID:</p>
            <p className="font-rajdhani text-4xl font-bold text-forge-gold">{pedidoCriado?.registro_id}</p>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
            <p className="text-sm text-yellow-300">
              ⚠️ <strong>Guarde este ID!</strong> Você precisará dele para consultar o status do seu pedido.
            </p>
          </div>

          <p className="text-sm text-forge-text-muted">
            Total: <span className="text-forge-gold font-bold">R$ {parseFloat(pedidoCriado?.total || 0).toFixed(2).replace('.', ',')}</span>
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(pedidoCriado?.registro_id || '')
                toast.success('ID copiado!')
              }}
              className="btn-ghost flex-1 justify-center"
            >
              📋 Copiar ID
            </button>
            <button onClick={() => setShowConfirmacaoModal(false)} className="btn-gold flex-1 justify-center">
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ClienteCatalogo

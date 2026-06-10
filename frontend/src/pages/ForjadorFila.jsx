import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import api from '../api'
import StatusBadge from '../components/StatusBadge'

const ForjadorFila = () => {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [puxando, setPuxando] = useState(null)

  const fetchFila = useCallback(async () => {
    try {
      const res = await api.get('/forjador/fila')
      setPedidos(res.data)
    } catch (err) {
      toast.error('Erro ao carregar fila')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFila()
    const interval = setInterval(fetchFila, 30000)
    return () => clearInterval(interval)
  }, [fetchFila])

  const puxarPedido = async (pedidoId) => {
    setPuxando(pedidoId)
    try {
      await api.post(`/forjador/fila/${pedidoId}/puxar`)
      toast.success('Pedido puxado com sucesso!')
      setPedidos(prev => prev.filter(p => p.id !== pedidoId))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao puxar pedido')
    } finally {
      setPuxando(null)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">📋 Fila de Pedidos</h1>
          <p className="text-forge-text-muted text-sm mt-1">Pedidos aguardando atendimento</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-forge-panel2 border border-forge-border px-3 py-1.5 rounded-lg text-sm text-forge-text-muted">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
          </span>
          <button onClick={fetchFila} className="btn-ghost text-sm py-1.5">
            🔄 Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forge-gold"></div>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-20 card">
          <p className="text-5xl mb-4">🎉</p>
          <h2 className="font-rajdhani text-2xl font-bold text-forge-gold mb-2">Fila Vazia!</h2>
          <p className="text-forge-text-muted">Nenhum pedido aguardando atendimento no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {pedidos.map(pedido => (
            <div key={pedido.id} className="card border-l-4 border-l-yellow-500 animate-fade-in">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-rajdhani text-xl font-bold text-forge-gold">{pedido.registro_id}</p>
                  <p className="text-xs text-forge-text-muted">
                    {new Date(pedido.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <StatusBadge status="na_fila" />
              </div>

              {/* Cliente */}
              <div className="bg-forge-panel2 rounded-lg p-3 mb-4 space-y-1">
                <p className="text-sm">
                  <span className="text-forge-text-muted">👤 </span>
                  <span className="text-forge-text">{pedido.cliente_nome || 'Não informado'}</span>
                </p>
                <p className="text-sm">
                  <span className="text-forge-text-muted">🪪 </span>
                  <span className="text-forge-text">{pedido.cliente_passaporte || 'N/I'}</span>
                </p>
                {pedido.cliente_discord_tag && (
                  <p className="text-sm">
                    <span className="text-forge-text-muted">💬 </span>
                    <span className="text-blue-400">{pedido.cliente_discord_tag}</span>
                  </p>
                )}
              </div>

              {/* Itens */}
              {pedido.itens && (
                <div className="mb-4">
                  <p className="text-xs text-forge-text-muted mb-2">🛒 Itens:</p>
                  <div className="space-y-1">
                    {pedido.itens.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-forge-text">{item.produto_nome}</span>
                        <span className="text-forge-gold font-bold">×{item.quantidade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total e botão */}
              <div className="flex items-center justify-between pt-3 border-t border-forge-border">
                <span className="font-rajdhani text-forge-gold font-bold text-xl">
                  R$ {parseFloat(pedido.total).toFixed(2).replace('.', ',')}
                </span>
                <button
                  onClick={() => puxarPedido(pedido.id)}
                  disabled={puxando === pedido.id}
                  className="btn-purple text-sm py-2"
                >
                  {puxando === pedido.id ? (
                    <><span className="animate-spin">⏳</span> Puxando...</>
                  ) : (
                    '🔨 Puxar Pedido'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ForjadorFila

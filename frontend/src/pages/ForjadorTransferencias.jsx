import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import api from '../api'
import StatusBadge from '../components/StatusBadge'
import MaterialBadge from '../components/MaterialBadge'

const ForjadorTransferencias = () => {
  const [transferencias, setTransferencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [respondendo, setRespondendo] = useState(null)

  const fetchTransferencias = useCallback(async () => {
    try {
      const res = await api.get('/forjador/transferencias')
      setTransferencias(res.data)
    } catch (err) {
      toast.error('Erro ao carregar transferências')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransferencias()
    const interval = setInterval(fetchTransferencias, 30000)
    return () => clearInterval(interval)
  }, [fetchTransferencias])

  const responder = async (transferenciaId, acao) => {
    setRespondendo(transferenciaId + acao)
    try {
      await api.post(`/forjador/transferencias/${transferenciaId}/responder`, { acao })
      toast.success(acao === 'aceitar' ? 'Pedido aceito!' : 'Pedido recusado')
      setTransferencias(prev => prev.filter(t => t.id !== transferenciaId))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao responder')
    } finally {
      setRespondendo(null)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">🔄 Transferências</h1>
          <p className="text-forge-text-muted text-sm">Pedidos aguardando sua aceitação</p>
        </div>
        <div className="flex items-center gap-3">
          {transferencias.length > 0 && (
            <span className="bg-forge-gold text-forge-bg text-xs font-bold rounded-full px-2.5 py-1">
              {transferencias.length} pendente{transferencias.length !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={fetchTransferencias} className="btn-ghost text-sm py-1.5">
            🔄 Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forge-gold"></div>
        </div>
      ) : transferencias.length === 0 ? (
        <div className="text-center py-20 card">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="font-rajdhani text-2xl font-bold text-forge-gold mb-2">Nenhuma Transferência</h2>
          <p className="text-forge-text-muted">Não há pedidos aguardando sua aceitação.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {transferencias.map(t => (
            <div key={t.id} className="card border-l-4 border-l-blue-500 animate-fade-in">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-rajdhani text-xl font-bold text-forge-gold">{t.registro_id}</p>
                  <p className="text-sm text-blue-400">De: {t.forjador_origem_nome}</p>
                  <p className="text-xs text-forge-text-muted">
                    {new Date(t.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <StatusBadge status={t.pedido_status} />
              </div>

              {/* Dados cliente */}
              <div className="bg-forge-panel2 rounded-lg p-3 mb-4 space-y-1">
                <p className="text-sm">👤 <span className="text-forge-text">{t.cliente_nome || 'Não informado'}</span></p>
                <p className="text-sm">🪪 <span className="text-forge-text">{t.cliente_passaporte || 'N/I'}</span></p>
              </div>

              {/* Itens */}
              {t.itens && (
                <div className="mb-4">
                  <p className="text-xs text-forge-text-muted mb-2">🛒 Itens:</p>
                  {t.itens.filter(i => i.produto_nome).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-0.5">
                      <span className="text-forge-text">{item.produto_nome}</span>
                      <span className="text-forge-gold font-bold">×{item.quantidade}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between mb-4 pt-3 border-t border-forge-border">
                <span className="text-forge-text-muted text-sm">Total:</span>
                <span className="font-rajdhani text-forge-gold font-bold text-xl">
                  R$ {parseFloat(t.total).toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Ações */}
              <div className="flex gap-3">
                <button
                  onClick={() => responder(t.id, 'recusar')}
                  disabled={!!respondendo}
                  className="btn-danger flex-1 justify-center text-sm py-2"
                >
                  {respondendo === t.id + 'recusar' ? '⏳' : '❌'} Recusar
                </button>
                <button
                  onClick={() => responder(t.id, 'aceitar')}
                  disabled={!!respondendo}
                  className="btn-primary flex-1 justify-center text-sm py-2"
                >
                  {respondendo === t.id + 'aceitar' ? '⏳' : '✅'} Aceitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ForjadorTransferencias

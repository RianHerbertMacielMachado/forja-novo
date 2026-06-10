import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import api from '../api'
import PedidoCard from '../components/PedidoCard'
import Modal from '../components/Modal'

const ForjadorMeusPedidos = () => {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [forjadores, setForjadores] = useState([])
  const [pedidoTransferir, setPedidoTransferir] = useState(null)
  const [forjadorDestinoId, setForjadorDestinoId] = useState('')
  const [transferindo, setTransferindo] = useState(false)

  const fetchPedidos = useCallback(async () => {
    try {
      const res = await api.get('/forjador/meus-pedidos')
      setPedidos(res.data)
    } catch (err) {
      toast.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPedidos()
    api.get('/forjador/forjadores').then(res => setForjadores(res.data)).catch(() => {})
    const interval = setInterval(fetchPedidos, 60000)
    return () => clearInterval(interval)
  }, [fetchPedidos])

  const handleTransferir = async () => {
    if (!forjadorDestinoId) { toast.warning('Selecione um forjador'); return }
    setTransferindo(true)
    try {
      await api.post(`/forjador/pedidos/${pedidoTransferir.id}/transferir`, {
        forjadorDestinoId: parseInt(forjadorDestinoId)
      })
      toast.success('Transferência solicitada!')
      setPedidoTransferir(null)
      setForjadorDestinoId('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao transferir')
    } finally {
      setTransferindo(false)
    }
  }

  const statusOrder = { na_fila: 0, coletando_materiais: 1, em_producao: 2, concluido: 3 }
  const pedidosOrdenados = [...pedidos].sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">🔨 Meus Pedidos</h1>
          <p className="text-forge-text-muted text-sm">Pedidos em atendimento</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-forge-panel2 border border-forge-border px-3 py-1.5 rounded-lg text-sm text-forge-text-muted">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
          </span>
          <button onClick={fetchPedidos} className="btn-ghost text-sm py-1.5">
            🔄 Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forge-gold"></div>
        </div>
      ) : pedidosOrdenados.length === 0 ? (
        <div className="text-center py-20 card">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="font-rajdhani text-2xl font-bold text-forge-gold mb-2">Sem Pedidos Ativos</h2>
          <p className="text-forge-text-muted">Você não tem pedidos em andamento no momento.</p>
          <p className="text-forge-text-muted text-sm mt-2">Vá até a Fila para puxar novos pedidos!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pedidosOrdenados.map(pedido => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              forjadorView={true}
              onStatusChange={(id, status) => {
                setPedidos(prev => prev.filter(p => {
                  if (p.id === id) return status !== 'concluido'
                  return true
                }))
              }}
              onTransferir={(p) => {
                setPedidoTransferir(p)
                setForjadorDestinoId('')
              }}
            />
          ))}
        </div>
      )}

      {/* Modal de transferência */}
      <Modal
        isOpen={!!pedidoTransferir}
        onClose={() => setPedidoTransferir(null)}
        title="🔄 Transferir Pedido"
        size="sm"
      >
        {pedidoTransferir && (
          <div className="space-y-4">
            <div className="bg-forge-panel2 rounded-lg p-3">
              <p className="text-sm text-forge-text-muted">Pedido:</p>
              <p className="font-rajdhani text-xl font-bold text-forge-gold">{pedidoTransferir.registro_id}</p>
            </div>

            <div>
              <label className="label">Selecionar Forjador Destino</label>
              <select
                value={forjadorDestinoId}
                onChange={e => setForjadorDestinoId(e.target.value)}
                className="select-field"
              >
                <option value="">Selecione um forjador...</option>
                {forjadores.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nome} (ID: {f.rp_id})
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-forge-text-muted bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
              ⚠️ O pedido permanecerá em seus ativos até que o forjador destino aceite a transferência.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setPedidoTransferir(null)} className="btn-ghost flex-1 justify-center">
                Cancelar
              </button>
              <button
                onClick={handleTransferir}
                disabled={!forjadorDestinoId || transferindo}
                className="btn-primary flex-1 justify-center"
              >
                {transferindo ? '⏳ Enviando...' : '🔄 Solicitar Transferência'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ForjadorMeusPedidos

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import api from '../api'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'

const AdminPedidos = () => {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pedidoDetalhes, setPedidoDetalhes] = useState(null)
  const [forjadores, setForjadores] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filtros, setFiltros] = useState({ status: '', forjador_id: '', registro_id: '', passaporte: '' })

  const fetchPedidos = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 20, ...filtros }
      const res = await api.get('/admin/pedidos', { params })
      setPedidos(Array.isArray(res.data.pedidos) ? res.data.pedidos : [])
      setPagination({ page: res.data.page || 1, pages: res.data.pages || 1, total: res.data.total || 0 })
    } catch { toast.error('Erro ao buscar pedidos') }
    finally { setLoading(false) }
  }, [filtros])

  useEffect(() => { fetchPedidos() }, [fetchPedidos])
  useEffect(() => { api.get('/admin/forjadores').then(r => setForjadores(Array.isArray(r.data) ? r.data : [])).catch(() => {}) }, [])

  const verDetalhes = async (id) => {
    try {
      const res = await api.get(`/admin/pedidos/${id}`)
      setPedidoDetalhes(res.data)
    } catch { toast.error('Erro ao buscar detalhes') }
  }

  const statusOptions = [
    { value: '', label: 'Todos os Status' },
    { value: 'na_fila', label: '🟡 Na Fila' },
    { value: 'coletando_materiais', label: '🔵 Coletando' },
    { value: 'em_producao', label: '🔧 Em Produção' },
    { value: 'concluido', label: '✅ Concluído' }
  ]

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">📦 Pedidos</h1>
          <p className="text-forge-text-muted text-sm mt-1">{pagination.total} pedido(s) encontrado(s)</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={filtros.status} onChange={e => setFiltros(prev => ({ ...prev, status: e.target.value }))} className="select-field text-sm">
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filtros.forjador_id} onChange={e => setFiltros(prev => ({ ...prev, forjador_id: e.target.value }))} className="select-field text-sm">
            <option value="">Todos os Forjadores</option>
            {forjadores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          <input
            type="text"
            value={filtros.registro_id}
            onChange={e => setFiltros(prev => ({ ...prev, registro_id: e.target.value }))}
            placeholder="Buscar por ID..."
            className="input-field text-sm py-2"
          />
          <input
            type="text"
            value={filtros.passaporte}
            onChange={e => setFiltros(prev => ({ ...prev, passaporte: e.target.value }))}
            placeholder="Buscar passaporte..."
            className="input-field text-sm py-2"
          />
        </div>
      </div>

      {/* Tabela */}
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
                  <th className="px-4 py-3 text-left">Registro</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Passaporte</th>
                  <th className="px-4 py-3 text-left">Forjador</th>
                  <th className="px-4 py-3 text-left">Itens</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Data</th>
                  <th className="px-4 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map(p => (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 py-3 font-rajdhani font-bold text-forge-gold">{p.registro_id}</td>
                    <td className="px-4 py-3 text-sm">{p.cliente_nome || 'N/I'}</td>
                    <td className="px-4 py-3 text-sm text-forge-text-muted">{p.cliente_passaporte || '—'}</td>
                    <td className="px-4 py-3 text-sm text-forge-text-muted">{p.forjador_nome || '—'}</td>
                    <td className="px-4 py-3 text-xs text-forge-text-muted">
                      {p.itens ? p.itens.slice(0, 2).map(i => `${i.produto_nome} ×${i.quantidade}`).join(', ') + (p.itens.length > 2 ? '...' : '') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-right text-forge-gold font-medium">
                      R$ {parseFloat(p.total).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-forge-text-muted">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => verDetalhes(p.id)} className="text-blue-400 hover:text-blue-300 text-sm">🔍</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-forge-border">
              <p className="text-sm text-forge-text-muted">
                Página {pagination.page} de {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchPedidos(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="btn-ghost text-xs py-1 px-3"
                >← Anterior</button>
                <button
                  onClick={() => fetchPedidos(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="btn-ghost text-xs py-1 px-3"
                >Próxima →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal detalhes */}
      <Modal isOpen={!!pedidoDetalhes} onClose={() => setPedidoDetalhes(null)} title={`📦 Pedido ${pedidoDetalhes?.registro_id}`} size="lg">
        {pedidoDetalhes && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="label">Cliente</p>
                <p className="text-forge-text">{pedidoDetalhes.cliente_nome || 'N/I'}</p>
              </div>
              <div>
                <p className="label">Passaporte</p>
                <p className="text-forge-text">{pedidoDetalhes.cliente_passaporte || 'N/I'}</p>
              </div>
              <div>
                <p className="label">Discord</p>
                <p className="text-forge-text">{pedidoDetalhes.cliente_discord_tag || '—'}</p>
              </div>
              <div>
                <p className="label">Forjador</p>
                <p className="text-forge-text">{pedidoDetalhes.forjador_nome || '—'}</p>
              </div>
              <div>
                <p className="label">Status</p>
                <StatusBadge status={pedidoDetalhes.status} />
              </div>
              <div>
                <p className="label">Total</p>
                <p className="text-forge-gold font-bold">R$ {parseFloat(pedidoDetalhes.total).toFixed(2).replace('.', ',')}</p>
              </div>
            </div>

            {pedidoDetalhes.itens && (
              <div>
                <p className="font-semibold text-forge-text mb-2">🛒 Itens:</p>
                {pedidoDetalhes.itens.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1 border-b border-forge-border">
                    <span>{item.produto_nome}</span>
                    <span className="text-forge-gold">×{item.quantidade} — R$ {(item.valor_unitario * item.quantidade).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>
            )}

            {pedidoDetalhes.logs && pedidoDetalhes.logs.length > 0 && (
              <div>
                <p className="font-semibold text-forge-text mb-2">📜 Histórico:</p>
                {pedidoDetalhes.logs.map((log, idx) => (
                  <div key={idx} className="text-sm py-1.5 border-b border-forge-border/50">
                    <p className="text-forge-text">{log.descricao}</p>
                    <p className="text-forge-text-muted text-xs">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AdminPedidos

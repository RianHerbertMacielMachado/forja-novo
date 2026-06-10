import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import api from '../api'

const AdminLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filtros, setFiltros] = useState({ tipo: '' })
  const [exportando, setExportando] = useState(false)

  const tiposLog = [
    'pedido_criado', 'pedido_puxado', 'status_atualizado', 'transferencia_solicitada',
    'transferencia_aceita', 'transferencia_recusada', 'login', 'login_falhou',
    'forjador_cadastrado', 'token_gerado', 'configuracao_atualizada',
    'produto_criado', 'produto_atualizado', 'material_criado',
    'admin_login', 'admin_login_falhou', 'senha_alterada', 'admin_senha_alterada',
    'forjador_atualizado', 'forjador_desativado', 'senha_resetada'
  ]

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await api.get('/admin/logs', { params: { page, limit: 50, ...filtros } })
      setLogs(Array.isArray(res.data.logs) ? res.data.logs : [])
      setPagination({ page: res.data.page || 1, pages: res.data.pages || 1, total: res.data.total || 0 })
    } catch { toast.error('Erro ao carregar logs') }
    finally { setLoading(false) }
  }, [filtros])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const exportarCSV = async () => {
    setExportando(true)
    try {
      const token = localStorage.getItem('admin_token')
      const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
      const res = await fetch(`${baseURL}/admin/logs/export`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logs-${Date.now()}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('CSV exportado!')
    } catch { toast.error('Erro ao exportar') }
    finally { setExportando(false) }
  }

  const tipoColors = {
    pedido_criado: 'text-green-400',
    pedido_puxado: 'text-blue-400',
    status_atualizado: 'text-purple-400',
    login: 'text-yellow-400',
    admin_login: 'text-yellow-400',
    forjador_cadastrado: 'text-green-400',
    token_gerado: 'text-yellow-400',
    transferencia_aceita: 'text-green-400',
    transferencia_recusada: 'text-red-400',
    login_falhou: 'text-red-400',
    admin_login_falhou: 'text-red-400',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-rajdhani text-3xl font-bold text-forge-gold">📜 Logs do Sistema</h1>
          <p className="text-forge-text-muted text-sm mt-1">{pagination.total} registro(s)</p>
        </div>
        <button onClick={exportarCSV} disabled={exportando} className="btn-ghost text-sm">
          {exportando ? '⏳' : '📥'} Exportar CSV
        </button>
      </div>

      {/* Filtro */}
      <div className="card mb-6">
        <div className="flex gap-3">
          <select
            value={filtros.tipo}
            onChange={e => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
            className="select-field max-w-xs text-sm"
          >
            <option value="">Todos os Tipos</option>
            {tiposLog.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => fetchLogs(1)} className="btn-gold text-sm py-2">🔍 Filtrar</button>
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
                  <th className="px-4 py-3 text-right">Data/Hora</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Descrição</th>
                  <th className="px-4 py-3 text-center">Ator</th>
                  <th className="px-4 py-3 text-center">Pedido</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="table-row">
                    <td className="px-4 py-2 text-right text-xs text-forge-text-muted whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-mono font-medium ${tipoColors[log.tipo] || 'text-forge-text-muted'}`}>
                        {log.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-forge-text">{log.descricao}</td>
                    <td className="px-4 py-2 text-center text-xs text-forge-text-muted">
                      {log.actor_tipo ? `${log.actor_tipo} #${log.actor_id || ''}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-center text-xs text-forge-gold">
                      {log.pedido_id ? `#P${log.pedido_id}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-forge-border">
              <p className="text-sm text-forge-text-muted">Página {pagination.page} de {pagination.pages}</p>
              <div className="flex gap-2">
                <button onClick={() => fetchLogs(pagination.page - 1)} disabled={pagination.page <= 1} className="btn-ghost text-xs py-1 px-3">← Anterior</button>
                <button onClick={() => fetchLogs(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="btn-ghost text-xs py-1 px-3">Próxima →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminLogs

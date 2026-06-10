import { useState, useEffect, useCallback } from 'react'
import api from '../api'
import { calcularMateriaisPedido } from '../utils/pedidoUtils'
import StatusBadge from './StatusBadge'
import MaterialBadge from './MaterialBadge'
import Modal from './Modal'
import { toast } from 'react-toastify'

const PedidoCard = ({ pedido: pedidoInicial, forjadorView = false, onStatusChange, onTransferir }) => {
  const [pedido, setPedido] = useState(pedidoInicial)
  const [atualizandoStatus, setAtualizandoStatus] = useState(false)
  const [materiais, setMateriais] = useState([])

  useEffect(() => {
    setPedido(pedidoInicial)
    if (pedidoInicial.itens) {
      calcularMateriaisPedido(pedidoInicial.itens).then(setMateriais)
    }
  }, [pedidoInicial])

  const handleStatusChange = async (novoStatus) => {
    setAtualizandoStatus(true)
    try {
      await api.patch(`/forjador/pedidos/${pedido.id}/status`, { status: novoStatus })
      setPedido(prev => ({ ...prev, status: novoStatus }))
      toast.success('Status atualizado!')
      onStatusChange?.(pedido.id, novoStatus)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar status')
    } finally {
      setAtualizandoStatus(false)
    }
  }

  const copiarResumo = () => {
    const itensText = (pedido.itens || []).map(i => `• ${i.produto_nome} x${i.quantidade}`).join('\n')
    const materiaisText = materiais.map(m => `• ${m.nome} x${m.total}`).join('\n')

    const texto = `📦 Pedido: ${pedido.registro_id}
👤 Cliente: ${pedido.cliente_nome || 'N/I'} | Passaporte: ${pedido.cliente_passaporte || 'N/I'}

🛒 Itens do Pedido:
${itensText}

⚒️ Materiais Necessários:
${materiaisText}

💰 Total: R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}`

    navigator.clipboard.writeText(texto)
    toast.success('Resumo copiado!')
  }

  const statusColors = {
    na_fila: 'border-l-yellow-500',
    coletando_materiais: 'border-l-blue-500',
    em_producao: 'border-l-purple-500',
    concluido: 'border-l-green-500'
  }

  return (
    <div className={`card border-l-4 ${statusColors[pedido.status] || 'border-l-forge-border'} animate-fade-in`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-rajdhani font-bold text-forge-gold text-xl">{pedido.registro_id}</span>
            <StatusBadge status={pedido.status} />
          </div>
          {!pedido.sem_dados_cliente && (
            <p className="text-forge-text-muted text-sm mt-1">
              👤 {pedido.cliente_nome || 'N/I'} — 🪪 {pedido.cliente_passaporte || 'N/I'}
            </p>
          )}
          {pedido.cliente_discord_tag && (
            <p className="text-blue-400 text-xs">💬 {pedido.cliente_discord_tag}</p>
          )}
          <p className="text-forge-text-muted text-xs mt-0.5">
            {new Date(pedido.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-forge-gold font-rajdhani font-bold text-xl">
            R$ {parseFloat(pedido.total).toFixed(2).replace('.', ',')}
          </p>
          <p className="text-xs text-forge-text-muted capitalize">{pedido.origem || 'cliente'}</p>
        </div>
      </div>

      {/* Itens */}
      {pedido.itens && pedido.itens.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-forge-text-muted mb-2">🛒 Produtos:</p>
          <div className="space-y-1">
            {pedido.itens.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <img
                  src={`/images/${encodeURIComponent(item.produto_nome)}.png`}
                  alt={item.produto_nome}
                  className="w-6 h-6 object-contain"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                <span className="text-forge-text">{item.produto_nome}</span>
                <span className="text-forge-gold font-bold ml-auto">×{item.quantidade}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materiais */}
      {forjadorView && materiais.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-forge-text-muted mb-2">⚒️ Materiais Necessários:</p>
          <div className="flex flex-wrap gap-1.5">
            {materiais.map((mat, idx) => (
              <MaterialBadge key={idx} nome={mat.nome} quantidade={mat.total} />
            ))}
          </div>
        </div>
      )}

      {/* Controles forjador */}
      {forjadorView && (
        <div className="border-t border-forge-border pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-forge-text-muted shrink-0">Status:</label>
            <select
              value={pedido.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={atualizandoStatus}
              className="select-field flex-1 text-sm py-1.5"
            >
              <option value="na_fila">🟡 Na Fila</option>
              <option value="coletando_materiais">🔵 Coletando Materiais</option>
              <option value="em_producao">🔧 Em Produção</option>
              <option value="concluido">✅ Concluído</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={copiarResumo} className="btn-ghost flex-1 justify-center text-xs py-2">
              📋 Copiar Resumo
            </button>
            {onTransferir && (
              <button onClick={() => onTransferir(pedido)} className="btn-primary flex-1 justify-center text-xs py-2">
                🔄 Transferir
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PedidoCard

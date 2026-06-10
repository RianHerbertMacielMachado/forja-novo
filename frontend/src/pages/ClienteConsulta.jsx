import { useState } from 'react'
import { toast } from 'react-toastify'
import Navbar from '../components/Navbar'
import StatusBadge from '../components/StatusBadge'
import Carrinho from '../components/Carrinho'
import api from '../api'

const ClienteConsulta = () => {
  const [registroId, setRegistroId] = useState('')
  const [passaporte, setPassaporte] = useState('')
  const [resultado, setResultado] = useState(null)
  const [multiplosResultados, setMultiplosResultados] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  const handleBusca = async (e) => {
    e.preventDefault()
    if (!registroId && !passaporte) {
      toast.warning('Preencha o Registro ID ou o Passaporte para buscar')
      return
    }

    setLoading(true)
    setErro(null)
    setResultado(null)
    setMultiplosResultados([])

    try {
      const params = {}
      if (registroId) params.registro_id = registroId.toUpperCase().replace('#', '') ? `#${registroId.toUpperCase().replace('#', '')}` : registroId
      else params.passaporte = passaporte

      const res = await api.get('/cliente/pedidos/consultar', { params })

      if (Array.isArray(res.data)) {
        if (res.data.length === 1) {
          setResultado(res.data[0])
        } else {
          setMultiplosResultados(res.data)
        }
      } else {
        setResultado(res.data)
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setErro('Nenhum pedido encontrado com esses dados. Verifique as informações e tente novamente.')
      } else {
        setErro('Erro ao consultar pedido. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = {
    na_fila: 'Na Fila',
    coletando_materiais: 'Coletando Materiais',
    em_producao: 'Em Produção',
    concluido: 'Concluído'
  }

  return (
    <div className="min-h-screen bg-forge-bg">
      <Navbar />
      <Carrinho />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="font-rajdhani text-4xl font-bold text-forge-gold mb-2">🔍 Consultar Pedido</h1>
          <p className="text-forge-text-muted">Acompanhe o status do seu pedido</p>
        </div>

        {/* Formulário de busca */}
        <div className="card mb-8">
          <form onSubmit={handleBusca} className="space-y-4">
            <div>
              <label className="label">Registro ID do Pedido</label>
              <input
                type="text"
                value={registroId}
                onChange={(e) => {
                  setRegistroId(e.target.value)
                  if (e.target.value) setPassaporte('')
                }}
                className="input-field"
                placeholder="Ex: #38UKEA"
                maxLength={7}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-forge-border"></div>
              <span className="text-forge-text-muted text-sm font-medium px-3">OU</span>
              <div className="flex-1 h-px bg-forge-border"></div>
            </div>

            <div>
              <label className="label">ID/Passaporte do Cliente</label>
              <input
                type="text"
                value={passaporte}
                onChange={(e) => {
                  setPassaporte(e.target.value)
                  if (e.target.value) setRegistroId('')
                }}
                className="input-field"
                placeholder="Seu número de passaporte"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full justify-center py-3"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Buscando...</>
              ) : (
                '🔍 Consultar'
              )}
            </button>
          </form>
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-6 text-center animate-fade-in">
            <p className="text-3xl mb-2">😕</p>
            <p className="text-red-300">{erro}</p>
          </div>
        )}

        {/* Múltiplos resultados */}
        {multiplosResultados.length > 1 && (
          <div className="space-y-3 animate-fade-in">
            <h2 className="font-rajdhani text-xl font-bold text-forge-gold">
              {multiplosResultados.length} pedidos encontrados
            </h2>
            {multiplosResultados.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setResultado(p)
                  setMultiplosResultados([])
                }}
                className="w-full card hover:border-forge-gold/50 text-left transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-rajdhani font-bold text-forge-gold text-lg">{p.registro_id}</p>
                    <p className="text-sm text-forge-text-muted">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={p.status} />
                    <p className="text-sm text-forge-gold font-bold mt-1">
                      R$ {parseFloat(p.total).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Resultado único */}
        {resultado && (
          <div className="card animate-fade-in">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm text-forge-text-muted mb-1">Registro do Pedido</p>
                <p className="font-rajdhani text-3xl font-bold text-forge-gold">{resultado.registro_id}</p>
              </div>
              <StatusBadge status={resultado.status} size="lg" />
            </div>

            {/* Info do cliente */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-forge-panel2 rounded-xl p-4">
              <div>
                <p className="text-xs text-forge-text-muted">👤 Cliente</p>
                <p className="text-forge-text font-medium">{resultado.cliente_nome || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-xs text-forge-text-muted">🪪 Passaporte</p>
                <p className="text-forge-text font-medium">{resultado.cliente_passaporte || 'Não informado'}</p>
              </div>
              {resultado.forjador_nome && (
                <div>
                  <p className="text-xs text-forge-text-muted">🔨 Forjador</p>
                  <p className="text-forge-text font-medium">{resultado.forjador_nome}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-forge-text-muted">💰 Total</p>
                <p className="text-forge-gold font-bold">R$ {parseFloat(resultado.total).toFixed(2).replace('.', ',')}</p>
              </div>
            </div>

            {/* Itens */}
            {resultado.itens && resultado.itens.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-forge-text mb-3">🛒 Itens Comprados:</h3>
                <div className="space-y-2">
                  {resultado.itens.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-forge-panel2 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={`/images/${encodeURIComponent(item.produto_nome)}.png`}
                          alt={item.produto_nome}
                          className="w-8 h-8 object-contain"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                        <span className="text-forge-text">{item.produto_nome}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-forge-gold font-bold">×{item.quantidade}</span>
                        <p className="text-xs text-forge-text-muted">
                          R$ {(parseFloat(item.valor_unitario) * item.quantidade).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline de logs */}
            {resultado.logs && resultado.logs.length > 0 && (
              <div>
                <h3 className="font-semibold text-forge-text mb-3">📜 Histórico:</h3>
                <div className="space-y-2">
                  {resultado.logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-forge-gold mt-2 shrink-0" />
                      <div>
                        <p className="text-forge-text">{log.descricao}</p>
                        <p className="text-forge-text-muted text-xs">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-forge-border text-center">
              <p className="text-xs text-forge-text-muted">
                Pedido criado em {new Date(resultado.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ClienteConsulta

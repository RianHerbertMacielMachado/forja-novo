import { useState } from 'react'
import { toast } from 'react-toastify'
import { useCarrinho } from '../context/CarrinhoContext'

const ProdutoCard = ({ produto, mostrarAddCarrinho = true, mostrarMateriais = true, onAdd }) => {
  const [quantidade, setQuantidade] = useState(produto.multiplo_quantidade || 1)
  const { addItem } = useCarrinho()

  const isEncantado = produto.tipo === 'encantado'
  const isFlechas = produto.tipo === 'flechas'
  const multiplo = produto.multiplo_quantidade || 1
  const qtdMin = produto.quantidade_minima || multiplo

  const handleAdd = () => {
    if (onAdd) {
      onAdd(produto, quantidade)
    } else {
      addItem(produto, quantidade)
      toast.success(`${produto.nome} adicionado ao carrinho!`)
    }
    setQuantidade(qtdMin)
  }

  const handleQtdChange = (delta) => {
    const novaQtd = quantidade + (delta * multiplo)
    if (novaQtd >= qtdMin) setQuantidade(novaQtd)
  }

  const imgSrc = `/images/${encodeURIComponent(produto.nome)}.png`

  return (
    <div className={`card hover:border-forge-gold/50 transition-all duration-300 group relative overflow-hidden ${isEncantado ? 'border-purple-700/50' : ''}`}>
      {/* Efeito de brilho encantado */}
      {isEncantado && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent pointer-events-none" />
      )}

      {/* Imagem */}
      <div className="relative h-36 bg-forge-panel2 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        <img
          src={imgSrc}
          alt={produto.nome}
          className="h-full w-full object-contain p-4 transition-transform group-hover:scale-105"
          onError={(e) => {
            e.target.onerror = null
            e.target.src = '/images/default.png'
            e.target.style.opacity = '0.5'
          }}
        />
        {isEncantado && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        )}
      </div>

      {/* Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-rajdhani font-bold text-forge-text leading-tight">{produto.nome}</h3>
          <span className={`shrink-0 ${isEncantado ? 'badge-encantado' : 'badge-basico'}`}>
            {isEncantado ? '✨ Encantado' : isFlechas ? '🏹 Flechas' : '⚔️ Básico'}
          </span>
        </div>

        <p className="text-forge-gold font-bold text-lg">
          R$ {parseFloat(produto.valor_unitario).toFixed(2).replace('.', ',')}
          {isFlechas ? <span className="text-forge-text-muted text-sm font-normal"> / 100 un</span> : multiplo > 1 && <span className="text-forge-text-muted text-sm font-normal"> / {multiplo} un</span>}
        </p>

        {/* Materiais necessários */}
        {mostrarMateriais && produto.materiais && produto.materiais.length > 0 && (
          <div className="pt-2 border-t border-forge-border">
            <p className="text-xs text-forge-text-muted mb-1.5">⚒️ Materiais:</p>
            <div className="flex flex-wrap gap-1">
              {produto.materiais.map((mat, idx) => (
                <span key={idx} className="text-xs bg-forge-panel2 border border-forge-border px-1.5 py-0.5 rounded text-forge-text-muted">
                  {mat.nome} ×{mat.quantidade}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Seletor de quantidade */}
        {mostrarAddCarrinho && multiplo > 1 && (
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => handleQtdChange(-1)}
              disabled={quantidade <= qtdMin}
              className="w-8 h-8 rounded-lg bg-forge-panel2 border border-forge-border hover:border-forge-gold text-forge-text disabled:opacity-40 flex items-center justify-center font-bold transition-all"
            >
              −
            </button>
            <span className="flex-1 text-center font-bold text-forge-gold">{quantidade}</span>
            <button
              onClick={() => handleQtdChange(1)}
              className="w-8 h-8 rounded-lg bg-forge-panel2 border border-forge-border hover:border-forge-gold text-forge-text flex items-center justify-center font-bold transition-all"
            >
              +
            </button>
          </div>
        )}

        {/* Botão adicionar */}
        {mostrarAddCarrinho && (
          <button
            onClick={handleAdd}
            className="btn-gold w-full justify-center mt-2"
          >
            🛒 Adicionar ao Carrinho
          </button>
        )}
      </div>
    </div>
  )
}

export default ProdutoCard

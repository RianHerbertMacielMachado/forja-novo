import { useCarrinho } from '../context/CarrinhoContext'

const Carrinho = ({ onFinalizar }) => {
  const { itens, aberto, setAberto, removeItem, updateQuantidade, total } = useCarrinho()

  if (!aberto) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={() => setAberto(false)}
      />

      {/* Sidebar do carrinho */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-forge-panel border-l border-forge-border z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-forge-border">
          <h2 className="font-rajdhani text-xl font-bold text-forge-gold">🛒 Carrinho</h2>
          <button
            onClick={() => setAberto(false)}
            className="w-8 h-8 rounded-lg bg-forge-panel2 hover:bg-red-900/30 text-forge-text-muted hover:text-red-400 flex items-center justify-center transition-all"
          >
            ✕
          </button>
        </div>

        {/* Aviso Discord */}
        <div className="mx-4 mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <p className="text-xs text-blue-300">
            ⚠️ <strong>Quer receber atualizações no Discord?</strong> Insira sua tag do Discord no formulário ao finalizar!
          </p>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {itens.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🛒</p>
              <p className="text-forge-text-muted">Carrinho vazio</p>
              <p className="text-sm text-forge-text-muted mt-1">Adicione produtos do catálogo</p>
            </div>
          ) : (
            itens.map((item) => (
              <div key={item.produto_id} className="bg-forge-panel2 rounded-xl p-4 border border-forge-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-forge-text text-sm truncate">{item.nome}</p>
                    <p className="text-forge-gold text-sm font-bold">
                      R$ {item.valor_unitario.toFixed(2).replace('.', ',')}
                      {item.multiplo_quantidade > 1 && <span className="text-forge-text-muted font-normal"> /{item.multiplo_quantidade}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.produto_id)}
                    className="text-forge-text-muted hover:text-red-400 transition-colors text-sm"
                  >
                    🗑️
                  </button>
                </div>

                {/* Quantidade */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantidade(item.produto_id, item.quantidade - (item.multiplo_quantidade || 1))}
                      className="w-7 h-7 rounded-lg bg-forge-bg border border-forge-border hover:border-forge-gold text-forge-text flex items-center justify-center text-sm font-bold transition-all"
                    >
                      −
                    </button>
                    <span className="w-12 text-center font-bold text-forge-gold text-sm">{item.quantidade}</span>
                    <button
                      onClick={() => updateQuantidade(item.produto_id, item.quantidade + (item.multiplo_quantidade || 1))}
                      className="w-7 h-7 rounded-lg bg-forge-bg border border-forge-border hover:border-forge-gold text-forge-text flex items-center justify-center text-sm font-bold transition-all"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-bold text-forge-text text-sm">
                    R$ {(item.valor_unitario * item.quantidade).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer com total e botão */}
        {itens.length > 0 && (
          <div className="p-4 border-t border-forge-border space-y-3">
            <div className="flex items-center justify-between text-lg font-bold">
              <span className="text-forge-text">Total:</span>
              <span className="text-forge-gold font-rajdhani text-2xl">
                R$ {total.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <button
              onClick={() => {
                setAberto(false)
                onFinalizar?.()
              }}
              className="btn-gold w-full justify-center text-base py-3"
            >
              ✅ Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default Carrinho

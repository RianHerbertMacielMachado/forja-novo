import { createContext, useContext, useState, useCallback } from 'react'

const CarrinhoContext = createContext(null)

export const CarrinhoProvider = ({ children }) => {
  const [itens, setItens] = useState([])
  const [aberto, setAberto] = useState(false)

  const addItem = useCallback((produto, quantidade = 1) => {
    setItens(prev => {
      const existing = prev.find(i => i.produto_id === produto.id)
      if (existing) {
        return prev.map(i =>
          i.produto_id === produto.id
            ? { ...i, quantidade: i.quantidade + quantidade }
            : i
        )
      }
      return [...prev, {
        produto_id: produto.id,
        nome: produto.nome,
        tipo: produto.tipo,
        valor_unitario: parseFloat(produto.valor_unitario),
        quantidade,
        multiplo_quantidade: produto.multiplo_quantidade || 1
      }]
    })
    setAberto(true)
  }, [])

  const removeItem = useCallback((produtoId) => {
    setItens(prev => prev.filter(i => i.produto_id !== produtoId))
  }, [])

  const updateQuantidade = useCallback((produtoId, quantidade) => {
    if (quantidade <= 0) {
      setItens(prev => prev.filter(i => i.produto_id !== produtoId))
      return
    }
    setItens(prev =>
      prev.map(i => i.produto_id === produtoId ? { ...i, quantidade } : i)
    )
  }, [])

  const limpar = useCallback(() => {
    setItens([])
  }, [])

  const total = itens.reduce((sum, item) => sum + (item.valor_unitario * item.quantidade), 0)
  const totalItens = itens.reduce((sum, item) => sum + item.quantidade, 0)

  return (
    <CarrinhoContext.Provider value={{
      itens, aberto, setAberto,
      addItem, removeItem, updateQuantidade, limpar,
      total, totalItens
    }}>
      {children}
    </CarrinhoContext.Provider>
  )
}

export const useCarrinho = () => {
  const ctx = useContext(CarrinhoContext)
  if (!ctx) throw new Error('useCarrinho deve ser usado dentro de CarrinhoProvider')
  return ctx
}

export default CarrinhoContext

import { Routes, Route, Navigate } from 'react-router-dom'
import { ForjadorSidebar } from '../components/Sidebar'
import ForjadorFila from './ForjadorFila'
import ForjadorCatalogo from './ForjadorCatalogo'
import ForjadorMeusPedidos from './ForjadorMeusPedidos'
import ForjadorTransferencias from './ForjadorTransferencias'
import ForjadorConfiguracoes from './ForjadorConfiguracoes'

const ForjadorPainel = () => {
  return (
    <div className="flex min-h-screen bg-forge-bg">
      <ForjadorSidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="fila" element={<ForjadorFila />} />
          <Route path="catalogo" element={<ForjadorCatalogo />} />
          <Route path="meus-pedidos" element={<ForjadorMeusPedidos />} />
          <Route path="transferencias" element={<ForjadorTransferencias />} />
          <Route path="configuracoes" element={<ForjadorConfiguracoes />} />
          <Route path="*" element={<Navigate to="fila" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default ForjadorPainel

import React from 'react'
import { Sidebar } from './components/Sidebar'
import { Library } from './components/Library'
import { PlayerControls } from './components/PlayerControls'
import { FloatingPlayer } from './components/FloatingPlayer'
import { MiniPlayerBridge } from './components/MiniPlayerBridge'
import { MiniPlayerWindow } from './components/MiniPlayerWindow'
import './App.css'

// When Electron opens the mini player window it adds ?mini=true to the URL
const isMiniMode = new URLSearchParams(window.location.search).get('mini') === 'true'

const App: React.FC = () => {
  if (isMiniMode) {
    return <MiniPlayerWindow />
  }

  return (
    <div className="app-layout">
      {/* Invisible bridge: syncs store ↔ mini player window via IPC */}
      <MiniPlayerBridge />
      <FloatingPlayer />
      <div className="main-content-wrapper">
        <Sidebar />
        <Library />
      </div>
      <PlayerControls />
    </div>
  )
}

export default App

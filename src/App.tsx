import React, {useState} from 'react'
import GameCanvas from './components/GameCanvas'

export type ModeId = 'solo' | 'versus' | 'coop'

export default function App(){
  const [mode, setMode] = useState<ModeId | null>(null)
  const [showMenu, setShowMenu] = useState(true)

  return (
    <div className="app-root">
      <header className="topbar">
        <h1>Brick Breaker (React + Canvas)</h1>
      </header>

      <main className="main-area">
        <div className="left-panel">
          <div className="menu">
            {showMenu ? (
              <div>
                <h2>Välj spelmode</h2>
                <button onClick={() => { setMode('solo'); setShowMenu(false)}}>Solo</button>
                <button onClick={() => { setMode('versus'); setShowMenu(false)}}>Duo Versus</button>
                <button onClick={() => { setMode('coop'); setShowMenu(false)}}>Duo Co-op Survival</button>
              </div>
            ) : (
              <div>
                <button onClick={() => { setShowMenu(true); setMode(null)}}>Back to Menu</button>
                <button onClick={() => { setShowMenu(true); setMode(null)}}>Restart</button>
              </div>
            )}
          </div>
        </div>

        <div className="game-area">
          <GameCanvas mode={mode ?? 'solo'} showMenu={showMenu} onExit={() => setShowMenu(true)} />
        </div>

      </main>

      <footer className="footer">Use A/D for left paddle, ←/→ for right paddle. Esc to pause.</footer>
    </div>
  )
}


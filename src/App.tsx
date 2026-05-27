import React, {useState} from 'react'
import GameCanvas from './components/GameCanvas'

export type ModeId = 'solo' | 'versus' | 'coop'

export default function App(){
  const [mode, setMode] = useState<ModeId | null>(null)
  const [showMenu, setShowMenu] = useState(true)
  const [showHowToPlay, setShowHowToPlay] = useState(false)

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
                {!showHowToPlay ? (
                  <div>
                    <h2>Choose Game Mode</h2>
                    <button onClick={() => { setMode('solo'); setShowMenu(false)}}>Solo</button>
                    <button onClick={() => { setMode('versus'); setShowMenu(false)}}>Duo Versus</button>
                    <button onClick={() => { setMode('coop'); setShowMenu(false)}}>Duo Co-op Survival</button>
                    <hr style={{margin: '12px 0', opacity: 0.3}} />
                    <button onClick={() => setShowHowToPlay(true)}>How to Play</button>
                  </div>
                ) : (
                  <div style={{maxHeight: '500px', overflowY: 'auto'}}>
                    <h2>How to Play</h2>
                    
                      <h3>Goal</h3>
                      <p>Destroy all bricks to clear a level. Don't let the ball fall!</p>
                    
                      <h3>Controls</h3>
                    <ul>
                        <li><strong>Blue paddle:</strong> A/D or W to serve</li>
                        <li><strong>Pink paddle:</strong> ←/→ or ↑ to serve</li>
                        <li><strong>Pause:</strong> Esc</li>
                    </ul>
                    
                      <h3>Game Modes</h3>
                    <ul>
                        <li><strong>Solo:</strong> 1 paddle, 3 lives. Clear levels and survive!</li>
                        <li><strong>Duo Versus:</strong> 2 players against each other. First to lose all lives loses.</li>
                        <li><strong>Co-op Survival:</strong> 2 players together. Survive as long as possible!</li>
                    </ul>
                    
                    <h3>Powerups</h3>
                    <div style={{fontSize: '12px'}}>
                      <div style={{padding: '4px', marginBottom: '4px', backgroundColor: '#33ff33', color: '#000'}}>
                          <strong>E</strong> - EXPAND: Paddle gets bigger (12s)
                      </div>
                      <div style={{padding: '4px', marginBottom: '4px', backgroundColor: '#33ff33', color: '#000'}}>
                          <strong>M</strong> - MULTIBALL: +2 extra balls
                      </div>
                      <div style={{padding: '4px', marginBottom: '4px', backgroundColor: '#33ff33', color: '#000'}}>
                          <strong>S</strong> - SLOW: Ball gets slower (10s)
                      </div>
                      <div style={{padding: '4px', marginBottom: '4px', backgroundColor: '#33ff33', color: '#000'}}>
                          <strong>L</strong> - EXTRA_LIFE: +1 life (max 3 in Versus)
                      </div>
                      <div style={{padding: '4px', marginBottom: '4px', backgroundColor: '#ff3333', color: '#fff'}}>
                          <strong>S</strong> - SHRINK: Paddle gets smaller (12s)
                      </div>
                      <div style={{padding: '4px', marginBottom: '4px', backgroundColor: '#ff3333', color: '#fff'}}>
                          <strong>F</strong> - FAST: Ball gets faster (10s)
                      </div>
                      <div style={{padding: '4px', marginBottom: '4px', backgroundColor: '#3366ff', color: '#fff'}}>
                          <strong>S</strong> - SABOTAGE (Versus): Gives opponent negative effect
                      </div>
                    </div>
                    
                      <h3>Difficulty Scaling</h3>
                      <p>Each level gets harder: faster balls, tougher bricks, more obstacles!</p>
                    
                      <button onClick={() => setShowHowToPlay(false)} style={{marginTop: '12px', width: '100%'}}>Back</button>
                  </div>
                )}
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
          {!showMenu && mode && (
            <GameCanvas mode={mode} showMenu={showMenu} onExit={() => setShowMenu(true)} />
          )}
        </div>

      </main>

      <footer className="footer">Use A/D for left paddle, ←/→ for right paddle. Esc to pause.</footer>
    </div>
  )
}


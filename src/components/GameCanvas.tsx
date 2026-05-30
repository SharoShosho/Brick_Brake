import React, {useEffect, useRef, useState} from 'react'
import { GameEngine, ModeId, formatSurvivalTime } from '../engine/GameEngine'

type Props = {
  mode: ModeId
  showMenu: boolean
  onExit?: ()=>void
}

export default function GameCanvas({mode, showMenu: _showMenu, onExit}: Props){
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [paused, setPaused] = useState(false)
  const [overlay, setOverlay] = useState<{ phase: 'playing'|'paused'|'ended', title?: string, subtitle?: string }>({ phase: 'playing' })
  const hudRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef(overlay)

  useEffect(()=>{
    const canvas = canvasRef.current!
    const engine = new GameEngine(canvas, mode)
    engineRef.current = engine

    engine.onStateChanged = (s: { hud: any, overlay: { phase: 'playing'|'paused'|'ended', title?: string, subtitle?: string } })=>{
      // expose HUD via state callback to React-controlled overlay
      if(hudRef.current){
        hudRef.current.dataset.hud = JSON.stringify(s.hud)
      }
      const nextOverlay = s.overlay
      const prevOverlay = overlayRef.current
      if(
        prevOverlay.phase !== nextOverlay.phase ||
        prevOverlay.title !== nextOverlay.title ||
        prevOverlay.subtitle !== nextOverlay.subtitle
      ){
        overlayRef.current = nextOverlay
        setOverlay(nextOverlay)
      }
    }

    engine.start()

    const onKey = (e: KeyboardEvent)=>{
      if(e.key === 'Escape'){
        setPaused(p=>{ const newp = !p; engine.setPaused(newp); return newp })
      }
      // Serve controls:
      if(e.type === 'keydown'){
        // In Versus mode: Blue uses W, Pink uses ArrowUp
        if(e.key === 'ArrowUp'){
          if(engine.mode === 'versus') engine.launchServe('pink')
          else engine.launchServe()
        }
        if(e.key.toLowerCase() === 'w'){
          if(engine.mode === 'versus') engine.launchServe('blue')
          else engine.launchServe()
        }
      }

      // movement controls
      if(e.key === 'a' || e.key === 'A') engine.setPaddleInput('blue', e.type === 'keydown' ? -1 : 0)
      if(e.key === 'd' || e.key === 'D') engine.setPaddleInput('blue', e.type === 'keydown' ? 1 : 0)
      if(e.key === 'ArrowLeft') engine.setPaddleInput('pink', e.type === 'keydown' ? -1 : 0)
      if(e.key === 'ArrowRight') engine.setPaddleInput('pink', e.type === 'keydown' ? 1 : 0)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)

    return ()=>{
      engine.stop()
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [])

  useEffect(()=>{
    if(engineRef.current){
      engineRef.current.setMode(mode)
      setPaused(false)
      setOverlay({ phase: 'playing' })
      overlayRef.current = { phase: 'playing' }
    }
  }, [mode])

  // read HUD dataset and parse (simple reactive): render small overlay
  const hudRaw = hudRef.current?.dataset.hud
  let hud: any
  try{ hud = hudRaw ? JSON.parse(hudRaw) : null }catch(e){ hud = null }

  return (
    <div className="canvas-wrapper">
      <canvas ref={canvasRef} width={900} height={640} style={{display:'block', width:'900px', height:'640px'}}></canvas>

      <div className="overlay">
        <div className="hud" ref={hudRef}>
          {hud ? (
            <div>
              <div>Mode: {hud.mode}</div>
              {hud.mode === 'solo' && <div>Lives: {hud.lives} | Level: {hud.level}</div>}
              {hud.mode === 'versus' && <div>Blue: {hud.blueLives} | Pink: {hud.pinkLives} | Level: {hud.level}</div>}
              {hud.mode === 'coop' && <div>TeamLives: {hud.teamLives} | Level: {hud.level} | Time: {formatSurvivalTime(hud.survivalTime ?? 0)}</div>}
            </div>
          ) : <div>Loading...</div>}
        </div>

        <div className="controls">A/D = blue | ←/→ = pink</div>

        {overlay.phase === 'paused' && paused && (
          <div className="paused">
            <div className="box">
              <div>Paused</div>
              <button onClick={()=>{ setPaused(false); engineRef.current?.setPaused(false) }}>Resume</button>
            </div>
          </div>
        )}

        {overlay.phase === 'ended' && (
          <div className="paused">
            <div className="box endscreen">
              <div className="endtitle">{overlay.title ?? 'Game Over'}</div>
              {overlay.subtitle && <div className="endsubtitle">{overlay.subtitle}</div>}
              <div className="endbuttons">
                <button onClick={()=>{ engineRef.current?.resetMatch(); setPaused(false); }}>Restart</button>
                <button onClick={()=>{ onExit?.(); }}>Return to Menu</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



import React, {useEffect, useRef, useState} from 'react'
import { GameEngine, ModeId } from '../engine/GameEngine'

type Props = {
  mode: ModeId
  showMenu: boolean
  onExit?: ()=>void
}

export default function GameCanvas({mode, showMenu, onExit}: Props){
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [paused, setPaused] = useState(false)
  const hudRef = useRef<HTMLDivElement | null>(null)

  useEffect(()=>{
    const canvas = canvasRef.current!
    const engine = new GameEngine(canvas, mode)
    engineRef.current = engine

    engine.onStateChanged = (s: { hud: any })=>{
      // expose HUD via state callback to React-controlled overlay
      if(hudRef.current){
        hudRef.current.dataset.hud = JSON.stringify(s.hud)
      }
    }

    engine.start()

    const onKey = (e: KeyboardEvent)=>{
      if(e.key === 'Escape'){
        setPaused(p=>{ const newp = !p; engine.setPaused(newp); return newp })
      }
      // controls
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
    }
  }, [mode])

  // read HUD dataset and parse (simple reactive): render small overlay
  const hudRaw = hudRef.current?.dataset.hud
  let hud: any = null
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
              {hud.mode === 'coop' && <div>TeamLives: {hud.teamLives} | Level: {hud.level} | Time: {Math.floor(hud.survivalTime)}s</div>}
            </div>
          ) : <div>Loading...</div>}
        </div>

        <div className="controls">A/D = blue | ←/→ = pink</div>

        {paused && (
          <div className="paused">
            <div className="box">
              <div>Paused</div>
              <button onClick={()=>{ setPaused(false); engineRef.current?.setPaused(false) }}>Resume</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



/*
  GameEngine: single-file engine implementing required features.
  This is a compact but clear implementation focusing on the required mechanics:
  - modes: solo, versus, coop
  - bricks with hp and random level generator
  - ball/paddle/brick collisions
  - powerups (drop, capture, effects)
  - fixed-step update + requestAnimationFrame render loop
  - life pools per mode and serve-on-empty policy
*/

export type ModeId = 'solo' | 'versus' | 'coop'

// Basic vector
// IDs
let nextId = 1
function id(prefix='e'){ return prefix + (nextId++) }

// Entities
export type Ball = { id:string, x:number, y:number, r:number, vx:number, vy:number, owner?: 'blue'|'pink'|'team', served?: boolean }
export type Paddle = { id:string, x:number, y:number, w:number, h:number, color: string, player: 'blue'|'pink'|'both' }
export type Brick = { id:string, x:number, y:number, w:number, h:number, hp:number, maxHp:number }
export type PowerupKind = 'EXPAND'|'SHRINK'|'SLOW'|'FAST'|'MULTIBALL'|'EXTRA_LIFE'
export type Powerup = { id:string, x:number, y:number, w:number, h:number, kind:PowerupKind, vy:number }

// HUD snapshot type
type Hud = { mode: ModeId, lives?:number, blueLives?:number, pinkLives?:number, teamLives?:number, level:number, survivalTime?:number }

export class GameEngine{
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width = 900
  height = 640
  raf = 0
  running = false
  paused = false
  lastT = 0
  accumulator = 0
  step = 1/120 // physics step (s)

  // game objects
  balls: Ball[] = []
  paddles: Paddle[] = []
  bricks: Brick[] = []
  powerups: Powerup[] = []
  activeEffects: { kind: PowerupKind, until: number, target: 'blue'|'pink'|'both'|'team' }[] = []

  // inputs
  input: { blueDir: number, pinkDir: number } = { blueDir:0, pinkDir:0 }

  // mode & stats
  mode: ModeId = 'solo'
  level = 1
  startTime = 0
  survivalTime = 0
  bestTime = 0

  // lives/pools
  soloLives = 3
  blueLives = 3
  pinkLives = 3
  teamLives = 3

  // callbacks
  onStateChanged: ((s:{hud:Hud})=>void) | null = null

  constructor(canvas: HTMLCanvasElement, mode:ModeId='solo'){
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if(!ctx) throw new Error('No 2D context')
    this.ctx = ctx
    this.mode = mode
    this.width = canvas.width
    this.height = canvas.height

    // create default paddles
    this.paddles = []
    this.spawnPaddles()
    // start level
    this.generateLevel()
    this.resetBallsForMode()

    // load bestTime
    try{ const k = localStorage.getItem('bb_best_time'); if(k) this.bestTime = parseFloat(k) }catch(e){}
  }

  setMode(m:ModeId){
    this.mode = m
    this.level = 1
    this.soloLives = 3
    this.blueLives = 3
    this.pinkLives = 3
    this.teamLives = 3
    this.activeEffects = []
    this.powerups = []
    this.generateLevel()
    this.resetBallsForMode()
  }

  spawnPaddles(){
    this.paddles = []
    const baseY = this.height - 32
    if(this.mode === 'solo'){
      this.paddles.push({ id:id('p'), x:this.width/2, y:baseY, w:140, h:18, color:'blue', player: 'blue' })
    } else {
      // two paddles both at bottom
      this.paddles.push({ id:id('p'), x:this.width*0.33, y:baseY, w:130, h:18, color:'blue', player:'blue' })
      this.paddles.push({ id:id('p'), x:this.width*0.66, y:baseY, w:130, h:18, color:'pink', player:'pink' })
    }
  }

  // difficulty formulas from spec
  ballSpeedForLevel(level:number){
    return Math.min(650, 320 * Math.pow(1.05, level-1))
  }
  maxHpForLevel(level:number){
    return Math.min(3, 1 + Math.floor((level-1)/3))
  }
  rowsForLevel(level:number){
    const r = 6 + Math.floor((level-1)/2)
    return Math.min(10, Math.max(6, r))
  }
  densityForLevel(level:number){
    return Math.max(0.70, Math.min(0.92, 0.70 + 0.03*(level-1)))
  }

  generateLevel(){
    this.bricks = []
    const cols = 12
    const rows = this.rowsForLevel(this.level)
    const density = this.densityForLevel(this.level)
    const brickW = Math.floor(this.width / cols)
    const brickH = 22
    const maxHp = this.maxHpForLevel(this.level)

    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(Math.random() < density){
          const hp = this.pickHp(maxHp)
          const b:Brick = { id:id('b'), x:c*brickW, y:40 + r*(brickH+6), w:brickW-4, h:brickH, hp, maxHp }
          this.bricks.push(b)
        }
      }
    }
    // ensure minimum bricks
    const minBricks = 40
    while(this.bricks.length < minBricks){
      const c = Math.floor(Math.random()*cols)
      const r = Math.floor(Math.random()*rows)
      const hp = this.pickHp(maxHp)
      const brickW = Math.floor(this.width / cols)
      const brickH = 22
      const b:Brick = { id:id('b'), x:c*brickW, y:40 + r*(brickH+6), w:brickW-4, h:brickH, hp, maxHp }
      this.bricks.push(b)
    }
  }

  pickHp(maxHp:number){
    if(maxHp === 1) return 1
    if(maxHp === 2) return (Math.random() < 0.7) ? 1 : 2
    // maxHp === 3 distribution: 60% hp1 / 30% hp2 / 10% hp3
    const r = Math.random()
    if(r < 0.6) return 1
    if(r < 0.9) return 2
    return 3
  }

  resetBallsForMode(){
    this.balls = []
    this.powerups = []
    if(this.mode === 'solo'){
      this.spawnBallOwned('team', true)
    } else if(this.mode === 'versus'){
      // place one served ball on each paddle
      this.spawnBallOwned('blue', true)
      this.spawnBallOwned('pink', true)
    } else {
      // co-op: single served ball positioned relative to paddles
      this.spawnBallOwned('team', true)
    }
    // reset paddles
    this.spawnPaddles()
  }

  spawnBallOwned(owner:'blue'|'pink'|'team', served = false){
    const speed = this.ballSpeedForLevel(this.level)
    if(served){
      // create a ball attached to its paddle (vx/vy = 0) until launch
      const b:Ball = { id:id('ball'), x:this.width/2, y:this.height - 80, r:8, vx:0, vy:0, owner, served:true }
      // position will be updated in update() to sit on top of paddle
      this.balls.push(b)
      return
    }
    // non-served: spawn with upward angled velocity
    const angle = (Math.random()*0.8 + 0.3) * Math.PI * -1
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    const b:Ball = { id:id('ball'), x:this.width/2, y:this.height - 80, r:8, vx, vy, owner, served:false }
    this.balls.push(b)
  }

  // Launch any balls that are currently in served state.
  // If `owner` is provided ("blue"/"pink"/"team"), only launch served balls that belong to that owner.
  launchServe(owner?: 'blue'|'pink'|'team'){
    const speed = this.ballSpeedForLevel(this.level)
    for(const b of this.balls){
      if(!b.served) continue
      if(owner){
        if(b.owner !== owner) continue
      }
      // determine small random upward angle away from vertical so it's not perfectly straight
      const angle = (Math.random()*0.6 + 0.2) * Math.PI * -1
      // use speed in pixels/sec directly
      b.vx = Math.cos(angle) * speed
      b.vy = Math.sin(angle) * speed
      b.served = false
    }
  }

  setPaddleInput(player:'blue'|'pink', dir:number){
    if(player === 'blue') this.input.blueDir = dir
    if(player === 'pink') this.input.pinkDir = dir
  }

  setPaused(p:boolean){ this.paused = p }

  start(){
    if(this.running) return
    this.running = true
    this.lastT = performance.now()
    this.startTime = performance.now()
    const loop = (t:number)=>{
      if(!this.running) return
      this.raf = requestAnimationFrame(loop)
      let dt = (t - this.lastT) / 1000
      if(dt > 0.25) dt = 0.25
      this.lastT = t
      if(!this.paused){
        this.accumulator += dt
        while(this.accumulator >= this.step){
          this.update(this.step)
          this.accumulator -= this.step
        }
        this.render()
      } else {
        // still render paused overlay
        this.render()
      }
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop(){
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  update(dt:number){
    // update survival timer
    if(this.mode === 'coop'){
      this.survivalTime += dt
      if(this.survivalTime > this.bestTime) this.bestTime = this.survivalTime
    }

    // move paddles
    for(const p of this.paddles){
      const speed = 480
      let dir = 0
      if(p.player === 'blue') dir = this.input.blueDir
      if(p.player === 'pink') dir = this.input.pinkDir
      // if solo, only blue exists
      p.x += dir * speed * dt
      // clamp
      p.x = Math.max(p.w/2, Math.min(this.width - p.w/2, p.x))
    }

    // move balls
    for(const b of this.balls){
      // if ball is served, attach to appropriate paddle and skip physics
      if(b.served){
        // find paddle for owner or choose central paddle
        let attach: Paddle | undefined
        if(b.owner === 'blue' || b.owner === 'pink') attach = this.paddles.find(p=>p.player === b.owner)
        if(!attach) attach = this.paddles[0]
        if(attach){
          b.x = attach.x
          b.y = attach.y - attach.h/2 - b.r - 2
        }
        continue
      }
      // apply active effects for speed
      let speedFactor = 1
      for(const ef of this.activeEffects){
        if(ef.kind === 'SLOW') speedFactor *= 0.8
        if(ef.kind === 'FAST') speedFactor *= 1.25
      }
      b.x += b.vx * dt * (speedFactor)
      b.y += b.vy * dt * (speedFactor)

      // wall collisions
      if(b.x - b.r < 0){ b.x = b.r; b.vx = Math.abs(b.vx) }
      if(b.x + b.r > this.width){ b.x = this.width - b.r; b.vx = -Math.abs(b.vx) }
      if(b.y - b.r < 0){ b.y = b.r; b.vy = Math.abs(b.vy) }
    }

    // ball-paddle collisions
    for(const b of [...this.balls]){
      for(const p of this.paddles){
        // owner rules
        if(this.mode === 'versus'){
          // blue ball only with blue paddle etc
          if(b.owner === 'blue' && p.player !== 'blue') continue
          if(b.owner === 'pink' && p.player !== 'pink') continue
        }

        // coop or solo: all balls bounce on both paddles (in coop both paddles are team-controlled)

        // AABB check
        const px = p.x - p.w/2, py = p.y - p.h/2
        if(b.x + b.r > px && b.x - b.r < px + p.w && b.y + b.r > py && b.y - b.r < py + p.h){
          // reflect: simple: place above paddle and invert vy
          b.y = py - b.r - 0.1
          // compute hit position to affect vx
          const rel = (b.x - p.x) / (p.w/2) // -1..1
          const speed = Math.hypot(b.vx, b.vy)
          const angle = rel * Math.PI * 0.4 + -Math.PI/2 // between -1.2..-0.8 rad -> upward
          b.vx = Math.cos(angle) * speed
          b.vy = Math.sin(angle) * speed
        }
      }
    }

    // ball-brick collisions
    for(const b of [...this.balls]){
      for(const br of [...this.bricks]){
        if(b.x + b.r > br.x && b.x - b.r < br.x + br.w && b.y + b.r > br.y && b.y - b.r < br.y + br.h){
          // simple response: invert vy
          // determine side collision by penetration depth
          const overlapX = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r))
          const overlapY = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r))
          if(overlapY < overlapX){
            b.vy = -b.vy
            if(b.y < br.y) b.y = br.y - b.r - 0.1
            else b.y = br.y + br.h + b.r + 0.1
          } else {
            b.vx = -b.vx
            if(b.x < br.x) b.x = br.x - b.r - 0.1
            else b.x = br.x + br.w + b.r + 0.1
          }
          // damage brick
          br.hp -= 1
          if(br.hp <= 0){
            // possibly drop powerup
            this.maybeDropPowerup(br)
            // remove brick
            const idx = this.bricks.indexOf(br)
            if(idx >= 0) this.bricks.splice(idx,1)
          }
          break
        }
      }
    }

    // move powerups
    for(const pu of this.powerups){
      pu.y += pu.vy * dt
    }

    // powerup - paddle collisions
    for(const pu of [...this.powerups]){
      // check both paddles, if collides with both same frame choose closest center x
      const hits:Paddle[] = []
      for(const p of this.paddles){
        const px = p.x - p.w/2, py = p.y - p.h/2
        if(pu.x + pu.w > px && pu.x < px + p.w && pu.y + pu.h > py && pu.y < py + p.h){
          hits.push(p)
        }
      }
      if(hits.length === 1){
        this.applyPowerupTo(hits[0], pu)
        const i = this.powerups.indexOf(pu); if(i>=0) this.powerups.splice(i,1)
      } else if(hits.length > 1){
        // choose paddle whose center is nearest to pu.x
        hits.sort((a,b)=> Math.abs(a.x - pu.x) - Math.abs(b.x - pu.x))
        this.applyPowerupTo(hits[0], pu)
        const i = this.powerups.indexOf(pu); if(i>=0) this.powerups.splice(i,1)
      }
    }

    // remove off-screen powerups
    for(const pu of [...this.powerups]){
      if(pu.y > this.height + 50){ const i = this.powerups.indexOf(pu); if(i>=0) this.powerups.splice(i,1) }
    }

    // remove balls that fall under bottom
    for(const b of [...this.balls]){
      if(b.y - b.r > this.height){
        const i = this.balls.indexOf(b); if(i>=0) this.balls.splice(i,1)
        // check pool logic after removal
        this.handleBallLoss(b)
      }
    }

    // clean expired effects
    const now = performance.now()
    for(const ef of [...this.activeEffects]){
      if(ef.until < now){ const i = this.activeEffects.indexOf(ef); if(i>=0) this.activeEffects.splice(i,1) }
    }

    // check level clear
    if(this.bricks.length === 0){
      // level cleared
      this.level += 1
      // difficulty scaling applied implicitly because formulas use level
      // reset balls per mode
      this.resetBallsForMode()
      // clear powerups
      this.powerups = []
    }

    // save best time
    if(this.mode === 'coop'){
      try{ localStorage.setItem('bb_best_time', String(this.bestTime)) }catch(e){}
    }

    // publish HUD
    this.publishState()
  }

  handleBallLoss(ball:Ball){
    // determine which pool
    if(this.mode === 'solo'){
      if(this.balls.length === 0){
        this.soloLives -= 1
        if(this.soloLives > 0){
          // serve 1 ball
          this.spawnBallOwned('team')
        } else {
          // game over
          this.onGameOver()
        }
      }
    } else if(this.mode === 'versus'){
      if(ball.owner === 'blue'){
        const anyBlue = this.balls.some(b=>b.owner === 'blue')
        if(!anyBlue){ this.blueLives -= 1; if(this.blueLives > 0) this.spawnBallOwned('blue'); else this.onGameOver() }
      }
      if(ball.owner === 'pink'){
        const anyPink = this.balls.some(b=>b.owner === 'pink')
        if(!anyPink){ this.pinkLives -= 1; if(this.pinkLives > 0) this.spawnBallOwned('pink'); else this.onGameOver() }
      }
    } else if(this.mode === 'coop'){
      if(this.balls.length === 0){
        this.teamLives -= 1
        if(this.teamLives > 0){ this.spawnBallOwned('team') }
        else this.onGameOver()
      }
    }
  }

  onGameOver(){
    // mark paused and stop progression
    this.paused = true
    // if coop save best
    if(this.mode === 'coop'){
      try{ localStorage.setItem('bb_best_time', String(this.bestTime)) }catch(e){}
    }
  }

  maybeDropPowerup(brick:Brick){
    const chance = 0.18
    if(Math.random() < chance){
      // pick random powerup
      const kinds: PowerupKind[] = ['EXPAND','SHRINK','SLOW','FAST','MULTIBALL','EXTRA_LIFE']
      const kind = kinds[Math.floor(Math.random()*kinds.length)]
      const pu:Powerup = { id:id('pu'), x: brick.x + brick.w/2 - 12, y: brick.y + brick.h/2, w:24, h:24, kind, vy: 120 }
      this.powerups.push(pu)
    }
  }

  applyPowerupTo(paddle:Paddle, pu:Powerup){
    // Determine target semantics
    if(this.mode === 'coop'){
      // global team effect
      this.activateEffect(pu.kind, 'team')
    } else if(this.mode === 'versus'){
      // paddle effects affect only that player, ball effects affect that player's balls
      const target = paddle.player // 'blue' or 'pink'
      if(pu.kind === 'EXTRA_LIFE'){
        if(target === 'blue') this.blueLives = Math.min(3, this.blueLives + 1)
        if(target === 'pink') this.pinkLives = Math.min(3, this.pinkLives + 1)
      } else if(pu.kind === 'MULTIBALL'){
        // spawn +2 balls for that player
        this.spawnBallOwned(target as any); this.spawnBallOwned(target as any)
      } else if(pu.kind === 'EXPAND' || pu.kind === 'SHRINK' || pu.kind === 'SLOW' || pu.kind === 'FAST'){
        this.activateEffect(pu.kind, target)
      }
    } else { // solo
      if(pu.kind === 'EXTRA_LIFE'){
        this.soloLives += 1
      } else if(pu.kind === 'MULTIBALL'){
        this.spawnBallOwned('team'); this.spawnBallOwned('team')
      } else {
        this.activateEffect(pu.kind, 'both')
      }
    }
  }

  activateEffect(kind:PowerupKind, target:'blue'|'pink'|'both'|'team'){
    const now = performance.now()
    let duration = 10000
    if(kind === 'EXPAND' || kind === 'SHRINK') duration = 12000
    if(kind === 'SLOW' || kind === 'FAST') duration = 10000
    this.activeEffects.push({ kind, until: now + duration, target })
    // apply immediate effects for paddles width
    if(kind === 'EXPAND'){
      for(const p of this.paddles){ if(target === 'both' || target === 'team' || p.player === target) p.w = p.w * 1.5 }
    }
    if(kind === 'SHRINK'){
      for(const p of this.paddles){ if(target === 'both' || target === 'team' || p.player === target) p.w = Math.max(40, p.w * 0.7) }
    }
    // For SLOW/FAST we just record activeEffects and used in ball movement
    // MULTIBALL handled where applied
  }

  render(){
    const ctx = this.ctx
    ctx.clearRect(0,0,this.width,this.height)
    // draw bricks
    for(const br of this.bricks){
      const t = br.hp / br.maxHp
      ctx.fillStyle = `hsl(${Math.floor(120*t)},60%,50%)`
      ctx.fillRect(br.x, br.y, br.w, br.h)
      ctx.strokeStyle = '#222'
      ctx.strokeRect(br.x, br.y, br.w, br.h)
      // hp text
      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.fillText(String(br.hp), br.x + 6, br.y + 14)
    }

    // draw paddles
    for(const p of this.paddles){
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.w/2, p.y - p.h/2, p.w, p.h)
      ctx.strokeStyle = '#000'
      ctx.strokeRect(p.x - p.w/2, p.y - p.h/2, p.w, p.h)
    }

    // draw balls
    for(const b of this.balls){
      ctx.beginPath(); ctx.fillStyle = (b.owner === 'blue' ? 'cyan' : b.owner === 'pink' ? 'hotpink' : 'white'); ctx.arc(b.x, b.y, b.r,0,Math.PI*2); ctx.fill();
    }

    // draw powerups
    for(const pu of this.powerups){
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(pu.x, pu.y, pu.w, pu.h)
      ctx.fillStyle = '#000'
      ctx.font = '10px sans-serif'
      ctx.fillText(pu.kind[0], pu.x + 6, pu.y + 16)
    }

    // overlay HUD text bottom-left
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(6, this.height - 46, 220, 40)
    ctx.fillStyle = '#fff'
    ctx.font = '14px sans-serif'
    if(this.mode === 'solo') ctx.fillText(`Lives: ${this.soloLives}  Level: ${this.level}`, 12, this.height - 24)
    if(this.mode === 'versus') ctx.fillText(`Blue: ${this.blueLives} Pink: ${this.pinkLives} Level: ${this.level}`, 12, this.height - 24)
    if(this.mode === 'coop') ctx.fillText(`Team: ${this.teamLives} Level: ${this.level} Time: ${Math.floor(this.survivalTime)}s Best: ${Math.floor(this.bestTime)}s`, 12, this.height - 24)

    // if paused
    if(this.paused){
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0,0,this.width,this.height)
      ctx.fillStyle = '#fff'
      ctx.font = '28px sans-serif'
      ctx.fillText('PAUSED', this.width/2 - 60, this.height/2)
    }
  }

  publishState(){
    const hud:Hud = { mode: this.mode, level: this.level }
    if(this.mode === 'solo') hud.lives = this.soloLives
    if(this.mode === 'versus'){ hud.blueLives = this.blueLives; hud.pinkLives = this.pinkLives }
    if(this.mode === 'coop'){ hud.teamLives = this.teamLives; hud.survivalTime = this.survivalTime }
    if(this.onStateChanged) this.onStateChanged({ hud })
  }
}


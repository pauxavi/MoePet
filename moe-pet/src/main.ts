import './style.css'
import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'

// 宠物状态
interface PetState {
  x: number
  y: number
  direction: 1 | -1
  frame: number
  state: 'idle' | 'walk' | 'sleep'
  mood: number
  hunger: number
  energy: number
  outfit: number
  customImage: string | null
}

// 外观配置
const outfits = [
  { name: '粉粉', body: '#FFE4EC', hair: '#E8D4F0', hairShadow: '#D4B8E0' },
  { name: '蓝蓝', body: '#E4F4FF', hair: '#D4E8F0', hairShadow: '#B8D4E0' },
  { name: '绿绿', body: '#E4FFE8', hair: '#D4F0E0', hairShadow: '#B8E0D0' },
  { name: '黄黄', body: '#FFF8E4', hair: '#F0F0D4', hairShadow: '#E0E0B8' }
]

const petConfig = {
  width: 120,
  height: 140,
  speed: 1.5,
  canvasWidth: 200,
  canvasHeight: 300
}

const DECAY = {
  mood: 5 * 60 * 1000,
  hunger: 10 * 60 * 1000,
  energy: 3 * 60 * 1000
}

let lastDecayTime = 0

const state: PetState = {
  x: 40,
  y: 100,
  direction: 1,
  frame: 0,
  state: 'walk',
  mood: 80,
  hunger: 80,
  energy: 100,
  outfit: 0,
  customImage: null
}

let canvas: HTMLCanvasElement
let ctx: CanvasRenderingContext2D
let lastTime = 0
let contextMenu: HTMLDivElement | null = null
let customImg: HTMLImageElement | null = null

function init() {
  const app = document.querySelector<HTMLDivElement>('#app')!

  canvas = document.createElement('canvas')
  canvas.width = petConfig.canvasWidth
  canvas.height = petConfig.canvasHeight
  canvas.style.cssText = `
    position: fixed;
    bottom: 0;
    right: 20px;
    cursor: grab;
  `

  canvas.addEventListener('contextmenu', showContextMenu)
  canvas.addEventListener('click', hideContextMenu)
  canvas.addEventListener('mousedown', startDrag)

  app.appendChild(canvas)

  ctx = canvas.getContext('2d')!
  createContextMenu()

  lastDecayTime = performance.now()
  requestAnimationFrame(gameLoop)
}

async function startDrag(e: MouseEvent) {
  if (e.button !== 0) return
  try {
    const win = getCurrentWindow()
    await win.startDragging()
  } catch (e) {
    console.log('Drag not available:', e)
  }
}

function createContextMenu() {
  contextMenu = document.createElement('div')
  contextMenu.style.cssText = `
    position: fixed;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    padding: 8px 0;
    min-width: 160px;
    display: none;
    z-index: 10000;
    font-size: 14px;
  `

  const statusDiv = document.createElement('div')
  statusDiv.id = 'pet-status'
  statusDiv.style.cssText = 'padding: 8px 16px; color: #666; border-bottom: 1px solid #eee;'
  contextMenu.appendChild(statusDiv)

  const outfitLabel = document.createElement('div')
  outfitLabel.textContent = '🎨 换装'
  outfitLabel.style.cssText = 'padding: 4px 16px; color: #999; font-size: 12px;'
  contextMenu.appendChild(outfitLabel)

  outfits.forEach((outfit, i) => {
    const item = document.createElement('div')
    item.textContent = `   ${outfit.name}`
    item.style.cssText = 'padding: 6px 16px; cursor: pointer;'
    item.onmouseover = () => item.style.background = '#f5f5f5'
    item.onmouseout = () => item.style.background = 'transparent'
    item.onclick = () => {
      state.outfit = i
      state.customImage = null
      customImg = null
      hideContextMenu()
    }
    contextMenu!.appendChild(item)
  })

  const divider1 = document.createElement('div')
  divider1.style.cssText = 'height: 1px; background: #eee; margin: 4px 0'
  contextMenu.appendChild(divider1)

  const customItem = document.createElement('div')
  customItem.textContent = state.customImage ? '🔄 恢复默认形象' : '🖼️ 使用本地图片'
  customItem.style.cssText = 'padding: 6px 16px; cursor: pointer;'
  customItem.onmouseover = () => customItem.style.background = '#f5f5f5'
  customItem.onmouseout = () => customItem.style.background = 'transparent'
  customItem.onclick = async () => {
    if (state.customImage) {
      state.customImage = null
      customImg = null
      customItem.textContent = '🖼️ 使用本地图片'
    } else {
      try {
        const selected = await open({
          multiple: false,
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
        })
        if (selected && typeof selected === 'string') {
          state.customImage = selected
          loadCustomImage(selected)
          customItem.textContent = '🔄 恢复默认形象'
        }
      } catch (e) {
        console.log('File dialog error:', e)
      }
    }
    hideContextMenu()
  }
  contextMenu!.appendChild(customItem)

  const divider2 = document.createElement('div')
  divider2.style.cssText = 'height: 1px; background: #eee; margin: 4px 0'
  contextMenu.appendChild(divider2)

  const feedItem = document.createElement('div')
  feedItem.textContent = '🍱 喂食 (+30 饱腹)'
  feedItem.style.cssText = 'padding: 6px 16px; cursor: pointer;'
  feedItem.onmouseover = () => feedItem.style.background = '#f5f5f5'
  feedItem.onmouseout = () => feedItem.style.background = 'transparent'
  feedItem.onclick = () => {
    state.hunger = Math.min(100, state.hunger + 30)
    showBubble('好吃!')
    hideContextMenu()
  }
  contextMenu!.appendChild(feedItem)

  const playItem = document.createElement('div')
  playItem.textContent = '🎾 玩耍 (+心情 -精力)'
  playItem.style.cssText = 'padding: 6px 16px; cursor: pointer;'
  playItem.onmouseover = () => playItem.style.background = '#f5f5f5'
  playItem.onmouseout = () => playItem.style.background = 'transparent'
  playItem.onclick = () => {
    state.mood = Math.min(100, state.mood + 20)
    state.energy = Math.max(0, state.energy - 15)
    showBubble('开心!')
    hideContextMenu()
  }
  contextMenu!.appendChild(playItem)

  const petItem = document.createElement('div')
  petItem.textContent = '👋 抚摸 (+10 心情)'
  petItem.style.cssText = 'padding: 6px 16px; cursor: pointer;'
  petItem.onmouseover = () => petItem.style.background = '#f5f5f5'
  petItem.onmouseout = () => petItem.style.background = 'transparent'
  petItem.onclick = () => {
    state.mood = Math.min(100, state.mood + 10)
    showBubble('嘿嘿~')
    hideContextMenu()
  }
  contextMenu!.appendChild(petItem)

  document.body.appendChild(contextMenu)
}

function loadCustomImage(path: string) {
  customImg = new Image()
  // 使用 convert-file-src 将文件路径转为 URL
  customImg.src = `https://asset.localhost/${path}`
  customImg.onerror = () => {
    console.error('Failed to load custom image')
    state.customImage = null
    customImg = null
  }
}

function updateStatusMenu() {
  const statusDiv = document.getElementById('pet-status')
  if (!statusDiv) return

  const moodEmoji = state.mood > 70 ? '😊' : state.mood < 30 ? '😢' : '😐'
  const hungerEmoji = state.hunger > 70 ? '🍗' : state.hunger < 20 ? '😰' : '😋'
  const energyEmoji = state.energy > 70 ? '⚡' : state.energy < 20 ? '😴' : '💪'

  statusDiv.innerHTML = `
    <div>❤️ 心情: ${state.mood} ${moodEmoji}</div>
    <div>🍗 饱腹: ${state.hunger} ${hungerEmoji}</div>
    <div>⚡ 精力: ${state.energy} ${energyEmoji}</div>
  `
}

let bubbleText = ''
let bubbleTime = 0

function showBubble(text: string) {
  bubbleText = text
  bubbleTime = 60
}

function showContextMenu(e: MouseEvent) {
  e.preventDefault()
  updateStatusMenu()
  if (!contextMenu) return
  contextMenu.style.display = 'block'
  contextMenu.style.left = `${e.clientX}px`
  contextMenu.style.top = `${e.clientY}px`
}

function hideContextMenu() {
  if (contextMenu) {
    contextMenu.style.display = 'none'
  }
}

function decayStatus(now: number) {
  if (now - lastDecayTime < 1000) return

  const elapsed = now - lastDecayTime

  if (elapsed >= DECAY.mood) {
    state.mood = Math.max(0, state.mood - 1)
    lastDecayTime = now
  }
  if (elapsed >= DECAY.hunger) {
    state.hunger = Math.max(0, state.hunger - 1)
  }
  if (elapsed >= DECAY.energy) {
    state.energy = Math.max(0, state.energy - 1)
  }
}

function updateAutoBehavior() {
  if (state.energy < 5) {
    state.state = 'sleep'
  } else if (state.energy < 20) {
    state.state = 'idle'
  } else if (state.mood < 30) {
    state.state = 'walk'
  } else if (state.hunger < 20) {
    state.state = 'walk'
  } else {
    state.state = Math.random() < 0.7 ? 'walk' : 'idle'
  }

  if (state.state === 'sleep') {
    state.energy = Math.min(100, state.energy + 0.5)
    state.mood = Math.min(100, state.mood + 0.1)
    state.hunger = Math.max(0, state.hunger - 0.05)
  }
}

function drawPet(x: number, y: number, direction: 1 | -1, frame: number) {
  if (state.customImage && customImg && customImg.complete) {
    ctx.save()
    ctx.translate(x + petConfig.width / 2, y)
    ctx.scale(direction, 1)
    ctx.translate(-petConfig.width / 2, -petConfig.height / 2)

    const sway = Math.sin(frame * 0.1) * 5
    const scale = Math.min(petConfig.width / customImg.width, petConfig.height / customImg.height)
    const dw = customImg.width * scale
    const dh = customImg.height * scale
    const dx = (petConfig.width - dw) / 2
    const dy = (petConfig.height - dh) / 2 + sway

    ctx.drawImage(customImg, dx, dy, dw, dh)
    ctx.restore()
    return
  }

  const outfit = outfits[state.outfit]
  const moodOffset = state.mood < 30 ? 3 : 0

  ctx.save()
  ctx.translate(x + petConfig.width / 2, y)
  ctx.scale(direction, 1)
  ctx.translate(-petConfig.width / 2, -petConfig.height / 2)

  ctx.fillStyle = outfit.body
  ctx.beginPath()
  ctx.ellipse(petConfig.width / 2, petConfig.height * 0.65, 35, 40, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = outfit.body
  ctx.beginPath()
  ctx.arc(petConfig.width / 2, petConfig.height * 0.35, 30, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = outfit.hair
  ctx.beginPath()
  ctx.arc(petConfig.width / 2, petConfig.height * 0.28, 28, Math.PI, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = outfit.hairShadow
  ctx.beginPath()
  ctx.moveTo(petConfig.width / 2 - 25, petConfig.height * 0.25)
  ctx.quadraticCurveTo(petConfig.width / 2 - 15, petConfig.height * 0.35, petConfig.width / 2 - 20, petConfig.height * 0.42)
  ctx.lineTo(petConfig.width / 2 - 22, petConfig.height * 0.28)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(petConfig.width / 2 + 25, petConfig.height * 0.25)
  ctx.quadraticCurveTo(petConfig.width / 2 + 15, petConfig.height * 0.35, petConfig.width / 2 + 20, petConfig.height * 0.42)
  ctx.lineTo(petConfig.width / 2 + 22, petConfig.height * 0.28)
  ctx.fill()

  const eyeOffsetY = petConfig.height * 0.02
  ctx.fillStyle = '#4A4A4A'
  if (state.mood < 30) {
    ctx.beginPath()
    ctx.ellipse(petConfig.width / 2 - 10, petConfig.height * 0.37 + moodOffset, 5, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(petConfig.width / 2 + 10, petConfig.height * 0.37 + moodOffset, 5, 4, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.ellipse(petConfig.width / 2 - 10, petConfig.height * 0.35 + eyeOffsetY, 5, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(petConfig.width / 2 + 10, petConfig.height * 0.35 + eyeOffsetY, 5, 6, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(petConfig.width / 2 - 8, petConfig.height * 0.33 + eyeOffsetY, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(petConfig.width / 2 + 12, petConfig.height * 0.33 + eyeOffsetY, 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#FFB6C1'
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  ctx.ellipse(petConfig.width / 2 - 20, petConfig.height * 0.42, 8, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(petConfig.width / 2 + 20, petConfig.height * 0.42, 8, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.strokeStyle = '#E88A9E'
  ctx.lineWidth = 2
  ctx.beginPath()
  if (state.state === 'sleep') {
    ctx.arc(petConfig.width / 2, petConfig.height * 0.5, 5, 0.2 * Math.PI, 0.8 * Math.PI)
  } else if (state.mood < 30) {
    ctx.arc(petConfig.width / 2, petConfig.height * 0.52, 5, 1.2 * Math.PI, 1.8 * Math.PI)
  } else {
    ctx.arc(petConfig.width / 2, petConfig.height * 0.48, 5, 0.1 * Math.PI, 0.9 * Math.PI)
  }
  ctx.stroke()

  const tailWag = Math.sin(frame * 0.2) * 15
  ctx.fillStyle = outfit.body
  ctx.save()
  ctx.translate(petConfig.width / 2 + 25, petConfig.height * 0.6)
  ctx.rotate((tailWag * Math.PI) / 180)
  ctx.beginPath()
  ctx.ellipse(0, 0, 8, 20, 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const footOffset = state.state === 'walk' ? Math.sin(frame * 0.4) * 5 : 0
  ctx.fillStyle = outfit.body
  ctx.beginPath()
  ctx.ellipse(petConfig.width / 2 - 15, petConfig.height * 0.85 + footOffset, 10, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(petConfig.width / 2 + 15, petConfig.height * 0.85 - footOffset, 10, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  if (bubbleTime > 0) {
    drawBubble(x, y, bubbleText)
    bubbleTime--
  } else if (state.mood > 70) {
    drawMoodBubble(x, y, '♥')
  } else if (state.mood < 30) {
    drawMoodBubble(x, y, '💧')
  } else if (state.hunger < 20) {
    drawMoodBubble(x, y, '🍗')
  } else if (state.energy < 20) {
    drawMoodBubble(x, y, '😴')
  }

  ctx.restore()
}

function drawBubble(x: number, y: number, text: string) {
  ctx.font = '16px sans-serif'
  const metrics = ctx.measureText(text)
  const padding = 8

  ctx.fillStyle = 'white'
  ctx.strokeStyle = '#ddd'
  ctx.lineWidth = 1
  const bx = x + petConfig.width / 2 - metrics.width / 2 - padding
  const by = y - 40
  const bw = metrics.width + padding * 2
  const bh = 24

  ctx.beginPath()
  ctx.roundRect(bx, by, bw, bh, 4)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#333'
  ctx.fillText(text, x + petConfig.width / 2 - metrics.width / 2, y - 24)
}

function drawMoodBubble(x: number, y: number, emoji: string) {
  ctx.font = '20px sans-serif'
  ctx.fillText(emoji, x + petConfig.width / 2 - 10, y - 10)
}

function update(_deltaTime: number) {
  state.frame++
  decayStatus(performance.now())
  updateAutoBehavior()

  if (state.state === 'walk') {
    state.x += petConfig.speed * state.direction

    if (state.x <= 10) {
      state.x = 10
      state.direction = 1
    } else if (state.x >= petConfig.canvasWidth - petConfig.width - 10) {
      state.x = petConfig.canvasWidth - petConfig.width - 10
      state.direction = -1
    }

    if (Math.random() < 0.005) {
      state.direction = state.direction === 1 ? -1 : 1
    }
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.beginPath()
  ctx.ellipse(state.x + petConfig.width / 2, petConfig.height + 5, 30, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  drawPet(state.x, state.y, state.direction, state.frame)
}

function gameLoop(timestamp: number) {
  const deltaTime = timestamp - lastTime
  lastTime = timestamp

  update(deltaTime)
  render()

  requestAnimationFrame(gameLoop)
}

init()

console.log('MoePet started! 🐱')
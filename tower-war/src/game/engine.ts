export class Game {
  towers: Tower[] = [];
  units: Unit[] = [];
  selectedTower: Tower | null = null;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initLevel();
    this.bindEvents();
    this.loop(0);
  }

  initLevel() {
    // Player Tower
    this.towers.push(new Tower(100, 300, 'player', 10));
    // Enemy Tower
    this.towers.push(new Tower(700, 300, 'enemy', 10));
    // Neutral Towers
    this.towers.push(new Tower(400, 150, 'neutral', 5));
    this.towers.push(new Tower(400, 450, 'neutral', 5));
  }

  bindEvents() {
    let isDragging = false;
    
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      const { x, y } = getPos(e);
      const tower = this.towers.find(t => t.isInside(x, y));
      if (tower && tower.owner === 'player') {
        this.selectedTower = tower;
        isDragging = true;
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !this.selectedTower) return;
      const { x, y } = getPos(e);
      // Draw drag line (handled in render)
      this.dragEndPos = { x, y };
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !this.selectedTower) return;
      isDragging = false;
      this.dragEndPos = null;

      // Check if dropped on another tower
      // For touchend, changedTouches logic needed, simplified here for now
      let x, y;
      if ('changedTouches' in e) {
         x = e.changedTouches[0].clientX - this.canvas.getBoundingClientRect().left;
         y = e.changedTouches[0].clientY - this.canvas.getBoundingClientRect().top;
      } else {
         x = (e as MouseEvent).clientX - this.canvas.getBoundingClientRect().left;
         y = (e as MouseEvent).clientY - this.canvas.getBoundingClientRect().top;
      }
      
      const target = this.towers.find(t => t !== this.selectedTower && t.isInside(x, y));
      if (target) {
        this.selectedTower.attack(target, this);
      }
      this.selectedTower = null;
    };

    this.canvas.addEventListener('mousedown', handleStart);
    this.canvas.addEventListener('mousemove', handleMove);
    this.canvas.addEventListener('mouseup', handleEnd);
    
    this.canvas.addEventListener('touchstart', handleStart);
    this.canvas.addEventListener('touchmove', handleMove);
    this.canvas.addEventListener('touchend', handleEnd);
  }

  dragEndPos: { x: number, y: number } | null = null;

  update(dt: number) {
    // Update Towers (Generation)
    this.towers.forEach(t => t.update(dt));

    // Update Units
    this.units.forEach((u, i) => {
      u.update(dt);
      if (u.isDead) {
        this.units.splice(i, 1);
        return;
      }
      // Collision with target
      if (u.hasReachedTarget()) {
        u.target.takeDamage(u);
        u.isDead = true;
      }
    });

    // Simple AI
    this.runAI();
  }

  runAI() {
    // Enemy simple logic: find strongest enemy tower, attack weakest player/neutral tower
    if (Math.random() > 0.02) return; // Limit frequency

    const enemyTowers = this.towers.filter(t => t.owner === 'enemy');
    const targets = this.towers.filter(t => t.owner !== 'enemy');

    enemyTowers.forEach(t => {
      if (t.count > 15) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        if (target) {
          t.attack(target, this);
        }
      }
    });
  }

  render() {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Drag Line
    if (this.selectedTower && this.dragEndPos) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.selectedTower.x, this.selectedTower.y);
      this.ctx.lineTo(this.dragEndPos.x, this.dragEndPos.y);
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Draw Units
    this.units.forEach(u => u.draw(this.ctx));

    // Draw Towers
    this.towers.forEach(t => t.draw(this.ctx));
  }

  loop(timestamp: number) {
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }
}

class Tower {
  x: number;
  y: number;
  radius: number = 30;
  owner: 'player' | 'enemy' | 'neutral';
  count: number;
  timer: number = 0;

  constructor(x: number, y: number, owner: 'player' | 'enemy' | 'neutral', count: number) {
    this.x = x;
    this.y = y;
    this.owner = owner;
    this.count = count;
  }

  update(dt: number) {
    if (this.owner !== 'neutral') {
      this.timer += dt;
      if (this.timer > 1) { // Generate 1 unit per second
        this.count++;
        this.timer = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.getColor();
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(this.count).toString(), this.x, this.y);
  }

  getColor() {
    switch (this.owner) {
      case 'player': return '#3b82f6';
      case 'enemy': return '#ef4444';
      default: return '#9ca3af';
    }
  }

  isInside(x: number, y: number) {
    const dx = this.x - x;
    const dy = this.y - y;
    return dx * dx + dy * dy < this.radius * this.radius;
  }

  attack(target: Tower, game: Game) {
    const unitsToSend = Math.floor(this.count / 2);
    if (unitsToSend <= 0) return;

    this.count -= unitsToSend;
    for (let i = 0; i < unitsToSend; i++) {
      // Stagger units slightly
      setTimeout(() => {
        game.units.push(new Unit(this.x, this.y, target, this.owner));
      }, i * 100);
    }
  }

  takeDamage(unit: Unit) {
    if (unit.owner === this.owner) {
      this.count++;
    } else {
      this.count--;
      if (this.count <= 0) {
        this.owner = unit.owner;
        this.count = Math.abs(this.count);
      }
    }
  }
}

class Unit {
  x: number;
  y: number;
  target: Tower;
  owner: 'player' | 'enemy' | 'neutral';
  speed: number = 100;
  isDead: boolean = false;

  constructor(x: number, y: number, target: Tower, owner: 'player' | 'enemy' | 'neutral') {
    this.x = x;
    this.y = y;
    this.target = target;
    this.owner = owner;
  }

  update(dt: number) {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
  }

  hasReachedTarget() {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    return (dx * dx + dy * dy) < 900; // Hit radius squared (30*30)
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = this.owner === 'player' ? '#93c5fd' : '#fca5a5';
    ctx.fill();
  }
}

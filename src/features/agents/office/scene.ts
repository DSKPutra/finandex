// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Agent Office 3D scene (AGENTIC_AI_PROMPT §7.1), three.js. 8 rooms = the 8 categories (§10.2); each Dex agent sits at
// its own desk with a monitor; the Conductor's round table is in the central corridor, the Guard at the lobby gate
// (questions in, answers out), the Verifier at the end of the corridor with a stamp and a "removed claims" box.
// Everything that moves is driven by real SSE events — never by a fake "busy" loop. Colours come from the active theme
// tokens ("Spektrum" light/dark; rooms use the category colours) and are re-read when the theme changes. Rendering stops when the tab is hidden or the
// canvas is off-screen; DPR ≤ 2 (≤ 1.5 on mobile); shadows off on mobile; reduced motion = static camera, no walking or
// flying, state still visible on monitors, floor rings and labels.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { OFFICE_ROOMS } from '../../../config/agents';
import { GROUP_COLORS, TOKENS } from '../../../config/brand';
import type { DexGroupId } from '../../../config/dex-groups';
import type { AgentId, AgentPhase } from '../../../shared/agents';
import type { SseEvent } from '../../../shared/chat-protocol';

type Rgb = { r: number; g: number; b: number; a: number };
export type Palette = { field: string; pane: string; pane2: string; edge: string; ink: string; muted: string; primary: string; data: string; ai: string; flag: string; negative: string; quote: string; series: string[] };

function parseCss(c: string): Rgb {
  const s = c.trim();
  const m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const [r, g, b, a] = m[1]!.split(',').map((x) => parseFloat(x));
    return { r: r! / 255, g: g! / 255, b: b! / 255, a: a ?? 1 };
  }
  const col = new THREE.Color(s.startsWith('#') ? s : TOKENS.light['ink-muted']);
  return { r: col.r, g: col.g, b: col.b, a: 1 };
}
/** Blend a translucent token (e.g. --edge) over the page background into an opaque colour. */
function solid(c: string, over: string): THREE.Color {
  const a = parseCss(c);
  const b = parseCss(over);
  return new THREE.Color(a.r * a.a + b.r * (1 - a.a), a.g * a.a + b.g * (1 - a.a), a.b * a.a + b.b * (1 - a.a));
}

export function readPalette(el: HTMLElement = document.documentElement): Palette {
  const cs = getComputedStyle(el);
  const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
  const t = TOKENS.light;
  return {
    field: v('--field-1', t['field-1']), pane: v('--pane', t.pane), pane2: v('--pane-2', t['pane-2']), edge: v('--edge', t.edge), ink: v('--ink', t.ink), muted: v('--ink-muted', t['ink-muted']),
    primary: v('--primary', t.primary), data: v('--data', t.data), ai: v('--ai', t.ai), flag: v('--flag', t.flag), negative: v('--negative', t.negative), quote: v('--quote', t.quote),
    series: GROUP_COLORS.light.map((c, i) => v(`--group-${i + 1}`, c)),
  };
}

const PHASE_COLOR: Record<AgentPhase | 'done' | 'idle', keyof Palette> = { planning: 'ai', loading_skill: 'ai', calling_tool: 'data', reading_data: 'data', verifying: 'flag', writing: 'ai', done: 'primary', idle: 'muted' };

type Desk = { id: AgentId; room: DexGroupId | 'corridor'; seat: THREE.Vector3; door: THREE.Vector3; person: THREE.Group; arms: THREE.Mesh[]; monitor: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; mesh: THREE.Mesh }; ring: THREE.Mesh; shirt: THREE.MeshStandardMaterial; seriesIndex: number; phase: AgentPhase | 'done' | 'idle'; label: string; working: boolean };
type Tween = { obj: THREE.Object3D; path: THREE.Vector3[]; speed: number; seg: number; t: number; done?: () => void; remove?: boolean };

export type OfficeOptions = { reducedMotion: boolean; mobile: boolean; labels: { conductor: string; guard: string; verifier: string; removed: string; roomLabel: (group: DexGroupId) => string }; onSelect: (id: AgentId | null) => void; onRoom: (group: DexGroupId) => void; onUserCamera: () => void; roomName: (g: DexGroupId) => string };

const ROOM_W = 10;
const ROOM_D = 8;
const CORRIDOR = 2.6;
const roomCenter = (i: number) => new THREE.Vector3(-15 + (i % 4) * 10, 0, i < 4 ? -(CORRIDOR + ROOM_D / 2) : CORRIDOR + ROOM_D / 2);

export class OfficeScene {
  private renderer: THREE.WebGLRenderer;
  private css: CSS2DRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private desks = new Map<AgentId, Desk>();
  private roomLabels = new Map<DexGroupId, { el: HTMLButtonElement; obj: CSS2DObject; count: number }>();
  private floors = new Map<DexGroupId, THREE.MeshStandardMaterial>();
  private materials: { floor: THREE.MeshStandardMaterial; wall: THREE.MeshStandardMaterial; desk: THREE.MeshStandardMaterial; skin: THREE.MeshStandardMaterial; corridor: THREE.MeshStandardMaterial; card: THREE.MeshStandardMaterial; envelope: THREE.MeshStandardMaterial; stamp: THREE.MeshStandardMaterial };
  private tweens: Tween[] = [];
  private stamp!: THREE.Mesh;
  private removedBox!: THREE.Group;
  private removedCount = 0;
  private palette: Palette;
  private raf = 0;
  private visible = true;
  private onScreen = true;
  private dirty = true;
  private follow = true;
  private focusTarget: THREE.Vector3 | null = null;
  private clock = new THREE.Clock();
  private io: IntersectionObserver;
  private ro: ResizeObserver;
  private down: { x: number; y: number } | null = null;
  private programmatic = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly opts: OfficeOptions,
  ) {
    this.palette = readPalette();
    const w = host.clientWidth || 800;
    const h = host.clientHeight || 520;
    this.renderer = new THREE.WebGLRenderer({ antialias: !opts.mobile, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.5 : 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = !opts.mobile;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.className = 'block h-full w-full rounded-pane';
    host.appendChild(this.renderer.domElement);
    this.css = new CSS2DRenderer();
    this.css.setSize(w, h);
    Object.assign(this.css.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    host.appendChild(this.css.domElement);
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.5, 200);
    this.camera.position.set(0, 26, 24);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.maxPolarAngle = Math.PI * 0.45;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 70;
    this.controls.enableDamping = !opts.reducedMotion;
    this.controls.addEventListener('change', () => {
      this.dirty = true;
      if (!this.programmatic) {
        this.follow = false;
        this.focusTarget = null;
        this.opts.onUserCamera();
      }
    });
    const mat = (c: THREE.ColorRepresentation, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, ...extra });
    this.materials = { floor: mat(0xffffff), wall: mat(0xffffff), desk: mat(0xffffff), skin: mat(0xffffff), corridor: mat(0xffffff), card: mat(0xffffff), envelope: mat(0xffffff), stamp: mat(0xffffff) };
    this.build();
    this.applyPalette();
    this.renderer.domElement.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY }));
    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) < 6) this.pick(e);
      this.down = null;
    });
    this.io = new IntersectionObserver((es) => {
      this.onScreen = es.some((x) => x.isIntersecting);
      this.dirty = true;
      this.kick();
    });
    this.io.observe(host);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    document.addEventListener('visibilitychange', this.onVis);
    this.kick();
  }

  private onVis = () => {
    this.visible = !document.hidden;
    this.dirty = true;
    this.kick();
  };

  private resize() {
    const w = this.host.clientWidth || 800;
    const h = this.host.clientHeight || 520;
    this.renderer.setSize(w, h);
    this.css.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // setSize clears the drawing buffer: redraw now rather than waiting for the next scheduled frame.
    this.renderer.render(this.scene, this.camera);
    this.css.render(this.scene, this.camera);
    this.dirty = true;
    this.kick();
  }

  // ---------------------------------------------------------------- build
  private person(seriesIndex: number): { g: THREE.Group; arms: THREE.Mesh[]; shirt: THREE.MeshStandardMaterial } {
    const g = new THREE.Group();
    const shirt = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 4, 10), shirt);
    body.position.y = 0.75;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), this.materials.skin);
    head.position.y = 1.42;
    const armGeo = new THREE.BoxGeometry(0.12, 0.12, 0.5);
    const arms = [-0.3, 0.3].map((x) => {
      const a = new THREE.Mesh(armGeo, shirt);
      a.position.set(x, 0.92, -0.28);
      return a;
    });
    for (const m of [body, head, ...arms]) {
      m.castShadow = !this.opts.mobile;
      g.add(m);
    }
    g.userData.seriesIndex = seriesIndex;
    return { g, arms, shirt };
  }

  private monitor(): Desk['monitor'] {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshBasicMaterial({ map: tex }));
    return { canvas, tex, mesh };
  }

  private addDesk(id: AgentId, room: DexGroupId | 'corridor', seat: THREE.Vector3, door: THREE.Vector3, seriesIndex: number, facing = 0, withDesk = true) {
    // Local layout (facing −z): desk and monitor in front of the seat; the group is placed at the seat and rotated.
    const grp = new THREE.Group();
    grp.position.copy(seat);
    grp.rotation.y = facing;
    if (withDesk) {
      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.9), this.materials.desk);
      deskTop.position.set(0, 0.78, -0.75);
      deskTop.castShadow = deskTop.receiveShadow = !this.opts.mobile;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.74, 0.8), this.materials.desk);
      leg.position.set(0, 0.37, -0.75);
      grp.add(deskTop, leg);
    }
    const mon = this.monitor();
    mon.mesh.position.set(0, 1.18, withDesk ? -1.05 : -0.95);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.02, 0);
    grp.add(mon.mesh, ring);
    const p = this.person(seriesIndex);
    p.g.position.copy(seat);
    p.g.rotation.y = facing;
    p.g.userData.facing = facing;
    this.scene.add(grp, p.g);
    p.g.userData.agentId = id;
    p.g.traverse((o) => (o.userData.agentId = id));
    const label = document.createElement('div');
    label.className = 'office-agent-label';
    label.textContent = this.shortName(id);
    Object.assign(label.style, { font: '500 11px "IBM Plex Sans", system-ui', padding: '1px 6px', borderRadius: '999px', whiteSpace: 'nowrap' });
    const lo = new CSS2DObject(label);
    lo.position.set(0, 1.95, 0);
    lo.visible = room === 'corridor';
    p.g.add(lo);
    const d: Desk = { id, room, seat: seat.clone(), door: door.clone(), person: p.g, arms: p.arms, monitor: mon, ring, shirt: p.shirt, seriesIndex, phase: 'idle', label: '', working: false };
    this.desks.set(id, d);
    this.drawMonitor(d);
  }

  private shortName(id: AgentId): string {
    const map: Record<string, string> = { conductor: this.opts.labels.conductor, guard: this.opts.labels.guard, verifier: this.opts.labels.verifier };
    return map[id] ?? (id === 'finandex-ai' ? 'Finandex AI' : id.replace(/dex$/, 'Dex').replace(/^./, (c) => c.toUpperCase()).replace('Mylaiwyer', 'My LAIwyer').replace('Finlaiwyer', 'FinLAIwyer'));
  }

  private build() {
    const s = this.scene;
    const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.4);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(12, 30, 10);
    sun.castShadow = !this.opts.mobile;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 25, bottom: -25 });
    s.add(hemi, sun);
    // Corridor + lobby + verifier bay.
    const corridor = new THREE.Mesh(new THREE.BoxGeometry(48, 0.1, CORRIDOR * 2), this.materials.corridor);
    corridor.position.set(0, -0.05, 0);
    corridor.receiveShadow = !this.opts.mobile;
    s.add(corridor);
    OFFICE_ROOMS.forEach((room, i) => {
      const c = roomCenter(i);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
      this.floors.set(room.group, floorMat);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W - 0.3, 0.1, ROOM_D - 0.3), floorMat);
      floor.position.set(c.x, -0.05, c.z);
      floor.receiveShadow = !this.opts.mobile;
      s.add(floor);
      // Low walls with a door gap towards the corridor.
      const wallH = 0.7;
      const back = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W - 0.3, wallH, 0.12), this.materials.wall);
      back.position.set(c.x, wallH / 2, c.z + (c.z < 0 ? -1 : 1) * (ROOM_D / 2 - 0.2));
      const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.12, wallH, ROOM_D - 0.3), this.materials.wall);
      sideL.position.set(c.x - ROOM_W / 2 + 0.15, wallH / 2, c.z);
      const sideR = sideL.clone();
      sideR.position.x = c.x + ROOM_W / 2 - 0.15;
      const frontZ = c.z + (c.z < 0 ? 1 : -1) * (ROOM_D / 2 - 0.2);
      const f1 = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W / 2 - 1.3, wallH, 0.12), this.materials.wall);
      f1.position.set(c.x - ROOM_W / 4 - 0.6, wallH / 2, frontZ);
      const f2 = f1.clone();
      f2.position.x = c.x + ROOM_W / 4 + 0.6;
      s.add(back, sideL, sideR, f1, f2);
      const door = new THREE.Vector3(c.x, 0, c.z < 0 ? -CORRIDOR + 0.6 : CORRIDOR - 0.6);
      const series = OFFICE_ROOMS.findIndex((r) => r.group === room.group) % 8;
      room.agents.forEach((id, k) => {
        const col = k % 3;
        const row = Math.floor(k / 3);
        // North rooms face away from the corridor (−z), south rooms (+z); row 0 is nearest the corridor.
        const zSign = c.z < 0 ? -1 : 1;
        const facing = c.z < 0 ? 0 : Math.PI;
        const seat = new THREE.Vector3(c.x - 3 + col * 3, 0, row === 0 ? c.z - zSign * 1.6 : c.z + zSign * 1.4);
        this.addDesk(id, room.group, seat, door, series, facing);
      });
      // Room label (DOM button → accessible, clickable).
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'office-room-label';
      Object.assign(el.style, { pointerEvents: 'auto', font: '600 12px "IBM Plex Sans", system-ui', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', minHeight: '32px' });
      el.addEventListener('click', () => {
        this.focusRoom(room.group);
        this.opts.onRoom(room.group);
      });
      const obj = new CSS2DObject(el);
      obj.position.set(c.x, 1.6, c.z + (c.z < 0 ? -1 : 1) * (ROOM_D / 2 - 0.4));
      s.add(obj);
      this.roomLabels.set(room.group, { el, obj, count: room.agents.length });
    });
    // Conductor's round table (centre), Guard at the lobby gate (left), Verifier with stamp & box (right).
    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.08, 40), this.materials.desk);
    table.position.set(0, 0.78, 0);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 0.76, 12), this.materials.desk);
    stem.position.set(0, 0.38, 0);
    s.add(table, stem);
    this.addDesk('conductor', 'corridor', new THREE.Vector3(0, 0, 1.75), new THREE.Vector3(0, 0, 1.75), 0, 0, false);
    const gateL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.25), this.materials.wall);
    gateL.position.set(-22.5, 1.1, -CORRIDOR + 0.3);
    const gateR = gateL.clone();
    gateR.position.z = CORRIDOR - 0.3;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, CORRIDOR * 2 - 0.3), this.materials.wall);
    lintel.position.set(-22.5, 2.2, 0);
    s.add(gateL, gateR, lintel);
    this.addDesk('guard', 'corridor', new THREE.Vector3(-21.2, 0, 1.6), new THREE.Vector3(-21.2, 0, 0.8), 0, Math.PI / 2);
    this.addDesk('verifier', 'corridor', new THREE.Vector3(21.5, 0, 1.6), new THREE.Vector3(21.5, 0, 0.8), 0, -Math.PI / 2);
    this.stamp = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.35, 16), this.materials.stamp);
    this.stamp.position.set(20.6, 1.4, 0.4);
    s.add(this.stamp);
    this.removedBox = new THREE.Group();
    const boxMat = this.materials.wall;
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), boxMat);
    const walls = [
      [0, 0.25, 0.47, 1, 0.5, 0.06],
      [0, 0.25, -0.47, 1, 0.5, 0.06],
      [0.47, 0.25, 0, 0.06, 0.5, 1],
      [-0.47, 0.25, 0, 0.06, 0.5, 1],
    ].map(([x, y, z, a, b, c]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(a!, b!, c!), boxMat);
      m.position.set(x!, y!, z!);
      return m;
    });
    this.removedBox.add(bottom, ...walls);
    this.removedBox.position.set(22.6, 0, -1.2);
    const boxLabel = document.createElement('div');
    boxLabel.textContent = this.opts.labels.removed;
    Object.assign(boxLabel.style, { font: '500 11px "IBM Plex Sans", system-ui', padding: '1px 6px', borderRadius: '8px' });
    const bl = new CSS2DObject(boxLabel);
    bl.position.set(0, -0.2, 0.9);
    this.removedBox.add(bl);
    s.add(this.removedBox);
  }

  // ---------------------------------------------------------------- theme
  applyPalette(p: Palette = readPalette()) {
    this.palette = p;
    const bg = new THREE.Color(p.field);
    this.scene.background = bg;
    this.materials.floor.color = new THREE.Color(p.pane);
    this.materials.corridor.color = new THREE.Color(p.pane2);
    this.materials.wall.color = solid(p.edge, p.pane2).lerp(new THREE.Color(p.muted), 0.35);
    this.materials.desk.color = new THREE.Color(p.pane);
    this.materials.skin.color = new THREE.Color(p.quote).lerp(new THREE.Color(p.pane), 0.55);
    this.materials.card.color = new THREE.Color(p.pane);
    this.materials.envelope.color = new THREE.Color(p.pane2);
    this.materials.stamp.color = new THREE.Color(p.negative);
    OFFICE_ROOMS.forEach((r, i) => {
      const s = p.series[i % 8]!;
      this.floors.get(r.group)!.color = new THREE.Color(s).lerp(new THREE.Color(p.field), 0.82);
    });
    for (const d of this.desks.values()) {
      d.shirt.color = d.room === 'corridor' ? new THREE.Color(d.id === 'guard' ? p.negative : d.id === 'verifier' ? p.flag : p.primary) : new THREE.Color(p.series[d.seriesIndex % 8]!);
      (d.ring.material as THREE.MeshBasicMaterial).color = new THREE.Color(p[PHASE_COLOR[d.phase]] as string);
      this.drawMonitor(d);
      const el = (d.person.children.find((c) => c instanceof CSS2DObject) as CSS2DObject | undefined)?.element;
      if (el) Object.assign(el.style, { background: p.pane, color: p.ink, border: `1px solid ${p.edge}` });
    }
    for (const [g, l] of this.roomLabels) this.styleRoomLabel(g, l.el);
    this.dirty = true;
    this.kick();
  }

  private styleRoomLabel(g: DexGroupId, el: HTMLButtonElement) {
    const p = this.palette;
    const room = OFFICE_ROOMS.find((r) => r.group === g)!;
    const working = room.agents.filter((id) => this.desks.get(id)?.working).length;
    el.textContent = `${this.opts.roomName(g)} · ${working}/${room.agents.length}`;
    el.setAttribute('aria-label', this.opts.labels.roomLabel(g).replace('{working}', String(working)));
    Object.assign(el.style, { background: p.pane, color: p.ink, border: `1px solid ${working ? p.primary : p.edge}` });
  }

  private drawMonitor(d: Desk) {
    const p = this.palette;
    const ctx = d.monitor.canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = p.ink;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = p.pane;
    ctx.fillRect(6, 6, 244, 116);
    const color = p[PHASE_COLOR[d.phase]] as string;
    ctx.fillStyle = color;
    ctx.fillRect(6, 6, 244, 10);
    ctx.fillStyle = p.ink;
    ctx.font = '600 22px "IBM Plex Sans", system-ui, sans-serif';
    ctx.fillText(d.phase === 'done' ? '✓' : d.phase === 'idle' ? '—' : '●', 16, 52);
    ctx.font = '500 17px "IBM Plex Sans", system-ui, sans-serif';
    const text = d.label || (d.phase === 'idle' ? '' : d.phase);
    const lines = this.wrap(ctx, text, 210).slice(0, 3);
    lines.forEach((l, i) => ctx.fillText(l, 44, 50 + i * 24));
    d.monitor.tex.needsUpdate = true;
  }

  private wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
    const out: string[] = [];
    let line = '';
    for (const w of text.split(/\s+/)) {
      const next = line ? `${line} ${w}` : w;
      if (ctx.measureText(next).width > max && line) {
        out.push(line);
        line = w;
      } else line = next;
    }
    if (line) out.push(line);
    return out;
  }

  // ---------------------------------------------------------------- state & events
  setAgent(id: AgentId, phase: Desk['phase'], label: string) {
    const d = this.desks.get(id);
    if (!d) return;
    d.phase = phase;
    d.label = label;
    d.working = phase !== 'done' && phase !== 'idle';
    this.showLabel(d, d.working || d.id === this.selected);
    const mat = d.ring.material as THREE.MeshBasicMaterial;
    mat.color = new THREE.Color(this.palette[PHASE_COLOR[phase]] as string);
    mat.opacity = phase === 'idle' ? 0 : 0.9;
    this.drawMonitor(d);
    if (d.room !== 'corridor') {
      const l = this.roomLabels.get(d.room);
      if (l) this.styleRoomLabel(d.room, l.el);
    }
    this.dirty = true;
    this.kick();
  }

  /** Reset to a clean office before a new question. */
  reset() {
    for (const d of this.desks.values()) this.setAgent(d.id, 'idle', '');
    for (const t of this.tweens) if (t.remove) this.scene.remove(t.obj);
    this.tweens = [];
    this.removedCount = 0;
    for (const c of [...this.removedBox.children]) if (c.userData.claim) this.removedBox.remove(c);
  }

  private card(material: THREE.Material, size: [number, number, number] = [0.5, 0.04, 0.35]): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    this.scene.add(m);
    return m;
  }

  private fly(from: THREE.Vector3, to: THREE.Vector3, material: THREE.Material, done?: () => void) {
    if (this.opts.reducedMotion) return done?.();
    const m = this.card(material);
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 2.2;
    this.tweens.push({ obj: m, path: [from.clone().setY(from.y + 1.2), mid, to.clone().setY(to.y + 1.0)], speed: 14, seg: 0, t: 0, remove: true, ...(done ? { done } : {}) });
    this.kick();
  }

  /** Walk a person through doors and the corridor to another desk and back. */
  private walk(fromId: AgentId, toId: AgentId) {
    const a = this.desks.get(fromId);
    const b = this.desks.get(toId);
    if (!a || !b || this.opts.reducedMotion) return;
    const there = [a.seat, a.door, new THREE.Vector3(a.door.x, 0, 0), new THREE.Vector3(b.door.x, 0, 0), b.door, b.seat.clone().add(new THREE.Vector3(0.9, 0, 0))];
    const doc = this.card(this.materials.card, [0.3, 0.02, 0.4]);
    a.person.add(doc);
    doc.position.set(0.35, 0.95, 0);
    this.tweens.push({
      obj: a.person, path: there.map((v) => v.clone()), speed: 5, seg: 0, t: 0,
      done: () => {
        a.person.remove(doc);
        this.tweens.push({ obj: a.person, path: [...there].reverse().map((v) => v.clone()), speed: 5, seg: 0, t: 0, done: () => (a.person.rotation.set(0, a.person.userData.facing as number, 0), (this.dirty = true)) });
      },
    });
    this.kick();
  }

  handle(e: SseEvent) {
    const P = (id: AgentId) => this.desks.get(id);
    switch (e.event) {
      case 'agent_start': {
        const d = P(e.data.agentId);
        if (!d) return;
        this.setAgent(d.id, 'planning', e.data.task.slice(0, 60));
        if (d.id === 'guard') this.fly(new THREE.Vector3(-26, 0, 0), d.seat, this.materials.envelope);
        else if (d.room !== 'corridor') {
          const c = P('conductor')!;
          this.fly(c.seat, d.seat, this.materials.card);
          if (this.follow) this.focusOn(d.seat);
        }
        return;
      }
      case 'plan': {
        const g = P('guard');
        const c = P('conductor');
        if (g && c) this.fly(g.seat, c.seat, this.materials.envelope);
        return;
      }
      case 'agent_status':
        this.setAgent(e.data.agentId, e.data.phase, e.data.tool ?? e.data.skill ?? e.data.label);
        return;
      case 'agent_handoff':
        this.walk(e.data.from, e.data.to);
        if (this.follow) {
          const t = P(e.data.to);
          if (t) this.focusOn(t.seat);
        }
        return;
      case 'agent_done': {
        const d = P(e.data.agentId);
        if (!d) return;
        this.setAgent(d.id, 'done', `${e.data.tools_used.length} tool · ${Math.round(e.data.elapsed_ms)} ms`);
        if (d.room !== 'corridor') this.fly(d.seat, P('conductor')!.seat, this.materials.card);
        return;
      }
      case 'verify': {
        if (!this.opts.reducedMotion) {
          const y0 = this.stamp.position.y;
          this.tweens.push({ obj: this.stamp, path: [this.stamp.position.clone(), this.stamp.position.clone().setY(0.95), this.stamp.position.clone().setY(y0)], speed: 6, seg: 0, t: 0 });
        }
        for (let i = 0; i < Math.min(6, e.data.removed_claims); i++) {
          const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.3), this.materials.card);
          sheet.userData.claim = true;
          sheet.position.set(-0.2 + (this.removedCount % 3) * 0.2, 0.1 + 0.03 * this.removedCount, 0);
          this.removedBox.add(sheet);
          this.removedCount++;
        }
        this.dirty = true;
        this.kick();
        return;
      }
      case 'done': {
        const c = P('conductor');
        const g = P('guard');
        if (c && g) this.fly(c.seat, g.seat, this.materials.envelope, () => this.fly(g.seat, new THREE.Vector3(-26, 0, 0), this.materials.envelope));
        if (this.follow) this.focusOn(new THREE.Vector3(0, 0, 0), 30);
        return;
      }
      default:
    }
  }

  // ---------------------------------------------------------------- camera
  setFollow(on: boolean) {
    this.follow = on && !this.opts.reducedMotion;
  }

  focusRoom(g: DexGroupId) {
    const i = OFFICE_ROOMS.findIndex((r) => r.group === g);
    if (i >= 0) this.focusOn(roomCenter(i), 14);
  }

  focusAgent(id: AgentId) {
    const d = this.desks.get(id);
    if (d) this.focusOn(d.seat, 10);
  }

  private focusOn(p: THREE.Vector3, dist = 18) {
    const target = p.clone();
    const camPos = target.clone().add(new THREE.Vector3(0, dist * 0.8, dist * 0.75));
    if (this.opts.reducedMotion) {
      this.programmatic = true;
      this.controls.target.copy(target);
      this.camera.position.copy(camPos);
      this.controls.update();
      this.programmatic = false;
      this.dirty = true;
      this.kick();
      return;
    }
    this.focusTarget = target;
    this.camera.userData.goal = camPos;
    this.kick();
  }

  private selected: AgentId | null = null;
  private showLabel(d: Desk, on: boolean) {
    // CSS2DRenderer drives style.display itself; visibility is controlled through the object.
    const lo = d.person.children.find((c) => c instanceof CSS2DObject);
    if (lo && d.room !== 'corridor') lo.visible = on;
  }
  select(id: AgentId | null) {
    const prev = this.selected ? this.desks.get(this.selected) : undefined;
    this.selected = id;
    if (prev) this.showLabel(prev, prev.working);
    const d = id ? this.desks.get(id) : undefined;
    if (d) this.showLabel(d, true);
    this.dirty = true;
    this.kick();
  }

  private pick(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(v, this.camera);
    const hits = ray.intersectObjects([...this.desks.values()].map((d) => d.person), true);
    const id = hits.find((h) => h.object.userData.agentId)?.object.userData.agentId as AgentId | undefined;
    this.select(id ?? null);
    this.opts.onSelect(id ?? null);
    if (id) this.focusAgent(id);
  }

  // ---------------------------------------------------------------- loop
  private kick() {
    if (!this.raf && this.visible && this.onScreen) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = () => {
    this.raf = 0;
    if (!this.visible || !this.onScreen) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    let animating = false;
    // Tweens (cards flying, people walking, the stamp).
    for (const tw of this.tweens) {
      const a = tw.path[tw.seg]!;
      const b = tw.path[tw.seg + 1];
      if (!b) continue;
      const len = Math.max(0.001, a.distanceTo(b));
      tw.t += (dt * tw.speed) / len;
      if (tw.t >= 1) {
        tw.t = 0;
        tw.seg++;
      }
      const p0 = tw.path[tw.seg]!;
      const p1 = tw.path[tw.seg + 1];
      if (p1) {
        tw.obj.position.lerpVectors(p0, p1, tw.t);
        if (tw.obj instanceof THREE.Group) tw.obj.lookAt(p1.x, tw.obj.position.y, p1.z);
      } else tw.obj.position.copy(p0);
      animating = true;
    }
    const finished = this.tweens.filter((t) => t.seg >= t.path.length - 1);
    this.tweens = this.tweens.filter((t) => t.seg < t.path.length - 1);
    for (const t of finished) {
      if (t.remove) this.scene.remove(t.obj);
      t.done?.();
    }
    // Typing hands while an agent works (real activity only).
    const time = this.clock.elapsedTime;
    for (const d of this.desks.values()) {
      if (d.working && !this.opts.reducedMotion) {
        d.arms.forEach((arm, i) => (arm.rotation.x = Math.sin(time * 14 + i * Math.PI) * 0.18));
        animating = true;
      }
    }
    // Camera easing towards the focus target.
    if (this.focusTarget) {
      this.programmatic = true;
      this.controls.target.lerp(this.focusTarget, 0.08);
      const goal = this.camera.userData.goal as THREE.Vector3 | undefined;
      if (goal) this.camera.position.lerp(goal, 0.08);
      this.controls.update();
      this.programmatic = false;
      if (this.controls.target.distanceTo(this.focusTarget) < 0.05) this.focusTarget = null;
      animating = true;
    } else if (this.controls.enableDamping) {
      this.programmatic = true;
      this.controls.update();
      this.programmatic = false;
    }
    if (animating || this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.css.render(this.scene, this.camera);
      this.dirty = false;
    }
    if (animating) this.kick();
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.ro.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    this.controls.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
        (x as THREE.MeshBasicMaterial).map?.dispose();
        x.dispose();
      });
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.css.domElement.remove();
  }
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

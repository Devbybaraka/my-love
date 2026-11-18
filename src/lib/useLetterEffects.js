import { useEffect } from 'react';

/**
 * All of the letter's movement: the generated night sky, the scroll-linked
 * dawn, the envelope, the truth cards, the constellation, the wishes and the
 * (opt-in) music box. Ported from the original standalone page, scoped to the
 * component and cleaned up on unmount so the movie pages stay untouched.
 */
export function useLetterEffects(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    // The scoped stylesheet hangs off .letter-page, not the React wrapper.
    const page = root.querySelector('.letter-page') || root;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const q = (sel) => root.querySelector(sel);
    const qa = (sel) => Array.from(root.querySelectorAll(sel));
    const disposers = [];
    const timeouts = new Set();
    const intervals = new Set();
    let rafMain = 0;
    let rafConste = 0;
    let glow = null;

    const listen = (target, type, handler, opts) => {
      target.addEventListener(type, handler, opts);
      disposers.push(() => target.removeEventListener(type, handler, opts));
    };
    const later = (fn, ms) => {
      const id = window.setTimeout(fn, ms);
      timeouts.add(id);
      return id;
    };
    const every = (fn, ms) => {
      const id = window.setInterval(fn, ms);
      intervals.add(id);
      return id;
    };
    const rnd = (a, b) => a + Math.random() * (b - a);

    function makeGlow() {
      const s = 64;
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, 'rgba(197,162,83,1)');
      grd.addColorStop(0.22, 'rgba(197,162,83,0.55)');
      grd.addColorStop(0.55, 'rgba(181,118,138,0.16)');
      grd.addColorStop(1, 'rgba(181,118,138,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
      return c;
    }

    /* ------------------------------------------------------------------
       Sound — generated, never loaded, off until she asks for it.
    ------------------------------------------------------------------ */
    const Sound = (() => {
      let actx = null;
      let master = null;
      let padGain = null;
      let padNodes = [];
      let arpTimer = null;
      let on = false;
      const SCALE = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 739.99];

      function ensure() {
        if (!actx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          actx = new AC();
          master = actx.createGain();
          master.gain.value = 0;
          master.connect(actx.destination);
        }
        if (actx.state === 'suspended') actx.resume();
        return actx;
      }

      function pluck(freq, dur = 2.6, vol = 0.1) {
        if (!actx || !master) return;
        const t = actx.currentTime;
        const osc = actx.createOscillator();
        const g = actx.createGain();
        const osc2 = actx.createOscillator();
        const g2 = actx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 2.005;
        g2.gain.value = 0.22;

        osc2.connect(g2);
        g2.connect(g);
        osc.connect(g);
        g.connect(master);

        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.start(t);
        osc2.start(t);
        osc.stop(t + dur + 0.05);
        osc2.stop(t + dur + 0.05);
      }

      function scheduleArp() {
        clearTimeout(arpTimer);
        const step = () => {
          if (!on) return;
          pluck(SCALE[Math.floor(Math.random() * SCALE.length)], 3.4, 0.055);
          arpTimer = window.setTimeout(step, 2400 + Math.random() * 3200);
          timeouts.add(arpTimer);
        };
        arpTimer = window.setTimeout(step, 900);
        timeouts.add(arpTimer);
      }

      function startPad() {
        padGain = actx.createGain();
        padGain.gain.value = 0;
        const filter = actx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 780;
        filter.Q.value = 0.6;
        padGain.connect(filter);
        filter.connect(master);

        [146.83, 220.0, 293.66, 369.99].forEach((f, i) => {
          const o = actx.createOscillator();
          const g = actx.createGain();
          o.type = i % 2 ? 'triangle' : 'sine';
          o.frequency.value = f;
          o.detune.value = (i - 1.5) * 4;
          g.gain.value = 0.05 / (1 + i * 0.35);
          o.connect(g);
          g.connect(padGain);
          o.start();
          padNodes.push(o);
        });

        padGain.gain.setValueAtTime(0, actx.currentTime);
        padGain.gain.linearRampToValueAtTime(1, actx.currentTime + 5);
        scheduleArp();
      }

      function start() {
        if (!ensure()) return false;
        if (on) return true;
        on = true;
        master.gain.cancelScheduledValues(actx.currentTime);
        master.gain.setValueAtTime(master.gain.value, actx.currentTime);
        master.gain.linearRampToValueAtTime(0.34, actx.currentTime + 2.4);
        startPad();
        pluck(440, 3, 0.07);
        return true;
      }

      function stop() {
        if (!actx) return;
        on = false;
        clearTimeout(arpTimer);
        if (master) {
          master.gain.cancelScheduledValues(actx.currentTime);
          master.gain.setValueAtTime(master.gain.value, actx.currentTime);
          master.gain.linearRampToValueAtTime(0, actx.currentTime + 1.2);
        }
        const nodes = padNodes.slice();
        padNodes = [];
        setTimeout(() => {
          nodes.forEach((n) => {
            try {
              n.stop();
            } catch {
              /* already stopped */
            }
          });
        }, 1400);
      }

      return {
        toggle: () => {
          if (on) {
            stop();
            return false;
          }
          start();
          return true;
        },
        chime: (f) => {
          if (on && actx) pluck(f || 587.33, 2.4, 0.07);
        },
        dispose: () => {
          on = false;
          clearTimeout(arpTimer);
          padNodes.forEach((n) => {
            try {
              n.stop();
            } catch {
              /* ignore */
            }
          });
          padNodes = [];
          if (actx && actx.state !== 'closed') actx.close().catch(() => {});
        },
      };
    })();

    const soundBtn = q('#soundToggle');
    if (soundBtn) {
      listen(soundBtn, 'click', () => {
        const playing = Sound.toggle();
        soundBtn.setAttribute('aria-pressed', String(playing));
        soundBtn.setAttribute(
          'aria-label',
          playing ? 'Turn ambient sound off' : 'Turn ambient sound on'
        );
      });
    }

    /* ------------------------------------------------------------------
       The sky
    ------------------------------------------------------------------ */
    const canvas = q('#sky');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    let W = 0;
    let H = 0;
    let stars = [];
    let petals = [];
    let shooters = [];
    let dust = [];
    let skyAlpha = 1;
    let lastT = 0;
    let visible = true;

    glow = makeGlow();

    function buildSky() {
      if (!ctx) return;
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const count = Math.round(Math.min(240, Math.max(70, (W * H) / 7800)));
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: rnd(0, W),
          y: rnd(0, H),
          r: rnd(0.5, 1.7),
          a: rnd(0.25, 0.95),
          depth: rnd(0.15, 1),
          ph: rnd(0, Math.PI * 2),
          sp: rnd(0.4, 1.5),
          warm: Math.random() > 0.78,
        });
      }

      petals = [];
      const petalCount = W < 620 ? 8 : 16;
      for (let j = 0; j < petalCount; j++) {
        petals.push({
          x: rnd(0, W),
          y: rnd(-H, H),
          r: rnd(4, 11),
          vy: rnd(0.12, 0.42),
          vx: rnd(-0.16, 0.16),
          rot: rnd(0, Math.PI * 2),
          vr: rnd(-0.006, 0.006),
          ph: rnd(0, Math.PI * 2),
          op: rnd(0.12, 0.32),
          gold: Math.random() > 0.7,
        });
      }
      draw(performance.now(), true);
    }

    function drawPetals(dt, t) {
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.y -= p.vy * dt * 0.06;
        p.x += (p.vx + Math.sin(t * 0.0005 + p.ph) * 0.12) * dt * 0.06;
        p.rot += p.vr * dt * 0.06;
        if (p.y < -40) {
          p.y = H + 30;
          p.x = rnd(0, W);
        }
        if (p.x < -40) p.x = W + 30;
        if (p.x > W + 40) p.x = -30;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalCompositeOperation = 'lighter';
        const pg = ctx.createLinearGradient(0, -p.r, 0, p.r);
        if (p.gold) {
          pg.addColorStop(0, `rgba(255,240,205,${(p.op * 1.5).toFixed(3)})`);
          pg.addColorStop(0.55, `rgba(238,206,150,${(p.op * 0.75).toFixed(3)})`);
          pg.addColorStop(1, 'rgba(230,192,123,0)');
        } else {
          pg.addColorStop(0, `rgba(255,214,221,${(p.op * 1.6).toFixed(3)})`);
          pg.addColorStop(0.55, `rgba(240,178,190,${(p.op * 0.8).toFixed(3)})`);
          pg.addColorStop(1, 'rgba(233,174,181,0)');
        }
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.bezierCurveTo(p.r * 0.82, -p.r * 0.35, p.r * 0.72, p.r * 0.55, 0, p.r);
        ctx.bezierCurveTo(-p.r * 0.72, p.r * 0.55, -p.r * 0.82, -p.r * 0.35, 0, -p.r);
        ctx.fill();
        ctx.restore();
      }
    }

    function spawnShooter() {
      shooters.push({
        x: rnd(-0.05 * W, W * 0.85),
        y: rnd(-H * 0.1, H * 0.45),
        vx: rnd(5, 9),
        vy: rnd(2, 4),
        life: 0,
        max: rnd(46, 76),
        len: rnd(90, 200),
      });
    }

    function drawShooters(dt) {
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.x += s.vx * dt * 0.06;
        s.y += s.vy * dt * 0.06;
        s.life++;
        const k = 1 - s.life / s.max;
        if (k <= 0) {
          shooters.splice(i, 1);
          continue;
        }
        const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.len, s.y - s.len * 0.45);
        grad.addColorStop(0, `rgba(255,250,235,${0.9 * k * skyAlpha})`);
        grad.addColorStop(0.35, `rgba(248,230,187,${0.35 * k * skyAlpha})`);
        grad.addColorStop(1, 'rgba(233,174,181,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.len, s.y - s.len * 0.45);
        ctx.stroke();
      }
    }

    function drawDust() {
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        d.life -= 0.016;
        if (d.life <= 0) {
          dust.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, d.life) * 0.55 * skyAlpha;
        ctx.drawImage(glow, d.x - d.r * 3, d.y - d.r * 3, d.r * 6, d.r * 6);
      }
      ctx.globalAlpha = 1;
    }

    function draw(t, forceStatic) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const scrollY = window.scrollY || 0;
      const twinkleT = t * 0.001;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const tw = 0.62 + 0.38 * Math.sin(twinkleT * s.sp + s.ph);
        const alpha = s.a * tw * skyAlpha;
        if (alpha <= 0.01) continue;
        let y = s.y - scrollY * 0.045 * s.depth;
        y = ((y % H) + H) % H;
        ctx.globalAlpha = alpha;
        const size = s.r * (s.warm ? 3.6 : 3.0);
        ctx.drawImage(glow, s.x - size, y - size, size * 2, size * 2);
        if (s.r > 1.25 && alpha > 0.55) {
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillStyle = s.warm ? '#f8e6bb' : '#ffffff';
          ctx.fillRect(s.x - 4 * s.r, y - 0.5, 8 * s.r, 1);
          ctx.fillRect(s.x - 0.5, y - 4 * s.r, 1, 8 * s.r);
        }
      }
      ctx.globalAlpha = 1;

      if (forceStatic) {
        drawPetals(16, t);
        return;
      }
      drawPetals(16.67, t);
      drawShooters(16.67);
      drawDust();
    }

    function loop(t) {
      rafMain = requestAnimationFrame(loop);
      if (!visible) return;
      if (t - lastT < 32) return;
      lastT = t;
      draw(t, false);
    }

    if (ctx) {
      buildSky();
      if (!reduceMotion) {
        rafMain = requestAnimationFrame(loop);
        every(() => {
          if (visible && Math.random() > 0.35 && shooters.length < 2) spawnShooter();
        }, 7200);
      }
      listen(window, 'resize', () => {
        clearTimeout(window.__skyResize);
        window.__skyResize = later(buildSky, 180);
      });
      listen(document, 'visibilitychange', () => {
        visible = !document.hidden;
      });
      if (!reduceMotion) {
        listen(
          window,
          'pointermove',
          (e) => {
            if (e.pointerType === 'touch') return;
            if (Math.random() > 0.55) return;
            dust.push({
              x: e.clientX + rnd(-8, 8),
              y: e.clientY + rnd(-8, 8),
              r: rnd(1.2, 3.4),
              life: 1,
            });
            if (dust.length > 40) dust.shift();
          },
          { passive: true }
        );
      }
    }

    /* ------------------------------------------------------------------
       Scroll: dawn rising, the thread, hero drift, sound button fading
    ------------------------------------------------------------------ */
    const dawnLayer = q('#dawnLayer');
    const threadFill = q('#threadFill');
    const heroInner = q('#heroInner');
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

        let dawn = Math.min(1, Math.max(0, (p - 0.58) / 0.42));
        dawn = dawn * dawn * (3 - 2 * dawn);
        document.documentElement.style.setProperty('--dawn', dawn.toFixed(3));
        skyAlpha = 1 - dawn * 0.86;

        if (threadFill) threadFill.style.height = `${(p * 100).toFixed(2)}%`;

        if (heroInner && window.scrollY < window.innerHeight) {
          const k = Math.min(1, window.scrollY / (window.innerHeight * 0.8));
          heroInner.style.transform = `translate3d(0,${(k * 60).toFixed(1)}px,0)`;
          heroInner.style.opacity = Math.max(0, 1 - k * 1.25).toFixed(3);
        } else if (heroInner) {
          heroInner.style.opacity = '0';
        }

        if (soundBtn) {
          soundBtn.classList.toggle(
            'is-dim',
            window.scrollY > window.innerHeight * 0.55
          );
        }
      });
    }

    listen(window, 'scroll', onScroll, { passive: true });
    onScroll();

    /* ------------------------------------------------------------------
       Reveal on scroll
    ------------------------------------------------------------------ */
    const reveals = qa('.reveal');
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add('in');
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
      );
      reveals.forEach((el) => io.observe(el));
      disposers.push(() => io.disconnect());
    } else {
      reveals.forEach((el) => el.classList.add('in'));
    }

    /* ------------------------------------------------------------------
       The envelope
    ------------------------------------------------------------------ */
    const envelope = q('#envelope');
    const letterEl = q('#letter');
    let opened = false;

    function sparkleBurst() {
      if (reduceMotion) return;
      const r = envelope.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.5;
      for (let i = 0; i < 14; i++) {
        const el = document.createElement('span');
        el.textContent = ['✦', '♡', '·', '❀'][i % 4];
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText =
          `position:fixed;left:${cx}px;top:${cy}px;z-index:9;pointer-events:none;` +
          `color:${i % 3 ? '#f8e6bb' : '#e9aeb5'};font-size:${8 + Math.random() * 12}px;` +
          'text-shadow:0 0 12px rgba(248,230,187,.9);transition:transform 1.5s cubic-bezier(.16,.8,.3,1),opacity 1.5s ease;';
        root.appendChild(el);
        const ang = Math.random() * Math.PI * 2;
        const dist = 70 + Math.random() * 160;
        requestAnimationFrame(() => {
          el.style.transform = `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(.4)`;
          el.style.opacity = '0';
        });
        later(() => el.remove(), 1700);
      }
    }

    function openLetter() {
      if (opened) return;
      opened = true;
      envelope.classList.add('is-open');
      envelope.setAttribute('aria-expanded', 'true');
      page.classList.add('is-open');

      letterEl.classList.add('is-open');
      letterEl.style.maxHeight = `${letterEl.scrollHeight}px`;

      Sound.chime(659.25);
      later(() => {
        if (opened) letterEl.style.maxHeight = 'none';
      }, 1250);
      later(sparkleBurst, 260);
    }

    if (envelope) {
      listen(envelope, 'click', openLetter);
      listen(envelope, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLetter();
        }
      });
    }

    const cta = q('a.cta[href="#the-letter"]');
    if (cta) listen(cta, 'click', () => later(openLetter, 700));

    /* ------------------------------------------------------------------
       Truth cards
    ------------------------------------------------------------------ */
    qa('.flip').forEach((card) => {
      listen(card, 'click', () => {
        card.classList.toggle('flipped');
        if (card.classList.contains('flipped')) Sound.chime(523.25);
      });
    });

    /* ------------------------------------------------------------------
       The heart constellation
    ------------------------------------------------------------------ */
    const cCanvas = q('#constellation');
    const cCtx = cCanvas && cCanvas.getContext ? cCanvas.getContext('2d') : null;

    if (cCtx) {
      let cW = 0;
      let cH = 0;
      let progress = 0;
      let started = false;
      let cVisible = false;
      let cStart = 0;
      const heartPts = [];

      for (let i = 0; i <= 96; i++) {
        const t = (i / 96) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        heartPts.push({ x, y });
      }

      function sizeConstellation() {
        const DPR = Math.min(window.devicePixelRatio || 1, 2);
        const rect = cCanvas.getBoundingClientRect();
        cW = rect.width;
        cH = rect.height;
        cCanvas.width = Math.max(1, Math.floor(cW * DPR));
        cCanvas.height = Math.max(1, Math.floor(cH * DPR));
        cCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
        if (started && progress >= 1) drawConstellation(performance.now());
      }

      function drawConstellation(t) {
        cCtx.clearRect(0, 0, cW, cH);
        const scale = Math.min(cW / 40, cH / 38) * 0.92;
        const cx = cW / 2;
        const cy = cH / 2 + 6;
        const shown = heartPts.length * progress;
        const full = shown >= heartPts.length;

        cCtx.beginPath();
        for (let i = 0; i < heartPts.length; i++) {
          const px = cx + heartPts[i].x * scale;
          const py = cy + heartPts[i].y * scale;
          if (i === 0) cCtx.moveTo(px, py);
          else cCtx.lineTo(px, py);
        }
        cCtx.closePath();
        cCtx.strokeStyle = 'rgba(26,26,26,0.09)';
        cCtx.lineWidth = 1;
        cCtx.stroke();

        if (progress > 0) {
          cCtx.beginPath();
          for (let j = 0; j < Math.min(shown, heartPts.length); j++) {
            const qx = cx + heartPts[j].x * scale;
            const qy = cy + heartPts[j].y * scale;
            if (j === 0) cCtx.moveTo(qx, qy);
            else cCtx.lineTo(qx, qy);
          }
          const grad = cCtx.createLinearGradient(
            cx - scale * 16,
            cy - scale * 15,
            cx + scale * 16,
            cy + scale * 13
          );
          grad.addColorStop(0, 'rgba(197,162,83,0.95)');
          grad.addColorStop(0.5, 'rgba(181,118,138,0.85)');
          grad.addColorStop(1, 'rgba(197,162,83,0.9)');
          cCtx.strokeStyle = grad;
          cCtx.lineWidth = 1.35;
          cCtx.shadowColor = 'rgba(197,162,83,0.45)';
          cCtx.shadowBlur = 12;
          cCtx.stroke();
          cCtx.shadowBlur = 0;
        }

        for (let k = 0; k < heartPts.length; k += 4) {
          if (k > shown) continue;
          const sx = cx + heartPts[k].x * scale;
          const sy = cy + heartPts[k].y * scale;
          const tw = 0.6 + 0.4 * Math.sin(t * 0.0016 + k);
          const r = 1.1 + tw * 1.5;
          cCtx.globalAlpha = 0.35 + tw * 0.55;
          cCtx.drawImage(glow, sx - r * 3, sy - r * 3, r * 6, r * 6);
          cCtx.globalAlpha = 1;
        }

        const tip = heartPts[Math.round(heartPts.length * 0.5)];
        if (tip) {
          const tx = cx + tip.x * scale;
          const ty = cy + tip.y * scale;
          const pulse = full ? 0.75 + 0.25 * Math.sin(t * 0.0022) : 0.35;
          const tr = 6 * pulse;
          cCtx.globalAlpha = pulse;
          cCtx.drawImage(glow, tx - tr * 3, ty - tr * 3, tr * 6, tr * 6);
          cCtx.globalAlpha = 1;
        }
      }

      function animateConstellation(t) {
        rafConste = 0;
        if (!started) return;
        if (!cStart) cStart = t;
        const e = Math.min(1, (t - cStart) / 2800);
        progress = 1 - Math.pow(1 - e, 3);
        drawConstellation(t);
        if (cVisible) rafConste = requestAnimationFrame(animateConstellation);
      }

      function startConstellationLoop() {
        cancelAnimationFrame(rafConste);
        rafConste = requestAnimationFrame(animateConstellation);
      }

      sizeConstellation();
      listen(window, 'resize', () => later(sizeConstellation, 160));

      if ('IntersectionObserver' in window) {
        const cio = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (en.isIntersecting && !started) {
                started = true;
                cVisible = true;
                cStart = 0;
                if (reduceMotion) {
                  progress = 1;
                  drawConstellation(performance.now());
                } else {
                  startConstellationLoop();
                }
                cio.disconnect();
              }
            });
          },
          { threshold: 0.35 }
        );
        cio.observe(cCanvas);
        disposers.push(() => cio.disconnect());

        const cpause = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              cVisible = en.isIntersecting;
              if (started && cVisible && !reduceMotion) startConstellationLoop();
            });
          },
          { threshold: 0 }
        );
        cpause.observe(cCanvas);
        disposers.push(() => cpause.disconnect());
      } else {
        started = true;
        cVisible = true;
        progress = 1;
        drawConstellation(performance.now());
      }
    }

    /* ------------------------------------------------------------------
       Wishes
    ------------------------------------------------------------------ */
    const stage = q('#wishStage');
    const wishCount = q('#wishCount');
    const wishReveal = q('#wishReveal');
    let wishes = 0;

    function makeWish(x, y) {
      if (!stage) return;

      const rip = document.createElement('span');
      rip.className = 'wish-ripple';
      rip.setAttribute('aria-hidden', 'true');
      rip.style.left = `${x}px`;
      rip.style.top = `${y}px`;
      stage.appendChild(rip);
      later(() => rip.remove(), 1000);

      const howMany = 1 + (Math.random() > 0.55 ? 1 : 0);
      for (let n = 0; n < howMany; n++) {
        const el = document.createElement('span');
        el.className = 'wish-star';
        el.setAttribute('aria-hidden', 'true');
        el.textContent = Math.random() > 0.4 ? '✦' : '✧';
        el.style.left = `${x + (n ? Math.random() * 26 - 13 : 0)}px`;
        el.style.top = `${y + (n ? Math.random() * 26 - 13 : 0)}px`;
        el.style.setProperty('--dx', `${(Math.random() * 90 - 45).toFixed(0)}px`);
        el.style.fontSize = `${(16 + Math.random() * 16).toFixed(0)}px`;
        stage.appendChild(el);
        later(() => el.remove(), 4400);
      }

      wishes += 1;
      Sound.chime(440 * Math.pow(1.12246, wishes % 7));

      if (wishes === 1) stage.classList.add('touched');
      if (wishCount) {
        wishCount.textContent =
          wishes === 1 ? 'one wish, kept safe' : `${wishes} wishes, kept safe`;
      }
      if (wishes >= 3 && wishReveal) wishReveal.classList.add('show');
    }

    if (stage) {
      listen(stage, 'pointerdown', (e) => {
        const r = stage.getBoundingClientRect();
        makeWish(e.clientX - r.left, e.clientY - r.top);
      });
      listen(stage, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const r = stage.getBoundingClientRect();
          makeWish(
            r.width * (0.2 + Math.random() * 0.6),
            r.height * (0.3 + Math.random() * 0.5)
          );
        }
      });
    }

    /* ------------------------------------------------------------------
       Read it again
    ------------------------------------------------------------------ */
    const again = q('#again');
    if (again) {
      listen(again, 'click', () => {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }

    return () => {
      cancelAnimationFrame(rafMain);
      cancelAnimationFrame(rafConste);
      intervals.forEach((id) => clearInterval(id));
      timeouts.forEach((id) => clearTimeout(id));
      disposers.forEach((fn) => fn());
      Sound.dispose();
      document.documentElement.style.setProperty('--dawn', '0');
    };
  }, [rootRef]);
}

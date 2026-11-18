/* Converted from the original hand-written letter. Markup only —
   behaviour lives in useLetterEffects(). */
import { Link } from 'react-router-dom';

function renderParagraph(text) {
  return text.split(/(\*[^*]+\*)/g).map((part, index) =>
    part.length > 2 && part.startsWith('*') && part.endsWith('*') ? (
      <span key={index} className="accent">
        {part.slice(1, -1)}
      </span>
    ) : (
      part
    )
  );
}

/* A little peony in the corner: blush petals, gold leaves. Purely decorative. */
function PeonyCorner({ className }) {
  return (
    <svg className={className} viewBox="0 0 170 170" fill="none" aria-hidden="true" focusable="false">
      <g stroke="#C5A253" strokeWidth="1.3" strokeLinecap="round" opacity="0.85">
        <path d="M10 16C44 24 66 44 78 76" />
        <path d="M16 34C40 40 56 54 64 74" />
        <path d="M34 12C48 24 56 40 58 58" />
      </g>
      <g fill="#C5A253" opacity="0.30">
        <path d="M30 22c9-6 20-6 27 2-8 8-20 9-27-2Z" />
        <path d="M46 40c10-2 19 4 22 14-11 2-20-3-22-14Z" />
        <path d="M22 46c9-4 18 1 21 11-10 3-19-1-21-11Z" />
      </g>
      <g fill="#F8E1E7" stroke="#EBD0D9" strokeWidth="1">
        <circle cx="74" cy="86" r="27" />
        <circle cx="104" cy="70" r="18" />
        <circle cx="56" cy="106" r="16" />
      </g>
      <g fill="#FDF1F4">
        <circle cx="74" cy="86" r="16" />
        <circle cx="104" cy="70" r="7" />
        <circle cx="56" cy="106" r="6" />
      </g>
      <g fill="#C5A253" opacity="0.75">
        <circle cx="74" cy="86" r="3.4" />
        <circle cx="104" cy="70" r="2.2" />
        <circle cx="56" cy="106" r="2" />
      </g>
    </svg>
  );
}

export default function LetterMarkup({ letter }) {
  const paragraphs = letter.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="letter-page">
      <div className="sky" aria-hidden="true">
        <div className="sky-layer night"></div>
        <div className="sky-layer dawn" id="dawnLayer"></div>
        <canvas id="sky"></canvas>
        <div className="vignette"></div>
        <div className="grain"></div>
      </div>

      <div className="thread" aria-hidden="true"><i id="threadFill"></i></div>

      <main>

        
        <section className="hero">
          <div className="wrap hero-inner" id="heroInner">
            <div className="hero-split">
              <div className="hero-copy">
                <p className="kicker">for you &mdash; especially on the heavy days</p>
                <h1>For <span className="her-name">my love</span>,<em>on a heavy day</em></h1>
                <p className="sub">I made you a little universe. Every star, every word, every quiet bit of it is yours. Scroll slowly &mdash; it&rsquo;s all for you.</p>
                <div className="hero-links">
                  <a className="cta" href="#the-letter"><span className="pulse" aria-hidden="true"></span>open what I made you</a>
                  <Link className="cta cta-alt" to="/movies">our movie corner →</Link>
                </div>
              </div>

              <div className="hero-portrait">
                <div className="frame">
                  <PeonyCorner className="orn orn-tl" />
                  <PeonyCorner className="orn orn-br" />
                  <img
                    src="/IMG-20260716-WA0018.jpg"
                    alt="Her, standing in a park in the afternoon sun"
                    loading="eager"
                  />
                </div>
              </div>
            </div>

            <div className="scroll-hint" aria-hidden="true"><span className="line"></span>scroll</div>
          </div>
        </section>

        
        <section className="letter-sec" id="the-letter">
          <div className="wrap center">
            <p className="kicker reveal">one &mdash; a letter</p>

            <div className="envelope-wrap reveal d1">
              <button className="envelope" id="envelope" aria-expanded="false" aria-controls="letter">
                <span className="env-body"></span>
                <span className="env-front"></span>
                <span className="env-flap"></span>
                <span className="env-seal" aria-hidden="true">♥</span>
                <span className="env-hint">tap the seal</span>
              </button>
            </div>

            <article className="letter" id="letter" aria-labelledby="letter-heading">
              <div className="paper">
                <h2 id="letter-heading" className="salutation">{letter.salutation}</h2>

            {paragraphs.map((paragraph, index) => (
              <p key={index}>{renderParagraph(paragraph)}</p>
            ))}

            <p className="sign">With all my heart,<span className="script">{letter.signature}</span></p>

                {letter.ps ? <p className="ps">{letter.ps}</p> : null}
              </div>
            </article>
          </div>
        </section>

        
        <section className="photo-sec">
          <div className="wrap">
            <div className="photo-grid">
              <div className="reveal">
                <div className="polaroid">
                  <span className="tape tl" aria-hidden="true"></span>
                  <span className="tape br" aria-hidden="true"></span>
                  <img src="/IMG-20260716-WA0018.jpg" alt="Her, standing in a park in the afternoon sun" loading="lazy" />
                  <span className="cap">you &mdash; always</span>
                </div>
              </div>
              <div className="photo-copy reveal d1">
                <p className="kicker">you</p>
                <p className="quote">&ldquo;Some days arrive ordinary and leave unforgettable. Those days tunaenda resturant nakuangalia unauliza mbona &mdash; im admirimg your beauty: <em>this is the view.</em>&rdquo;</p>
                <p className="lede">I don&rsquo;t need a special occasion to look at you like that. I do it on Tuesdays.</p>
              </div>
            </div>
          </div>
        </section>

        
        <section>
          <div className="wrap center">
            <p className="kicker reveal">two &mdash; little truths</p>
            <h2 className="reveal d1">Things I&rsquo;ll never<br />get tired of telling you.</h2>
            <p className="lede reveal d2">Some of them I&rsquo;ve said a hundred times. Tap a card and I&rsquo;ll say them again.</p>

            <div className="truths-grid">
              <button className="flip reveal" aria-label="Little truth one">
                <span className="flip-inner">
                  <span className="face front"><span className="glyph">♡</span><span className="label">truth one</span></span>
                  <span className="face back"><span>Unaona tukitembea na wewe then upande stairs&mdash; i just wish i could follow you , so we could spend more time together </span></span>
                </span>
              </button>

              <button className="flip reveal d1" aria-label="Little truth two">
                <span className="flip-inner">
                  <span className="face front"><span className="glyph">✦</span><span className="label">truth two</span></span>
                  <span className="face back"><span>&ldquo;Mbona unaniangalia?&rdquo; &mdash; I&rsquo;m not staring. I&rsquo;m admiring. There&rsquo;s a difference, and I&rsquo;ll never stop doing it.</span></span>
                </span>
              </button>

              <button className="flip reveal d2" aria-label="Little truth three">
                <span className="flip-inner">
                  <span className="face front"><span className="glyph">❀</span><span className="label">truth three</span></span>
                  <span className="face back"><span>You don&rsquo;t have to have it together around me. Fall apart if you need to. I&rsquo;ll be right here, holding you and carring you.</span></span>
                </span>
              </button>

              <button className="flip reveal d3" aria-label="Little truth four">
                <span className="flip-inner">
                  <span className="face front"><span className="glyph">☾</span><span className="label">truth four</span></span>
                  <span className="face back"><span>Even on the days you feel like nothing, you are somebody&rsquo;s whole sky. Specifically mine.</span></span>
                </span>
              </button>
            </div>

            <p className="truths-note reveal d3">and a hundred more I&rsquo;ll tell you in person</p>
          </div>
        </section>

        
        <section className="conste-sec">
          <div className="wrap center">
            <p className="kicker reveal">three &mdash; the sky</p>
            <h2 className="reveal d1">Some things don&rsquo;t need words.</h2>
            <canvas id="constellation" aria-label="A constellation in the shape of a heart, drawn star by star" role="img"></canvas>
            <p className="conste-copy reveal d1">Every star up there is a night I lay awake thinking about you.<br />I ran out of sky.</p>
          </div>
        </section>

        
        <section className="wish-sec">
          <div className="wrap center">
            <p className="kicker reveal">four &mdash; make a wish</p>
            <h2 className="reveal d1">Touch the dark.<br />I&rsquo;ll hold them for you.</h2>
            <p className="lede reveal d2">Make as many as you need. Nobody&rsquo;s counting.</p>

            <div className="wish-stage" id="wishStage" role="button" tabindex="0" aria-label="Touch the sky to make wishes">
              <span className="twinkle" style={{'left': '14%', 'top': '24%', 'animation-delay': '0s'}} aria-hidden="true"></span>
              <span className="twinkle" style={{'left': '31%', 'top': '68%', 'animation-delay': '1.1s'}} aria-hidden="true"></span>
              <span className="twinkle" style={{'left': '48%', 'top': '18%', 'animation-delay': '2.4s'}} aria-hidden="true"></span>
              <span className="twinkle" style={{'left': '62%', 'top': '52%', 'animation-delay': '.6s'}} aria-hidden="true"></span>
              <span className="twinkle" style={{'left': '79%', 'top': '31%', 'animation-delay': '3.2s'}} aria-hidden="true"></span>
              <span className="twinkle" style={{'left': '88%', 'top': '72%', 'animation-delay': '1.8s'}} aria-hidden="true"></span>
              <span className="twinkle" style={{'left': '8%', 'top': '84%', 'animation-delay': '2.9s'}} aria-hidden="true"></span>
              <span className="twinkle" style={{'left': '70%', 'top': '86%', 'animation-delay': '4.1s'}} aria-hidden="true"></span>
            </div>
            <p className="wish-count" id="wishCount" aria-live="polite"></p>
            <p className="wish-reveal" id="wishReveal">Careful &mdash; I already spent all of mine on you.</p>
          </div>
        </section>

        
        <section className="finale">
          <div className="wrap">
            <p className="kicker reveal">and when morning comes</p>
            <h2 className="reveal d1">Whatever this chapter is &mdash;<br />we read it together.</h2>
            <p className="lede reveal d2">And when the sun comes up, I&rsquo;ll still be here. Same hands. Same heart. Same Newton.</p>
            <p className="signature reveal d3"><small>sealed with everything I have</small>always yours, Newton</p>
            <div className="finale-actions">
                <button className="again reveal d3" id="again">read it again ↑</button>
                <Link className="again cta-alt reveal d3" to="/movies">our movie corner →</Link>
              </div>
          </div>
        </section>

      </main>

      <footer>
        written at an hour I should have been asleep &mdash; for you
      </footer>

      <button className="sound" id="soundToggle" aria-pressed="false" aria-label="Toggle ambient sound">
        <span className="note" aria-hidden="true">♪</span>
        <span className="bars" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
    </div>
  );
}
